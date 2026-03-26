---
name: n-body-problem-simulator-phase-3-physics-loop
description: Implement Phase 3 for the 3D N-body problem simulator by adding the physics engine, fixed-step simulation loop, actual playback state transitions, and runtime metric updates on top of the existing scaffold. Japanese triggers: Phase 3 実装, physics loop, Velocity Verlet, Start, Pause, Resume, Reset, エネルギー誤差.
argument-hint: Add any constraints for physics accuracy, loop structure, or rendering update depth
agent: agent
---

# 役割と目的
あなたは、このリポジトリで 3D N-body problem simulator の Phase 3 を実装する担当エンジニアです。
今回の目的は、すでに `Sources/` 配下にある Phase 1 と Phase 2 の実装を前提に、実際に Body が時間発展する physics engine、固定時間刻み simulation loop、Start / Pause / Resume / Reset の本実装、runtime metrics 更新を追加し、アプリを「動くシミュレーション」に進めることです。

関連する常設ルールは [.github/copilot-instructions.md](../copilot-instructions.md) を参照してください。
関連ドキュメントは以下を参照してください。
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。
- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)
- [.github/skills/n-body-threejs-rendering/SKILL.md](../skills/n-body-threejs-rendering/SKILL.md)
- [.github/skills/n-body-testing-and-validation/SKILL.md](../skills/n-body-testing-and-validation/SKILL.md)

# 現在の前提
このリポジトリには、すでに以下が実装済みです。

- app bootstrap と store 初期化
- responsive UI shell
- Body 入力 validation
- localStorage 保存復元
- state hydration と preset / bodyCount 正規化
- preset と seed に基づく Generate
- Three.js scaffold renderer と 2D fallback
- `committedInitialState` の保存更新
- `Sources/images/` 配下に texture 候補画像が存在する
- `Sources/vendor/three.module.min.js` と `Sources/vendor/three.core.min.js` のローカル Three.js bundle が存在する
- compact controls UI が実装されており、visible label / visible button text は短縮形、accessible name は正式名称を保持している
- validation panel はエラーがある時だけ表示される

Phase 3 では、これらを全面的に作り直すのではなく、既存境界を活かして physics loop を差し込んでください。

# 今回の実装範囲
今回の作業対象は Phase 3 のみとし、少なくとも以下を実装してください。

1. N 体重力加速度計算
2. Velocity Verlet による固定時間刻み積分
3. accumulator 方式の simulation loop
4. Start / Pause / Resume / Reset の本実装
5. runtime metrics 更新
6. renderer への毎フレーム snapshot 反映

主な更新対象は以下を想定します。

- `Sources/app/bootstrap.js`
- `Sources/app/simulation-controller.js`
- `Sources/app/defaults.js`
- `Sources/app/renderer-facade.js`
- `Sources/app/three-scene-host.js`
- 必要なら `Sources/app/` 配下の physics / loop 補助モジュール

# 今回は実装しないこと
以下は Phase 3 のスコープ外とし、完成実装を行わないでください。

- Web Worker 本実装
- RK4 の本実装
- 可変時間刻み
- 衝突判定や合体処理
- OrbitControls などの本格カメラ操作
- trail の本格描画最適化
- 11 体以上を前提とした最適化

ただし、後続フェーズで Worker や trail を差し込めるように、physics snapshot と runtime state の責務分離は行って構いません。

# 技術制約
- ブラウザのみで完結すること
- HTML5、CSS3、JavaScript ES6+ を使うこと
- UI は Vanilla JavaScript で構築すること
- React や外部状態管理ライブラリは導入しないこと
- 力学計算は正規化単位系、`G = 1.0` を前提にすること
- 初回採用積分法は Velocity Verlet とすること
- 描画ループは `requestAnimationFrame` を使うこと
- physics loop は renderer や UI shell に埋め込まず、分離した責務にすること

# Phase 3 の実装要求
## 1. 重力加速度計算
以下の加速度式を実装すること。

$$
\mathbf{a}_i = G \sum_{j \ne i} m_j \frac{\mathbf{r}_{ji}}{(|\mathbf{r}_{ji}|^2 + \epsilon^2)^{3/2}}
$$

要件は以下とする。

- 全 Body ペアを O($N^2$) で評価すること
- `simulationConfig.gravitationalConstant` を使うこと
- `simulationConfig.softening` を使うこと
- Body ごとの `mass`、`position`、`velocity` を入力に使うこと
- 既存の canonical `AppState` を破壊しない境界を持つこと

## 2. 積分法
Velocity Verlet を採用すること。

要件は以下とする。

- 固定時間刻みで更新すること
- `simulationConfig.timeStep` を使うこと
- Start 後に position と velocity が実際に変化すること
- Pause 中は積分を停止すること
- Resume で停止時点から再開すること

RK4 や Leapfrog を追加しなくてよいですが、後から比較実装を差し込みにくい密結合は避けてください。

## 3. simulation loop
accumulator 方式を実装すること。

処理ルールは以下で固定します。

1. `requestAnimationFrame` で描画ループを回すこと
2. 実時間差分は `performance.now()` 相当の単調増加時刻から取得すること
3. 前回フレームからの実時間差分を accumulator に加算すること
4. `accumulator >= dt` の間、最大 4 回まで physics update を消化すること
5. 上限超過分は次フレームへ繰り越すこと
6. physics update 後の最新 state を renderer へ渡すこと
7. overlay metrics を更新すること

少なくとも以下を満たしてください。

- `idle` 中は physics update が進まないこと
- `running` 中のみ simulationTime が増えること
- `paused` 中は renderer 表示を保持したまま時間が止まること
- Reset 後は accumulator などの中間状態を安全に初期化すること
- Start と Resume 直後は frame timestamp を再初期化し、1 フレーム目で過大な catch-up を起こさないこと
- 1 描画フレーム内の physics update 回数は 4 回を超えないこと
- Pause を押した同一フレーム以降は、追加の physics step を消化しないこと
- `simulationTime` は消化した fixed step 数と `dt` の積に一致させること

## 4. Start / Pause / Resume / Reset
既存の scaffold を本実装へ置き換えてください。

### Start
- `playbackState = idle` かつ validation 正常時のみ開始すること
- `committedInitialState` を計算開始基準とすること
- Start 時に loop 内部状態を初期化すること
- Start 時に current editable state をそのまま継続利用せず、`committedInitialState` から runtime 実行状態を構築すること

### Pause
- `running` から `paused` へ遷移すること
- physics update を止めること
- Body positions は停止時点のまま保持すること
- Pause 後の renderer 表示は停止時点 snapshot を維持すること

### Resume
- `paused` から `running` へ遷移すること
- 停止時点の positions / velocities から再開すること
- Resume 時に accumulator と frame timestamp を安全に再開用初期化すること

### Reset
- 常に `committedInitialState` へ戻すこと
- `simulationTime = 0` に戻すこと
- `playbackState = 'idle'` に戻すこと
- physics loop の内部状態も初期化すること
- renderer に即時反映されること
- positions、velocities、`bodyCount`、`simulationConfig`、`selectedBodyId`、`cameraTarget`、`showTrails` が `committedInitialState` と一致すること

## 5. runtime metrics
少なくとも以下を runtime に反映してください。

- FPS
- Simulation Time
- Energy Error

Energy Error は以下で計算すること。

$$
\varepsilon_E(t)=\frac{|E(t)-E(0)|}{\max(|E(0)|, 10^{-12})}
$$

要件は以下とする。

- Start 直後の総エネルギーを基準値として保持すること
- kinetic + potential から総エネルギーを計算すること
- `idle` では `simulationTime = 0` を表示すること
- metrics overlay が 1 秒以上 stale にならないこと
- Energy Error が `NaN` や `Infinity` を表示しないこと
- FPS は renderer loop から計算し、少なくとも 0.5 秒以下の窓で更新すること
- Start 直後と Reset 直後は Energy Error 基準値を再初期化すること

## 6. renderer 連携
既存 renderer scaffold を活かし、physics update 後の Body positions を描画に反映してください。

要件は以下とする。

- Three.js 利用可能時は既存 `ThreeSceneHost` に反映すること
- Three.js は CDN ではなく `Sources/vendor/three.module.min.js` のローカル import で利用すること
- Three.js material の texture source は `Sources/images/` 配下の画像ファイルを使うこと
- texture 解決は `Body.name` の小文字英字ベース名から対応画像を探す方針を既定にすること
- `sun.jpg`、`mercury.jpg`、`venus.jpg`、`earth.jpg`、`moon.jpg`、`mars.jpg`、`jupiter.jpg`、`saturn.jpg` を初回対象として扱えること
- 対応画像が存在しない Body は color-only material へ fallback し、描画を継続すること
- fallback 2D 描画でも最新 positions が見えること
- Three.js 初期化失敗時は 2D fallback へ切り替え、texture unavailable 理由を英語ステータスメッセージへ出すこと
- Body mass に応じた既存サイズ表現を壊さないこと
- resize 経路を壊さないこと

## 7. state と責務分離
以下の分離を守ってください。

- physics 計算ロジック
- loop 制御ロジック
- simulation controller の UI イベント処理
- persistence
- renderer

少なくとも、UI shell へ physics の詳細式や loop 制御を埋め込まないこと。

## 8. persistence と実行時 state の扱い
Phase 2 で実装済みの localStorage 保存復元方針を壊さないでください。

要件は以下とする。

- `running` や `paused` の中間状態を persistence に保存しないこと
- Start / Pause / Resume 中に `committedInitialState` を勝手に上書きしないこと
- Generate または idle 中の妥当入力で確定した初期条件だけが Reset 復帰先になること
- compact controls の visible text、validation panel の表示条件、single-expand body card の UI 方針を壊さないこと

## 9. 受け入れ基準
少なくとも以下を満たすこと。

1. `binary-orbit` または `three-body-figure-eight` で Start 後、10 回以上の fixed step 消化後に少なくとも 1 体の position が開始時から変化していること
2. Start 後の `simulationTime` は `dt` の整数倍として増加し、丸め誤差を除き `stepCount * dt` と一致すること
3. Pause 実行後、300ms 以上経過しても `simulationTime`、positions、velocities が変化しないこと
4. Resume 実行後、Pause 時点から simulationTime が再び増加し、positions / velocities も停止時点から連続して変化すること
5. Reset 実行後、`bodyCount`、`bodies`、`simulationConfig`、`selectedBodyId`、`cameraTarget`、`showTrails`、`simulationTime`、`playbackState` が最新の `committedInitialState` と仕様どおり一致すること
6. Generate 後に Start すると、その Generate 結果の `bodies`、`presetId`、`seed` を基準に計算開始されること
7. 1 描画フレーム内で physics step が 4 回を超えず、フレーム落ち時も無制限 catch-up を起こさないこと
8. Energy Error が有限値として継続表示され、既定設定の `binary-orbit` で 1,000 fixed step 後に `1e-2` を超えないこと
9. FPS、Simulation Time、Energy Error が overlay に表示され、更新停止時を除き 1 秒以上 stale にならないこと
10. 既存の validation、localStorage restore、reproducibility key 表示を壊さないこと

## 10. 実装後に最低限確認する検証項目
実装担当者は、少なくとも以下を確認してください。

1. manual validation
	- `binary-orbit` で Start、Pause、Resume、Reset を順に操作し、状態遷移表どおりに動作すること
	- `three-body-figure-eight` で 10 秒程度動かし、Body が停止しないこと
	- `random-cluster` を Generate してから Start し、Generate 後の state から計算開始されること
2. deterministic validation
	- 同一 Generate 結果から Start した時、初回数十 step の挙動が同一 build で再現可能であること
3. metrics validation
	- Energy Error が finite のまま更新されること
	- Pause 中に FPS だけが更新されても、Simulation Time と Energy Error が暴走しないこと
4. reset validation
	- `running` と `paused` の両方から Reset して、同一 `committedInitialState` へ戻ること

# 実装時の判断基準
- Phase 3 の目的は「入力フォーム付きの設定アプリ」を「実時間で進むシミュレーション」へ進めることです。
- renderer と physics の結合は最小限にし、positions / velocities を渡す境界を優先してください。
- loop は最小実装でよいですが、後で Worker に逃がせる構造を優先してください。
- energy error は厳密最適化よりも、監視指標として一貫して計算できることを優先してください。
- 既存の Phase 2 保存復元や field-level validation を壊さないことを合格条件に含めてください。
- 受け入れ基準は manual confirmation だけでなく、可能な範囲で関数単位または controller 単位の検証へ落とせる文にしてください。

# 期待する出力
- 必要ファイルを実際に作成・更新してください。
- 変更内容は Phase 3 の範囲に留めてください。
- 実装後は、physics engine、loop、state transition、metrics をどのファイルへ置いたかを簡潔に説明してください。
- Start / Pause / Resume / Reset、energy error、accumulator 上限の確認結果を簡潔に添えてください。