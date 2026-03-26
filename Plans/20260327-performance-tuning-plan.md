# パフォーマンス調査・チューニング計画書

## 1. 目的

本計画書の目的は、このリポジトリの browser-only 3D N-body simulator について、パフォーマンス上のボトルネック候補を体系的に調査し、必要性と効果が確認できた箇所に限定して安全にチューニングを実施するための実行計画を定義することにある。

今回の主眼は、感覚的な最適化ではなく、測定結果に基づいて優先順位を付けることにある。調査だけで終える場合も、どこが支配的コストか、なぜ今は未対応とするかを記録する。

## 2. 対象範囲

対象は以下とする。

- [Sources/app/physics-engine.js](../Sources/app/physics-engine.js)
- [Sources/app/simulation-loop.js](../Sources/app/simulation-loop.js)
- [Sources/app/simulation-execution.js](../Sources/app/simulation-execution.js)
- [Sources/app/runtime-state.js](../Sources/app/runtime-state.js)
- [Sources/app/ui-shell.js](../Sources/app/ui-shell.js)
- [Sources/app/renderer-facade.js](../Sources/app/renderer-facade.js)
- [Sources/app/three-scene-host.js](../Sources/app/three-scene-host.js)
- [Sources/app/renderer-helpers.js](../Sources/app/renderer-helpers.js)
- [Sources/app/layout-service.js](../Sources/app/layout-service.js)
- [Sources/workers/physics-worker.js](../Sources/workers/physics-worker.js)
- 性能計測や回帰確認に必要な [Tests](../Tests) 配下の関連テスト

参考対象は以下とする。

- [Specifications/n-body-problem-simulator-specification.md](../Specifications/n-body-problem-simulator-specification.md)
- [Plans/n-body-problem-simulator-development-plan.md](../Plans/n-body-problem-simulator-development-plan.md)
- [README.md](../README.md)

対象外は以下とする。

- [Sources/vendor/three.module.min.js](../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../Sources/vendor/three.core.min.js)
- 画像アセットなどの非コードファイル
- 仕様未合意の新機能追加

## 3. 非交渉制約

- ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript を維持する
- React や外部状態管理ライブラリは導入しない
- 物理演算、描画、UI 制御、永続化の責務分離を弱めない
- `random-cluster`、`sample`、`binary-orbit` の preset 契約と再現性契約を壊さない
- localStorage の保存復元契約、`committedInitialState` 契約、`PERSISTENCE_POLICY` を壊さない
- compact controls、accessible name、validation 表示条件、Body card 独立開閉契約を壊さない
- Three.js 初期化失敗時の 2D fallback 継続と status message 契約を壊さない
- `system-center` は全 Body の質量重み付き重心であり、総質量 0 の場合のみ位置平均へフォールバックする契約を維持する
- UI 表示値の小数 2 桁表示契約を壊さない

## 4. 調査観点

### 4.1 シミュレーション計算コスト

- `stepVelocityVerlet` と `stepRk4` の計算時間
- `computeAccelerations` の $O(n^2)$ 区間の支配率
- allocation や clone に起因する GC 圧力
- bodyCount 8 と 10 の差分

### 4.2 メインスレッド更新コスト

- `requestAnimationFrame` ごとの UI 更新頻度
- metrics 更新や body card 再描画の過剰さ
- 実行状態に対して不要な DOM 更新の有無
- resize や layout 計算の発火頻度

### 4.3 描画コスト

- Three.js scene 更新の per-frame コスト
- trail 更新、mesh 更新、camera frame 解決の支配率
- fallback renderer と Three.js renderer の差分

### 4.4 実行モード差分

- `execution=main` と `execution=worker` の pipeline time 差分
- worker 使用時の postMessage / structured clone overhead
- worker fallback 発生条件

## 5. ベースライン測定条件

最低限、以下の条件で比較する。

1. `preset = sample`, `bodyCount = 8`, `integrator = velocity-verlet`, `showTrails = true`
2. `preset = random-cluster`, `bodyCount = 10`, `integrator = velocity-verlet`, `showTrails = true`
3. `preset = random-cluster`, `bodyCount = 10`, `integrator = rk4`, `showTrails = true`
4. `execution=main` と `execution=worker` を同一条件で比較する

各条件で少なくとも以下を記録する。

- FPS
- pipeline time
- simulation step cost の概算
- UI interaction 中の入力遅延の有無
- fallback 発生有無

## 6. 実施手順

### フェーズ 0: ベースライン確認

作業内容:

- [README.md](../README.md)、[Specifications/n-body-problem-simulator-specification.md](../Specifications/n-body-problem-simulator-specification.md)、[Plans/n-body-problem-simulator-development-plan.md](../Plans/n-body-problem-simulator-development-plan.md) を読み、性能と UI 契約を確認する
- `npm test` と `npm run test:ui` を実行して現状グリーンを確認する
- 既存の benchmark 手順が使える場合は `npm run benchmark:phase4` を実行してベースラインを保存する

完了条件:

- 現状の成功 / 失敗状況が記録されている
- 性能調査前の baseline 数値がある

### フェーズ 1: ホットスポット候補の絞り込み

作業内容:

- simulation loop、physics engine、renderer、ui-shell の更新経路を確認する
- 高頻度で呼ばれる関数と per-frame allocation 箇所を洗い出す
- DOM 全体再描画や full collection rebuild の有無を確認する

完了条件:

- 支配的コスト候補が優先順位付きで列挙されている
- 各候補について、CPU、GC、DOM、renderer、worker overhead のどれが主因か仮説がある

### フェーズ 2: 計測補助の追加

作業内容:

- 既存契約を壊さない範囲で、必要最小限の timing log、counter、benchmark hook を追加する
- 開発用の補助計測は production behavior を変えないようにする
- 測定値が Node テストや Playwright を不安定化させないようにする

完了条件:

- hotspot の仮説を検証できる計測手段がある
- 計測追加だけで既存テストが落ちない

### フェーズ 3: 必要箇所のみチューニング

作業内容:

- 測定で支配的と確認できた箇所のみ変更する
- 変更案ごとに「何を減らすのか」を明示する
  - 例: DOM 更新回数、allocation 回数、不要な clone、不要な render 呼び出し、worker 通信回数
- 精度要件や状態契約を暗黙に下げない

完了条件:

- 少なくとも 1 つ以上の支配的コストについて改善前後比較がある
- 改善が測定値で確認できるか、改善見送り理由が記録されている

### フェーズ 4: 回帰確認

作業内容:

- `npm test`
- `npm run test:ui`
- 必要に応じて `npm run benchmark:phase4`
- `sample`、`random-cluster`、`binary-orbit` の preset 契約が壊れていないか確認する

完了条件:

- 既存テストがグリーン
- 性能改善または見送り理由が説明できる

## 7. 優先順位

優先度は以下の順とする。

1. 明らかな過剰 DOM 更新
2. per-frame の不要 allocation / clone
3. 物理計算ループ内の重複計算
4. trail / renderer 更新の過剰処理
5. worker 通信 overhead
6. 微小で説明困難な micro-optimization

最後の項目は、測定値で支配的でない限り後回しとする。

## 8. 受け入れ基準

以下を満たした場合に完了とみなす。

1. ボトルネック候補がファイル単位と責務単位で整理されている
2. baseline 測定条件と結果が記録されている
3. チューニング対象は測定根拠つきで選定されている
4. 実施した変更について改善指標または見送り理由が説明できる
5. `npm test` が成功する
6. `npm run test:ui` が成功する
7. 仕様、UI、保存復元、renderer fallback 契約が回帰していない

## 9. 成果物

今回の調査・実装では、少なくとも以下を成果物とする。

- hotspot 調査メモ
- 必要なら追加した benchmark / instrumentation code
- 実施したチューニング差分
- 更新したテスト
- ベースラインと変更後の比較結果

## 10. リスク

- FPS 向上のために精度要件を暗黙に落とすリスク
- UI 再描画抑制で表示同期が崩れるリスク
- worker 最適化で fallback 契約や error handling を壊すリスク
- 計測コードの混入で production behavior を変えるリスク

各変更では、性能改善量だけでなく、契約維持の可否を必ず確認する。