# 3D N-body problem simulator 開発計画書

## 1. 目的とスコープ

本計画書の目的は、ブラウザのみで動作する 3D N-body problem simulator を、将来の実装担当者が迷わず着手できる粒度で分解し、設計判断の前提・受け入れ基準・保存対象・状態遷移・検証観点を明確化することにある。

本計画書のスコープは以下とする。

- ブラウザ上で完結する 3D N 体重力シミュレーションアプリの実装計画
- 最大 10 体の Body 設定 UI とシミュレーション制御 UI の設計方針
- Three.js を用いた描画方式の採用方針
- 数値積分法の比較と採用方針
- localStorage を用いた設定復元方針
- GitHub Copilot カスタマイズファイルの整備計画

本計画書のスコープ外は以下とする。

- サーバーサイド処理
- ユーザーアカウント管理
- ネットワーク同期
- 11 体以上を前提とした性能最適化
- 学術論文水準の高精度天体計算エンジンの実装

受け入れ基準は以下とする。

- 対象ブラウザで 2 体から 10 体まで設定・生成・開始・一時停止・再開・初期化の導線が成立すること
- 初期条件、表示設定、再現用情報が再読み込み後に復元できること
- 想定端末で通常運用時に描画 FPS の中央値が 55 以上、95 パーセンタイルで 45 を下回らないこと
- 長時間試験でエネルギー相対誤差の評価結果を確認できること

対象ブラウザは以下で固定する。

- Desktop: Chrome 最新安定版
- Android: Chrome 最新安定版
- iPadOS / iOS: Safari 最新安定版

## 2. 要件整理

### 2.1 非交渉要件

- 実行環境はクライアントサイドのブラウザのみ
- 使用技術は HTML5、CSS3、JavaScript ES6+
- 3D 描画には Three.js を採用する
- UI は Vanilla JavaScript で構築し、React や外部状態管理ライブラリは使わない
- Body 数は 2 以上 10 以下
- 各 Body は質量、初期位置ベクトル、初速度ベクトルを必須項目とする
- 設定値と再現用情報は localStorage に保存する
- 力学計算は正規化単位系で扱い、重力定数は `G = 1.0` に固定する

単位系は以下で固定する。

- 長さ単位: normalized distance unit
- 質量単位: normalized mass unit
- 時間単位: normalized time unit
- 速度単位: normalized distance unit per normalized time unit

この計画書における `dt`、`epsilon`、エネルギー相対誤差、preset の初期条件はすべてこの正規化単位系を前提に評価する。

### 2.2 Body 設定要件

- Body 数は UI から増減可能とする
- 各 Body は以下の入力を持つ
  - Name
  - Mass
  - Position X, Y, Z
  - Velocity X, Y, Z
- 初期位置が必要な理由を UI と仕様に明記する
  - N 体問題は各時刻の位置と速度から力を求める初期値問題であり、初期位置が欠けると重力計算の距離が定義できないため
- 入力バリデーションは数値必須、質量は正値、Body 数は 2 から 10 の範囲とする

### 2.3 Generate 要件

- Generate はランダム生成ではなく、再現可能な初期条件セット生成機能として扱う
- 生成方式は次のいずれかを採用する
  - preset から選択する方式
  - seed を使った擬似乱数方式
  - preset と seed の併用方式
- 初回実装では preset と seed の併用を採用する
  - preset は生成ルールのカテゴリ識別子
  - seed は同一 preset 内の具体的な初期値再現に使う
- 再現キーは preset ごとに以下で定義する
  - `binary-orbit`: `presetId`
  - `three-body-figure-eight`: `presetId`
  - `random-cluster`: `presetId`, `seed`, `bodyCount`
- Generate 実行時のリセット対象は以下とする
  - simulationTime を 0 に戻す
  - trail 履歴を破棄する
  - selectedBodyId を未選択へ戻す
  - camera target を system center へ戻す
  - playback state を idle に戻す
- `bodyCount` を生成結果の体数へ同期する
- `committedInitialState` を更新する
- Generate 実行直後に localStorage を更新する

初回実装で含める preset は以下で固定する。

- `binary-orbit`
  - 2 体
  - 固定データセット
  - seed は使わない
- `three-body-figure-eight`
  - 3 体
  - 固定データセット
  - seed は使わない
- `random-cluster`
  - 3 体から 10 体
  - preset ルールと seed で決定する生成方式
  - 各 Body の初期位置は原点から半径 1.2 以内に配置する
  - Body 間の最小初期距離は 0.2 とする
  - 生成失敗時は最大 100 回まで再試行し、それでも満たせない場合は Body 数を維持したまま最終候補から最小距離が最大の組を採用する

### 2.4 シミュレーション制御要件

- Start: 初期条件からシミュレーションを開始する
- Pause: 現在状態を保持したまま計算と描画更新を停止する
- Resume: Pause 時点の状態から再開する
- Reset: 最後に確定した初期条件へ戻す

「最後に確定した初期条件」は `committedInitialState` とし、以下の時点で更新する。

- Generate が成功した時
- `idle` 状態で Body 入力が妥当な値として確定し、保存された時

`committedInitialState` には以下を含める。

- `bodyCount`
- `bodies`
- `simulationConfig`
- `uiState.selectedBodyId`
- `uiState.cameraTarget`
- `uiState.showTrails`

`running` および `paused` 中は Body 入力を無効化し、アクティブなシミュレーション状態と `committedInitialState` を混在させない。

Reset は常に `committedInitialState` を復元対象とし、途中計算状態には戻らない。

Reset 実行時は以下も同時に復元または初期化する。

- `selectedBodyId`
- `cameraTarget`
- `showTrails`
- `simulationTime = 0`
- `playbackState = 'idle'`
- `trail` 全消去

状態遷移は以下とする。

- idle -> running: Start
- running -> paused: Pause
- paused -> running: Resume
- running -> idle: Reset
- paused -> idle: Reset
- any -> idle: Generate

### 2.5 性能要件

- 対象端末
  - PC: 2023 年以降の一般的なノート PC、4 コア以上、内蔵 GPU 可
  - Tablet: iPad Air class または同等の Android タブレット
  - Smartphone: 2022 年以降のミドルレンジ以上
- 計測条件
  - Body 数 10
  - trail 有効
  - カメラ操作なしの 60 秒連続実行
  - Desktop と Android は Chrome 最新安定版、iPadOS / iOS は Safari 最新安定版を用いる
- 目標値
  - 描画 FPS 平均 55 以上
  - 描画 FPS 95 パーセンタイル 45 以上
  - 1 フレーム当たりのメインスレッド予算 16.7ms 以内
  - 物理演算予算は通常時 4ms 以内、10 体時ピーク 8ms 以内

性能計測方法は以下で固定する。

- メインスレッド版
  - 物理演算予算は 1 フレーム内で PhysicsEngine 更新に要した経過時間で測る
- Worker 版
  - 物理演算予算は Worker 側の計算時間に、Main thread から Worker への送信開始から snapshot 受信完了までの往復遅延を加えた simulation pipeline time で測る
- 受け入れ判定は描画 FPS と simulation pipeline time の両方で行う

### 2.6 精度要件

- 比較対象は RK4 とシンプレクティック積分を含める
- 初回採用候補は Velocity Verlet とする
- 重力定数は `G = 1.0` とする
- エネルギー相対誤差の監視式は以下とする

$$
\varepsilon_E(t)=\frac{|E(t)-E(0)|}{\max(|E(0)|, 10^{-12})}
$$

- 長時間試験 10,000 ステップにおける目標値
  - 通常 preset で $\varepsilon_E(t) \le 10^{-3}$ を目安とする
  - 接近を含む高難度 preset では $\varepsilon_E(t) \le 10^{-2}$ を許容上限とする

## 3. 想定UI構成

### 3.1 レイアウト方針

- モバイルファーストで設計する
- 縦長画面ではコントロールパネルを上部、3D キャンバスを下部に配置する
- タブレット以上では左右 2 カラムに切り替える
- 10 体分の入力をスマートフォンでも扱えるよう、Body 設定は折りたたみカード方式を採用する

### 3.2 UI 領域構成

- Header
  - App title
  - Preset selector
  - Seed display
- Control panel
  - Body count selector
  - Generate button
  - Start button
  - Pause button
  - Resume button
  - Reset button
  - Time step control
  - Softening control
  - Trail toggle
- Body settings list
  - 各 Body カードに mass, position, velocity を配置
- Visualization area
  - 3D canvas
  - Overlay metrics
    - FPS
    - Simulation time
    - Energy error
    - Active preset

### 3.3 モバイル操作性要件

- 360px 幅でも主要操作ボタンが 2 行以内に収まること
- 各入力要素は最小タップ領域 44px を確保すること
- Body カードは 1 件ずつ展開できる方式にし、同時展開は最大 2 件までとする
- 数値入力はモバイルキーボード最適化のため decimal 入力を前提にする

## 4. 採用アルゴリズム候補と採用理由

### 4.1 比較対象

#### RK4

- 長所
  - 単発ステップ精度が高い
  - 教材・参考実装が多い
- 短所
  - 長時間シミュレーションでエネルギー保存が悪化しやすい
  - 1 ステップ当たり 4 回の評価が必要で計算コストが高い

#### Velocity Verlet

- 長所
  - シンプレクティックで長時間安定性が高い
  - エネルギー保存傾向が良い
  - 実装複雑度が比較的低い
- 短所
  - 局所精度だけを見ると RK4 より不利なケースがある
  - 可変時間刻みとの組み合わせは慎重な設計が必要

#### Leapfrog

- 長所
  - シンプルで高速
  - シンプレクティックで長時間安定性を確保しやすい
- 短所
  - 位置と速度の取り扱いが直感的でない
  - UI に表示する瞬間値の整合に注意が必要

### 4.2 採用方針

- 初回実装は Velocity Verlet を採用する
- 採用理由
  - 本アプリは学習・可視化用途であり、長時間の軌道破綻抑制を重視するため
  - 最大 10 体では O($N^2$) の重力計算でも現実的な範囲であり、RK4 より安定性を優先する価値が高いため
  - 接近時の重力軟化と固定時間刻みの組み合わせで運用しやすいため

### 4.3 時間刻み方針

- 初回実装は固定時間刻みを採用する
- 既定値は `dt = 0.005` を候補とし、preset ごとに上書き可能とする
- 将来拡張として可変時間刻みを比較対象に残すが、初回は未採用とする
- 可変時間刻みを初回で見送る理由
  - 実装複雑度が増す
  - シンプレクティック性が崩れやすい
  - UI 上の時間進行と検証の説明コストが増す

### 4.4 重力軟化方針

- 重力軟化を導入する
- 加速度計算は以下の形を採用する

$$
\mathbf{a}_i = G \sum_{j \ne i} m_j \frac{\mathbf{r}_{ji}}{(|\mathbf{r}_{ji}|^2 + \epsilon^2)^{3/2}}
$$

- 初期既定値は `epsilon = 0.01` を候補とし、preset に応じて調整可能とする

## 5. 描画方式の比較と採用方針

### 5.1 候補比較

#### Canvas 2D

- 3D 表現に不向き
- カメラ制御や奥行き表現の実装負荷が高い

#### 生 WebGL

- 柔軟性は高い
- この規模のアプリでは実装と保守のコストが過大

#### Three.js

- 3D シーン、カメラ、マテリアル、Orbit 操作の基盤が整う
- ブラウザ上の 3D 教育可視化アプリと相性が良い
- 保守性と開発速度のバランスがよい

### 5.2 採用方針

- Three.js を採用する
- 理由
  - 3D シーン管理の実装コストを下げられる
  - Body 数が最大 10 のため、ライブラリオーバーヘッドが問題になりにくい
  - カメラ、ライト、座標補助表示、軌跡描画を段階的に導入しやすい

## 6. クラス設計方針と責務分担

### 6.1 主要責務

- PhysicsEngine
  - 力計算
  - 数値積分
  - エネルギー計算
- SimulationState
  - Body 配列
  - simulationTime
  - playbackState
  - preset / seed
- Renderer3D
  - Three.js scene 管理
  - Body mesh 更新
  - trail 更新
- UIController
  - フォーム入力管理
  - ボタンイベント管理
  - 表示状態更新
- PersistenceService
  - localStorage 保存と復元
- SimulationController
  - PhysicsEngine と Renderer3D の調停
  - Start/Pause/Resume/Reset/Generate の状態遷移管理

### 6.2 スレッド分離方針

- 初回設計時点で Web Worker 対応しやすい責務分割にする
- 採用方針
  - 物理演算は Worker 移行可能な API で設計する
  - 初回実装はメインスレッド版を先に作り、10 体構成で予算超過した場合に Worker 版を有効化する
- 理由
  - 最大 10 体ならメインスレッドでも成立する可能性が高い
  - ただし将来の trail 更新や UI 同居負荷を考慮すると、演算 API を Worker 互換にしておく価値が高い

### 6.3 Worker 採用時の責務分離

- Main thread
  - UI 入力
  - Three.js 描画
  - localStorage 永続化
- Worker
  - 力計算
  - 数値積分
  - エネルギー値算出
  - スナップショット生成

Worker 有効化判定は以下で行う。

- Desktop Chrome 最新安定版で、Body 数 10、trail 有効、60 秒実行時に FPS または simulation pipeline time の目標を満たせない場合
- Worker 導入後も同一条件で再計測し、round-trip を含む pipeline time が通常時 4ms、ピーク 8ms を超えないことを確認する
- Worker 導入有無の最終判断では、Android Chrome 最新安定版および iPadOS / iOS Safari 最新安定版でも同一条件を測定する
- Desktop のみで Worker を有効化し、モバイルで無効化する構成は初回リリースでは採用しない

## 7. データ構造の方針

### 7.1 Body データ

```text
Body {
  id: string
  name: string
  mass: number
  position: { x: number, y: number, z: number }
  velocity: { x: number, y: number, z: number }
  color: string
}
```

### 7.2 シミュレーション設定

```text
SimulationConfig {
  gravitationalConstant: number
  timeStep: number
  softening: number
  integrator: 'velocity-verlet' | 'rk4'
  maxTrailPoints: number
  presetId: string | null
  seed: number | null
}
```

初回実装の既定値は以下とする。

- `gravitationalConstant = 1.0`
- `timeStep = 0.005`
- `softening = 0.01`
- `integrator = 'velocity-verlet'`
- `maxTrailPoints = 300`

### 7.3 UI 状態

```text
UiState {
  playbackState: 'idle' | 'running' | 'paused'
  selectedBodyId: string | null
  cameraTarget: 'system-center' | string
  showTrails: boolean
  expandedBodyPanels: string[]
}
```

### 7.4 永続化スキーマ方針

- `appVersion` を持たせる
- 将来の互換性維持のためマイグレーション関数を用意する
- localStorage のキーは単一 JSON 方式を基本とする
  - 例: `nbody-simulator.state`

## 8. localStorageで保存する状態の一覧

- appVersion
- bodyCount
- bodies
  - mass
  - position
  - velocity
  - name
  - color
- simulationConfig
  - timeStep
  - softening
  - integrator
  - maxTrailPoints
  - presetId
  - seed
- uiState
  - showTrails
  - selectedBodyId
  - cameraTarget
  - expandedBodyPanels
- playbackRestorePolicy
  - 再読み込み後に idle 固定へ戻す

保存方針は以下とする。

- Body 入力変更時に即時保存
- Generate 実行時に即時保存
- 表示設定変更時に即時保存
- `running` と `paused` は保存対象にせず、再読み込み後は常に `idle` で復元する
- `committedInitialState` を保存対象に含め、Reset 復帰先を一意にする
- `simulationConfig.gravitationalConstant` を保存対象に含める

## 9. レスポンシブ対応方針

- ブレークポイントは 3 段階とする
  - Small: 0px から 599px
  - Medium: 600px から 1023px
  - Large: 1024px 以上
- Small
  - コントロール優先
  - キャンバス高さは画面高の 40 から 50 パーセントを確保
- Medium
  - 設定パネル上段、キャンバス下段
- Large
  - 左パネル 320px から 400px、右側をキャンバスに充てる
- キャンバスはウィンドウリサイズ時に再計算する
- 10 体時でも縦スクロールで操作完了できることを優先し、横スクロールは発生させない

## 10. アニメーションおよび物理演算ループの実装方針

- 描画ループは `requestAnimationFrame` を用いる
- 物理演算は固定時間刻みの accumulator 方式を用いる
- 1 描画フレーム中のサブステップ数は最大 4 とする
- フレーム落ち時は無制限 catch-up を行わず、描画安定性を優先する

基本ループ方針は以下とする。

1. 実時間差分を accumulator に加算する
2. `dt` を超える間は PhysicsEngine を最大 4 回まで進める
3. 更新後の state snapshot を Renderer3D に反映する
4. metrics overlay を更新する
5. 次の `requestAnimationFrame` を予約する

この方針により、描画負荷増大時に物理更新が暴走して UI が固まることを防ぐ。

## 11. 実装フェーズの分割案

### Phase 0: 文書とリポジトリ整備

- 開発計画書を確定する
- `.github/copilot-instructions.md` を整備する
- `.github/skills/` を整備する
- prompt file を `.github/prompts/` に配置する

### Phase 1: 基盤実装

- `index.html`, `style.css`, `main.js` の骨格を作る
- アプリ初期化と責務分離の骨格を作る
- 画面レイアウトとレスポンシブ基盤を実装する

### Phase 2: Body 設定 UI と永続化

- Body 数増減 UI を実装する
- Body カード入力 UI を実装する
- バリデーションを実装する
- localStorage 保存と復元を実装する

### Phase 3: 物理演算コア

- ベクトル演算ユーティリティを実装する
- 重力加速度計算を実装する
- Velocity Verlet を実装する
- エネルギー計算を実装する
- softening を実装する

### Phase 4: 3D 描画

- Three.js scene, camera, renderer を実装する
- Body mesh と color 管理を実装する
- trail 描画を実装する
- overlay metrics を実装する

### Phase 5: シミュレーション制御

- Start, Pause, Resume, Reset を実装する
- Generate を実装する
- preset / seed の復元を実装する
- `committedInitialState` の更新と復元を実装する
- 状態遷移制御を実装する

### Phase 6: 性能最適化

- FPS と演算時間を計測する
- hotspot を特定する
- 必要時に Worker 化する

### Phase 7: テストと仕上げ

- preset ごとの再現性検証
- エネルギー誤差検証
- モバイル UI 検証
- README と仕様の整備

## 12. テスト観点

### 12.1 機能テスト

- 2 体から 10 体まで Body 数を変更できるか
- mass, position, velocity の保存と復元が正しいか
- Generate で再現キーを構成する値が保存されるか
- Start, Pause, Resume, Reset の状態遷移が正しいか
- Reset が常に `committedInitialState` へ戻るか
- `running` と `paused` 中に Body 入力が無効化されるか

### 12.2 数値検証

- 2 体近似で期待される安定軌道が大きく崩れないか
- 同一再現キーで同一結果になるか
- 10,000 ステップでエネルギー相対誤差が許容範囲内か
- softening 無効時と有効時の挙動差が説明可能か

### 12.3 カオス系挙動確認

- 三体相互作用で初期値差に応じた軌道分岐が観察できるか
- 微小な初期位置差を入れた時に短時間では近く、長時間で乖離する挙動が確認できるか
- カオス的挙動を数値破綻と誤認しないため、エネルギー指標と合わせて確認できるか

### 12.4 パフォーマンステスト

- Body 数 10、trail 有効、60 秒実行で FPS 目標を満たすか
- Resize 直後に描画が破綻しないか
- スマートフォンで操作中に入力遅延が体感上大きくないか
- Worker 版で round-trip を含む simulation pipeline time が目標内か

### 12.5 UI テスト

- 360px 幅で横スクロールが発生しないか
- Body カード展開時も主要操作ボタンに到達できるか
- 表示文言が英語で一貫しているか

## 13. リスクと注意点

### 13.1 数値誤差の蓄積

- 長時間実行では誤差蓄積が避けられない
- 対策
  - シンプレクティック積分を優先する
  - エネルギー誤差を可視化する

### 13.2 特異点近傍と接近時不安定

- Body が極端に接近すると加速度が発散しやすい
- 対策
  - softening 導入
  - preset 生成時の最小距離制約

### 13.3 衝突判定の扱い

- 初回は衝突合体を実装しない
- 見かけ上重なっても、物理モデル上は点質量近似として扱う
- 将来拡張項目として分離する

### 13.4 Generate の再現性欠如

- 再現キーを構成する値を保存しないと同一状態を再現できない
- 対策
  - preset ごとの再現キーを構成する値を必須保存対象にする
  - `random-cluster` では `presetId`、`seed`、`bodyCount` を必須保存対象にする

### 13.5 保存データ互換性

- 将来の項目追加で localStorage 破損や読込失敗が起こり得る
- 対策
  - appVersion 付与
  - migration 実装

### 13.6 メインスレッド負荷

- trail 描画と入力 UI が重なるとフレーム落ちする可能性がある
- 対策
  - trail 点数上限
  - Worker 互換 API 設計
  - metrics で可視化

## 14. 実装開始前の確認事項

- 計画書保存先は `Plans/` で確定しているか
- 初回実装で Worker を有効化するか、メインスレッド版を先行するか
- 初回 preset を `binary-orbit`、`three-body-figure-eight`、`random-cluster` の 3 件で確定するか
- 既定 `dt = 0.005`、`softening = 0.01`、`G = 1.0` で開始するか
- エネルギー誤差の許容範囲を preset 別に持つか
- trail の既定表示本数をいくつにするか
- `running` 状態を再読込後に復元しない方針で合意するか
- Reset の復帰先を `committedInitialState` に固定するか
- サポートブラウザを Chrome Desktop / Android と Safari iPadOS / iOS に固定するか
- README と仕様書の作成順をどのフェーズで行うか

以上の確認が完了したら、Phase 1 から順に着手する。