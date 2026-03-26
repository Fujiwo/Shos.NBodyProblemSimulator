# Performance Investigation Report 2026-03-27

## Scope

- 対象: simulation loop、physics engine、worker backend、UI render、Three.js trail render
- 目的: 改善実装には入らず、支配的コスト候補と優先順位を確定する
- 測定条件:
  - `npm test`
  - `npm run test:ui`
  - `npm run benchmark:phase4`
  - benchmark 条件は Chromium、`preset=random-cluster`、`bodyCount=10`、`integrator=velocity-verlet`、`showTrails=true`、1280x900

## Baseline

### Test Status

- `npm test`: success
- `npm run test:ui`: success, 12 passed

### Benchmark Summary

参照:

- [Works/benchmarks/phase4/latest.ci.json](../benchmarks/phase4/latest.ci.json)
- [Works/benchmarks/phase4/latest.raw.json](../benchmarks/phase4/latest.raw.json)

結果要約:

- main
  - FPS: 13.55
  - simulationTime: 9.06
  - pipelineTime: 0.10 ms
- worker
  - FPS: 14.00
  - simulationTime: 15.42
  - pipelineTime: 14.00 ms

観察:

- worker は simulation progress では有利だが、pipeline time は main の 140 倍で、通信と clone の固定コストが大きい
- main の pipeline time 自体は 0.10 ms で、少なくとも benchmark 条件では physics 計算そのものは主ボトルネックではない
- FPS が 14 前後で頭打ちになっているため、描画と UI のフレームコストを優先して調べるのが妥当

## Findings

### 1. High: state clone と full render subscription が毎更新で全体コストを増幅している

根拠:

- [Sources/app/app-store.js#L10](../../Sources/app/app-store.js#L10) は `getState()` のたびに `clone(this.#state)` を返す
- [Sources/app/app-store.js#L21](../../Sources/app/app-store.js#L21) は `update()` のたびに state 全体を clone し、その後 listener ごとに再度 `getState()` を呼ぶ
- [Sources/app/defaults.js#L41](../../Sources/app/defaults.js#L41) の `clone()` は `structuredClone`、なければ JSON round-trip を使う
- [Sources/app/bootstrap.js#L216](../../Sources/app/bootstrap.js#L216) では store subscription 1 本で `uiShell.render(model)` と `renderer.render(model)` を毎回両方呼んでいる

評価:

- 1 回の state 更新で、少なくとも state 全体の deep clone と full subscriber notification が発生する
- simulation 中は execution result 適用、FPS 更新、status 更新が継続するため、clone と full render が高頻度で重なる
- 現行の bodyCount 上限は 10 でも、body 配列、trail 関連 state、runtime fieldDrafts を含むモデル全体 clone は無視しにくい

優先理由:

- これは UI と renderer の両方に効く共通ボトルネックで、以後の最適化の土台になる
- ここを残したまま局所最適化しても、clone と full rerender が改善効果を相殺しやすい

改善候補:

- subscription の責務を UI と renderer で分離する
- immutable snapshot 全 clone ではなく、変更領域を限定した更新経路を導入する
- simulation 中に UI 更新が不要な領域は描画頻度を落とす

### 2. High: UiShell が毎更新で body card 一覧と select option を全再構築している

根拠:

- [Sources/app/ui-shell.js#L325](../../Sources/app/ui-shell.js#L325) で `cameraTarget.innerHTML` を毎 render 更新している
- [Sources/app/ui-shell.js#L342](../../Sources/app/ui-shell.js#L342) で validation list を `innerHTML` で再構築している
- [Sources/app/ui-shell.js#L354](../../Sources/app/ui-shell.js#L354) で body card list 全体を `innerHTML` で再構築している
- [Sources/app/bootstrap.js#L216](../../Sources/app/bootstrap.js#L216) により、この render は state 更新ごとに発火する

評価:

- simulation 中は body position と metrics しか変わらなくても、Body card DOM 全体が毎回作り直される
- 10 体、各 body に name、mass、position、velocity、color、toggle を含むため DOM ノード数が多い
- `innerHTML` 全差し替えは layout、style recalculation、GC のいずれにも不利

優先理由:

- benchmark の FPS 頭打ちに最も直結しやすい main-thread 負荷である
- 入力 UI は idle 時だけ編集可能なので、running 中は body card の詳細 DOM を毎回更新する必要が薄い

改善候補:

- running 中は metrics と status のみ更新し、body card 再構築を止める
- body card と camera target option を diff 更新へ分離する
- selected body、expanded panels、validation の変更時だけ対象 DOM を更新する

### 3. High: Three.js trail 更新が毎フレームで履歴配列と geometry を作り直している

根拠:

- [Sources/app/renderer-helpers.js#L48](../../Sources/app/renderer-helpers.js#L48) は trail ごとに `previousHistory` を配列コピーしている
- [Sources/app/renderer-helpers.js#L57](../../Sources/app/renderer-helpers.js#L57) は `shift()` で先頭削除を繰り返すため、maxTrailPoints 到達後は配列詰め直しが継続する
- [Sources/app/three-scene-runtime.js#L87](../../Sources/app/three-scene-runtime.js#L87) は履歴全件を `history.map(...)` で point 配列へ変換する
- [Sources/app/three-scene-host.js#L262](../../Sources/app/three-scene-host.js#L262) は `geometry.setFromPoints(...)` を毎 render 実行する

評価:

- bodyCount 10、`maxTrailPoints=300` では、最大 3000 point 相当をフレームごとに再生成する
- `new Vector3` 群の生成と geometry 全更新は GC と render CPU の両方を押し上げる
- trail は可視品質には効くが、simulation correctness には直接関与しないため、性能改善余地が大きい

優先理由:

- 視覚機能を維持したまま更新頻度やバッファ戦略を調整しやすい
- UI 全再構築と並ぶ main-thread フレームコストの強い候補である

改善候補:

- ring buffer で trail history を保持して `shift()` をなくす
- `setFromPoints` の全量更新をやめ、固定長 BufferAttribute を部分更新する
- 一定距離または一定 simulation step ごとにだけ trail 点を追加する

### 4. Medium: worker backend は structured clone と full payload 往復の固定コストが大きい

根拠:

- [Sources/app/simulation-execution.js#L21](../../Sources/app/simulation-execution.js#L21) の job は `bodies` と `simulationConfig` をそのまま送る
- [Sources/app/simulation-execution.js#L91](../../Sources/app/simulation-execution.js#L91) で `postMessage` している
- [Sources/workers/physics-worker.js#L14](../../Sources/workers/physics-worker.js#L14) は payload をそのまま `simulateBatch` へ渡し、結果の bodies 全体を返している
- benchmark では [Works/benchmarks/phase4/latest.ci.json](../benchmarks/phase4/latest.ci.json) の通り worker pipeline time が 14.00 ms、main は 0.10 ms だった

評価:

- worker は render をブロックしにくいため simulation progress は改善するが、通信往復コストが非常に大きい
- 現行 bodyCount 10 では compute より message pipeline が支配的で、worker 最適化は通信設計の見直しが前提になる

優先理由:

- 影響は大きいが、状態契約や fallback 契約への影響範囲も広い
- まず main-thread 側の無駄更新を抑えてから着手する方が安全

改善候補:

- worker へ送る payload を最小化する
- bodies 全体の object graph ではなく、transferable を検討する
- fixed config は毎回送らず、初期化時と変更時だけ同期する

### 5. Medium: physics engine は allocation が多いが、現行 10 体 workload では最優先ではない

根拠:

- [Sources/app/physics-engine.js#L10](../../Sources/app/physics-engine.js#L10) の `computeAccelerations()` は毎回 acceleration 配列を新規生成する
- [Sources/app/physics-engine.js#L17](../../Sources/app/physics-engine.js#L17) では pair ごとに `delta` object を生成する
- [Sources/app/physics-engine.js#L74](../../Sources/app/physics-engine.js#L74) 以降の RK4 は `k2Bodies`、`k3Bodies`、`k4Bodies` など複数配列と derivative object を生成する
- ただし benchmark の main pipeline time は 0.10 ms で、現行条件では compute 優勢ではない

評価:

- bodyCount 上限が 10 の現状では、物理計算のアルゴリズム最適化より、main-thread 描画と UI 更新の削減効果の方が大きい見込み
- RK4 条件では別結果になり得るが、今回の baseline では優先度を上げる根拠が弱い

優先理由:

- ここは将来の bodyCount 拡張や high-accuracy mode を見据えた第 2 段の最適化候補
- 先に手を入れると、精度やテスト契約を壊すリスクの割に見返りが小さい

改善候補:

- scratch buffer を再利用して temporary object を減らす
- `delta` の object 化を避ける
- RK4 の中間状態配列を pooling する

## Priority Order

1. store clone と full render subscription の分離
2. UiShell の body card / camera target 全再構築停止
3. Three.js trail history / geometry 更新戦略の見直し
4. worker payload と structured clone overhead の削減
5. physics engine の temporary allocation 削減

## Recommended Next Step

最初の実装対象は 1 と 2 をまとめて扱うのがよい。

理由:

- main-thread 負荷へ直接効く
- benchmark の FPS 頭打ちに最も近い
- 既存の physics 契約や persistence 契約に手を入れずに進めやすい
- 変更後に `npm run benchmark:phase4` で再比較しやすい

次点は 3 で、trail の更新頻度またはデータ構造を見直す。

worker 最適化と physics 最適化は、その後の第 2 段として扱うのが妥当である。

## Commands Run

- `npm test`
- `npm run test:ui`
- `npm run benchmark:phase4`