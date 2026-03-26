# 3D N-body problem simulator 仕様書

## 1. 文書目的

本仕様書は、[Plans/n-body-problem-simulator-development-plan.md](../Plans/n-body-problem-simulator-development-plan.md) を実装可能な仕様へ落とし込むことを目的とする。実装担当者が迷わないよう、画面構成、機能要件、状態遷移、保存対象、データ制約、性能基準、受け入れ基準を固定する。

## 2. 適用範囲

本仕様書の対象は、ブラウザのみで動作する 3D N-body simulator とする。

対象に含むものは以下とする。

- Body 設定 UI
- Generate 機能
- Start、Pause、Resume、Reset のシミュレーション制御
- Three.js による 3D 可視化
- localStorage による保存と復元
- 性能計測用メトリクス表示

対象に含まないものは以下とする。

- サーバー通信
- ログイン機能
- 11 体以上の最適化
- 衝突合体の物理モデル

## 3. システム前提

- 実行環境はクライアントサイドのブラウザのみとする。
- 使用技術は HTML5、CSS3、JavaScript ES6+ とする。
- 3D 描画ライブラリは Three.js を採用し、実行時ファイルは `Sources/vendor/three.module.min.js` と `Sources/vendor/three.core.min.js` のローカル配布を使う。
- UI は Vanilla JavaScript で構築し、React および外部状態管理ライブラリは使用しない。
- UI 表示文言は英語とする。
- 仕様書、計画書、レビューコメントは日本語で記述する。

サポートブラウザは以下で固定する。

- Desktop: Chrome 最新安定版
- Android: Chrome 最新安定版
- iPadOS / iOS: Safari 最新安定版

力学計算の単位系は正規化単位系で固定し、重力定数は `G = 1.0` とする。

- 長さ単位: normalized distance unit
- 質量単位: normalized mass unit
- 時間単位: normalized time unit
- 速度単位: normalized distance unit per normalized time unit

## 4. 用語定義

| 用語 | 定義 |
| --- | --- |
| Body | 質量、位置、速度を持つ点質量として扱うシミュレーション対象 |
| Preset | 初期条件生成ルールを識別するテンプレート |
| Seed | 同一 Preset 内で生成結果を再現するための整数値 |
| Simulation Time | 数値積分上の経過時間 |
| Playback State | `idle`、`running`、`paused` の 3 状態 |
| Committed Initial State | Reset が復帰するために保存される、最後に確定した初期条件スナップショット |
| Trail | Body の過去位置を線分で描画した軌跡 |
| Softening | 接近時の加速度発散を緩和するための重力軟化係数 |

## 5. 機能仕様

## 5.1 アプリ初期化

- 初回ロード時は localStorage の保存内容を読み込む。
- 保存内容が存在しない場合は既定状態で起動する。
- 保存内容の `appVersion` が現在実装と互換でない場合は migration を試行する。
- migration 不可の場合は既定状態へフォールバックし、破損データは上書きする。
- 再読み込み後の `playbackState` は常に `idle` とする。
- `committedInitialState` が存在する場合は Reset 復帰先として復元する。
- Three.js 初期化成功時は `Three.js textured mode`、失敗時は `2D fallback mode` と texture unavailable 理由をステータスメッセージへ表示する。

受け入れ基準は以下とする。

- 保存済みの Body 設定、Preset、Seed、表示設定が再ロード後に復元されること
- `running` 状態のまま自動再開しないこと

## 5.2 Body 設定機能

### 5.2.1 Body 数

- Body 数は 2 以上 10 以下の整数とする。
- UI で増減可能とする。
- 既定値は 3 とする。

### 5.2.2 Body 入力項目

各 Body は以下の入力項目を持つ。

| 項目 | 型 | 必須 | 制約 | 備考 |
| --- | --- | --- | --- | --- |
| id | string | Yes | 一意 | 内部識別子 |
| name | string | Yes | 1 から 32 文字 | UI 表示名 |
| mass | number | Yes | `mass > 0` | 単位はアプリ内相対値 |
| position.x | number | Yes | 有限数 | 初期位置 |
| position.y | number | Yes | 有限数 | 初期位置 |
| position.z | number | Yes | 有限数 | 初期位置 |
| velocity.x | number | Yes | 有限数 | 初速度 |
| velocity.y | number | Yes | 有限数 | 初速度 |
| velocity.z | number | Yes | 有限数 | 初速度 |
| color | string | Yes | CSS color 互換 | 描画色 |

### 5.2.3 バリデーション

- `mass <= 0` の場合は保存しない。
- `NaN`、`Infinity`、空文字は不正とする。
- Body 数が範囲外の場合は直前の有効値へ戻す。
- 不正入力中は `Start` を無効化する。

### 5.2.4 初期位置必須理由

- 本アプリは N 体問題の初期値問題を解くため、各 Body の位置がなければ距離ベクトルが計算できず、重力加速度を求められない。
- そのため、質量と初速度だけではシミュレーション開始条件として不完全である。

受け入れ基準は以下とする。

- 2 体から 10 体まで Body 数を変更できること
- 不正入力中は `Start` を押せないこと
- 正常入力時は変更内容が localStorage に即時保存されること

## 5.3 Generate 機能

### 5.3.1 基本仕様

- Generate は再現可能な初期条件生成機能とする。
- 生成結果は再現キーで一意に再現できることを必須とする。
- Generate 実行時は現在のシミュレーション途中状態を破棄し、新しい初期条件へ置き換える。

再現キーは以下で定義する。

- `binary-orbit`: `presetId`
- `three-body-figure-eight`: `presetId`
- `random-cluster`: `presetId`, `seed`, `bodyCount`

### 5.3.2 現行 baseline で用意する Preset

| presetId | Body 数 | 説明 | Seed 利用 |
| --- | --- | --- | --- |
| `binary-orbit` | 2 | 近似円軌道の二体設定 | No |
| `three-body-figure-eight` | 3 | 8 の字軌道に近い三体設定 | No |
| `random-cluster` | 3 から 10 | 指定 Body 数でランダムクラスタを生成 | Yes |

`random-cluster` の生成制約は以下とする。

- 初期位置は原点から半径 1.2 以内に配置する。
- Body 間の最小初期距離は 0.2 とする。
- 生成失敗時は最大 100 回まで再試行する。
- 再試行上限到達時は、Body 数を維持したまま最小距離が最大となる候補を採用する。

### 5.3.3 Seed 仕様

- Seed は 32-bit 符号なし整数とする。
- `binary-orbit` と `three-body-figure-eight` は既定値を使うため Seed を参照しないが、保存値としては `null` を許容する。
- `random-cluster` では Seed を必須とする。
- Seed 未指定で `random-cluster` を実行する場合は現在時刻由来の整数を生成し、その値を保存する。
- `random-cluster` では `bodyCount` も再現キーに含める。

### 5.3.4 Generate 実行時の更新内容

- `bodies` を生成結果で置き換える。
- `bodyCount` を生成結果の `bodies.length` に同期する。
- `simulationTime = 0` とする。
- `playbackState = 'idle'` とする。
- `selectedBodyId = null` とする。
- `cameraTarget = 'system-center'` とする。
- `trail` を全消去する。
- `presetId` と `seed` を保存する。
- `committedInitialState` を更新する。
- 実行直後に localStorage を更新する。

受け入れ基準は以下とする。

- 同一再現キーで Generate した結果が一致すること
- Generate 後に画面上の時間、選択状態、軌跡が初期化されること
- Generate 後に再読み込みしても同じ設定が復元されること

## 5.4 シミュレーション制御機能

### 5.4.1 ボタン仕様

| ボタン | 実行条件 | 実行結果 |
| --- | --- | --- |
| Start | `playbackState = idle` かつ入力正常 | `committedInitialState` から計算開始 |
| Pause | `playbackState = running` | 計算停止、描画保持 |
| Resume | `playbackState = paused` | 停止時点から再開 |
| Reset | `playbackState = running` または `paused` または `idle` | `committedInitialState` へ復帰 |
| Generate | 任意状態 | 新規初期条件生成、`idle` へ遷移 |

`committedInitialState` は以下の条件で更新する。

- Generate 成功時
- `idle` 状態で Body 入力が妥当な値として保存された時

`committedInitialState` は以下を保持する。

- `bodyCount`
- `bodies`
- `simulationConfig`
- `uiState.selectedBodyId`
- `uiState.cameraTarget`
- `uiState.showTrails`

`running` と `paused` 中は Body 入力を無効化する。

Reset 実行時の復元内容は以下で固定する。

- `bodyCount`
- `bodies`
- `simulationConfig`
- `selectedBodyId`
- `cameraTarget`
- `showTrails`
- `simulationTime = 0`
- `playbackState = 'idle'`
- `trail` 全消去

### 5.4.2 状態遷移

| 現在状態 | イベント | 次状態 | 備考 |
| --- | --- | --- | --- |
| `idle` | Start | `running` | accumulator を初期化 |
| `running` | Pause | `paused` | 位置・速度は保持 |
| `paused` | Resume | `running` | 停止時点から再開 |
| `running` | Reset | `idle` | 初期条件へ戻す |
| `paused` | Reset | `idle` | 初期条件へ戻す |
| `idle` | Generate | `idle` | 初期条件置換 |
| `running` | Generate | `idle` | 実行中状態を破棄 |
| `paused` | Generate | `idle` | 停止中状態を破棄 |

受け入れ基準は以下とする。

- 状態遷移表にない遷移が発生しないこと
- `Pause` 後に `Resume` すると停止時点から再開すること
- `Reset` で最新の `committedInitialState` へ戻ること

## 5.5 可視化機能

### 5.5.1 3D 描画対象

- 各 Body を球体メッシュで描画する。
- 各 Body の色は `Body.color` を使う。
- Body マテリアルの画像テクスチャは `Sources/images/` 配下の画像ファイルから取得する。
- texture 解決の既定キーは `Body.name` の小文字英字ベース名とし、`Earth` は `earth.jpg`、`Mars` は `mars.jpg` のように対応付ける。
- 現行 baseline で利用対象とする既存画像は `sun.jpg`、`mercury.jpg`、`venus.jpg`、`earth.jpg`、`moon.jpg`、`mars.jpg`、`jupiter.jpg`、`saturn.jpg` とする。
- 対応する画像が存在しない Body は color-only material へ fallback し、描画やシミュレーションを停止しない。
- 原点補助および座標把握のための基準表示を用意する。
- camera はシーン全体を視認可能な初期位置から開始する。

### 5.5.2 Overlay 表示項目

- FPS
- Simulation Time
- Energy Error
- Active Preset
- Body Count

### 5.5.3 Trail 表示

- 既定で有効とする。
- `showTrails` 切り替えで表示可否を変更できること。
- `maxTrailPoints` は既定 300 とする。
- 上限を超えた古い点は先頭から削除する。

受け入れ基準は以下とする。

- 各 Body が一意の色で描画されること
- 対応画像がある Body は `Sources/images/` 配下の画像を texture として描画されること
- 対応画像がない Body でも fallback material で描画が継続すること
- `showTrails = false` で軌跡が非表示になること
- Overlay の値が 1 秒以内の遅延で更新されること

## 6. 非機能仕様

## 6.1 性能仕様

### 6.1.1 対象端末

- PC: 2023 年以降の一般的なノート PC、4 コア以上、内蔵 GPU 可
- Tablet: iPad Air class または同等の Android タブレット
- Smartphone: 2022 年以降のミドルレンジ以上

### 6.1.2 計測条件

- Browser
  - Desktop / Android: Chrome 最新安定版
  - iPadOS / iOS: Safari 最新安定版
- Body 数: 10
- Preset: `random-cluster`
- Trail: on
- 実行時間: 60 秒
- 操作: カメラ固定、UI 入力なし

### 6.1.3 目標値

- 描画 FPS 平均 55 以上
- 描画 FPS 95 パーセンタイル 45 以上
- メインスレッド 1 フレーム当たり予算 16.7ms 以内
- 物理演算処理時間は通常 4ms 以内、ピーク 8ms 以内

計測方法は以下で固定する。

- メインスレッド版では PhysicsEngine 更新処理の経過時間を物理演算処理時間とする。
- Worker 版では Worker 側計算時間に、Main thread から Worker への送信開始から snapshot 受信完了までの往復遅延を加えた simulation pipeline time を物理演算処理時間とする。
- 受け入れ判定は FPS と simulation pipeline time の両方で行う。

## 6.2 精度仕様

### 6.2.1 採用アルゴリズム

- 現行 baseline の既定積分法は Velocity Verlet とする。
- Phase 4 以降では比較対象として RK4 を追加する。
- 既定値は Phase 4 以降も `velocity-verlet` のままとする。
- 時間刻みは固定時間刻みとする。
- 重力定数は `G = 1.0` とする。
- 既定値は `dt = 0.005` とする。
- 重力軟化係数は既定値 `epsilon = 0.01` とする。

### 6.2.2 力学計算

各 Body の加速度は以下で求める。

$$
\mathbf{a}_i = G \sum_{j \ne i} m_j \frac{\mathbf{r}_{ji}}{(|\mathbf{r}_{ji}|^2 + \epsilon^2)^{3/2}}
$$

### 6.2.3 エネルギー誤差評価

監視指標は以下とする。

$$
\varepsilon_E(t)=\frac{|E(t)-E(0)|}{\max(|E(0)|, 10^{-12})}
$$

目標は以下とする。

- 通常 preset では 10,000 ステップ後に $\varepsilon_E(t) \le 10^{-3}$
- 接近を含む高難度 preset では 10,000 ステップ後に $\varepsilon_E(t) \le 10^{-2}$

## 7. UI 仕様

## 7.1 レイアウト

### 7.1.1 Breakpoints

| 名称 | 幅 |
| --- | --- |
| Small | 0 から 599px |
| Medium | 600 から 1023px |
| Large | 1024px 以上 |

### 7.1.2 レイアウトルール

- Small
  - Control panel を上段、Canvas を下段に配置する。
  - Canvas 高さは画面高の 40 から 50 パーセントを確保する。
- Medium
  - Control panel を Header 直下、Canvas をその下段に配置する。
- Large
  - Control panel を Header 直下の全幅ストリップとして配置する。
  - Control panel の下段を、左側 240px から 300px の Body settings、右側 Canvas の 2 カラムに分割する。
  - 1440px x 1024px の表示で Control panel 高さは 220px 以下とする。

### 7.1.3 モバイル操作要件

- 360px 幅でも主要ボタンを 2 行以内に収める。
- Control panel の compact input / select / button は高さ 36px を下限とする。
- Body card summary と主要 panel 操作は 44px 以上を維持する。
- 横スクロールを発生させない。
- Body カードは折りたたみ可能とし、各カードに Open / Closed の切替トグルを持たせる。
- Body カードは独立して開閉でき、同時に複数件を展開してよい。
- 初期表示は 1 番目の Body のみ Open とし、以後はユーザー操作を優先する。

### 7.1.4 Visualization overlay 要件

- Simulation metrics overlay は Viewport 右下に固定配置する。
- overlay の情報量は維持するが、Large では最大幅 240px 以下の compact 表示とする。
- overlay の内側余白は 12px 以下、主要値フォントは 1rem 以下を目安とする。
- Reproducibility Key を含む長い値は折り返して表示し、Canvas 外にはみ出さないこと。

## 7.2 UI 文言

UI 文言は英語とし、accessible name は正式名称を保持する。visible label / visible button text は compact 表示を許容する。

- App title: `3D N-body problem simulator`
- Control panel heading
  - eyebrow: `Setup`
  - heading: `Controls`
- Buttons
  - accessible name: `Generate`, visible text: `Gen`
  - accessible name: `Start`, visible text: `Run`
  - accessible name: `Pause`, visible text: `Hold`
  - accessible name: `Resume`, visible text: `Go`
  - accessible name: `Reset`, visible text: `Reset`
- Labels
  - accessible name: `Body Count`, visible text: `Count`
  - accessible name: `Preset`, visible text: `Preset`
  - accessible name: `Seed`, visible text: `Seed`
  - accessible name: `Time Step`, visible text: `dt`
  - accessible name: `Softening`, visible text: `Soft`
  - accessible name: `Integrator`, visible text: `Int`
  - accessible name: `Camera Target`, visible text: `Target`
  - accessible name: `Trails`, visible text: `Trail`
  - Body card fields: `Name`, `Mass`, `Position`, `Velocity`, `Color`
- Preset option visible text
  - `binary-orbit` -> `Binary`
  - `three-body-figure-eight` -> `Figure-8`
  - `random-cluster` -> `Random`
- Validation panel
  - title: `Errors`
  - hidden when no validation errors exist
  - visible and emphasized only when validation errors exist

## 8. データ仕様

## 8.1 Body

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

## 8.2 SimulationConfig

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

既定値は以下とする。

- `gravitationalConstant = 1.0`
- `timeStep = 0.005`
- `softening = 0.01`
- `integrator = 'velocity-verlet'`
- `maxTrailPoints = 300`

## 8.3 UiState

```text
UiState {
  playbackState: 'idle' | 'running' | 'paused'
  selectedBodyId: string | null
  cameraTarget: 'system-center' | string
  showTrails: boolean
  expandedBodyPanels: string[]
}
```

- `expandedBodyPanels` は Open な Body card の `body.id` 一覧とする。
- 空配列を許容する。
- hydration では存在しない id と重複 id を除去し、Body list 順へ正規化する。

## 8.4 AppState

```text
AppState {
  appVersion: string
  bodyCount: number
  bodies: Body[]
  simulationConfig: SimulationConfig
  uiState: UiState
  committedInitialState: {
    bodyCount: number
    bodies: Body[]
    simulationConfig: SimulationConfig
    uiState: {
      selectedBodyId: string | null
      cameraTarget: 'system-center' | string
      showTrails: boolean
    }
  }
  playbackRestorePolicy: 'restore-as-idle'
}
```

## 9. localStorage 仕様

## 9.1 キー

- localStorage キーは `nbody-simulator.state` とする。

## 9.2 保存タイミング

- Body 入力変更時
- Generate 実行時
- 表示設定変更時
- アプリ設定変更時

## 9.3 保存対象

- `appVersion`
- `bodyCount`
- `bodies`
- `simulationConfig.gravitationalConstant`
- `simulationConfig.timeStep`
- `simulationConfig.softening`
- `simulationConfig.integrator`
- `simulationConfig.maxTrailPoints`
- `simulationConfig.presetId`
- `simulationConfig.seed`
- `uiState.selectedBodyId`
- `uiState.cameraTarget`
- `uiState.showTrails`
- `uiState.expandedBodyPanels`
- `committedInitialState`
- `playbackRestorePolicy`

## 9.4 保存しない対象

- 実行中の accumulator
- 現在フレームの中間計算結果
- `playbackState = running`
- `playbackState = paused`
- trail の過去点列

## 10. 物理演算ループ仕様

- 描画ループは `requestAnimationFrame` を用いる。
- 物理演算は accumulator 方式で固定時間刻みを消化する。
- 1 フレーム当たりのサブステップは最大 4 とする。
- catch-up により UI が固まることを防ぐため、サブステップ上限超過分は次フレームへ繰り越す。

処理順序は以下とする。

1. 前回描画からの実時間差分を取得する。
2. accumulator に加算する。
3. `accumulator >= dt` の間、最大 4 回まで PhysicsEngine を更新する。
4. 更新後 snapshot を Renderer3D へ渡す。
5. Overlay を更新する。
6. 次フレームを予約する。

## 11. Worker 対応仕様

- 現行 baseline ではメインスレッド版を既定実行経路とする。
- Phase 4 以降では main thread と Worker の両実行経路を持つ。
- 物理演算モジュールは Worker 移行可能な API を前提に設計する。
- Worker 有効化条件は以下とする。
  - Desktop Chrome 最新安定版で、Body 数 10、Trail on、60 秒計測時に FPS または simulation pipeline time の目標を満たせない場合
- Worker 導入時の責務は以下とする。
  - Main thread: UI、Three.js、localStorage
  - Worker: PhysicsEngine、energy 計算、snapshot 生成
- request / response には `runId` と `stepSequence` 相当の世代識別子を含め、現行実行状態と一致しない response は破棄する。

Worker 導入後の受け入れ条件は以下とする。

- round-trip を含む simulation pipeline time が通常時 4ms 以内、ピーク 8ms 以内
- FPS 指標が同一条件で目標を満たすこと
- main thread 実行と Worker 実行で、同一 integrator・同一初期条件・同一 step 数における position / velocity 各成分の絶対差および energy error の絶対差が `1e-8` 以下であること

Worker 導入有無の最終判断は以下で行う。

- 一次判定は Desktop Chrome 最新安定版で行う。
- 一次判定後、Android Chrome 最新安定版および iPadOS / iOS Safari 最新安定版でも同一条件を測定し、Worker 導入前後の FPS と操作遅延を比較する。
- Desktop のみで Worker を有効化し、モバイルで無効化する構成は Phase 4 以降の採用判断でも前提にしない。

## 12. エラー処理仕様

- 不正入力時は該当項目を error 状態で表示する。
- localStorage 読み込み失敗時は既定状態へ戻す。
- Three.js 初期化失敗時は、2D fallback renderer へ切り替え、texture-backed bodies が unavailable である理由を英語メッセージで表示する。シミュレーション UI は継続利用可能とする。
- Generate 失敗時は前回有効状態を保持する。

UI エラーメッセージは英語とし、少なくとも以下を定義する。

- `Mass must be greater than 0.`
- `Value must be a finite number.`
- `Body count must be between 2 and 10.`
- `Failed to restore saved state. Defaults were applied.`
- `Texture-backed bodies are unavailable because Three.js failed to initialize.`

## 13. 受け入れ基準

## 13.1 機能受け入れ基準

- 2 体から 10 体まで設定できること
- 各 Body の mass、position、velocity を個別編集できること
- Generate、Start、Pause、Resume、Reset が状態遷移どおりに動作すること
- 再ロード後に設定、Preset、Seed、表示設定が復元されること
- Reset が `committedInitialState` に復帰すること
- `running` と `paused` 中に Body 入力が無効化されること

## 13.2 性能受け入れ基準

- 指定計測条件で FPS 平均 55 以上
- 指定計測条件で FPS 95 パーセンタイル 45 以上
- 1 フレーム当たりメインスレッド予算 16.7ms 以内
- Worker 版では simulation pipeline time が通常時 4ms 以内、ピーク 8ms 以内

## 13.3 精度受け入れ基準

- 通常 preset で 10,000 ステップ後のエネルギー相対誤差が $10^{-3}$ 以下
- 高難度 preset で 10,000 ステップ後のエネルギー相対誤差が $10^{-2}$ 以下

## 13.4 UI 受け入れ基準

- 360px 幅で横スクロールが発生しないこと
- 主要操作ボタンが視認かつ操作可能であること
- UI 文言が英語で一貫していること
- 1440px 幅では Control panel が Header 直下に全幅で配置され、Body settings より上段にあること
- 1440px x 1024px の表示で Control panel 高さが 220px 以下、Simulation metrics overlay 幅が 240px 以下であること

## 14. 実装対象ファイルの想定

- `Sources/index.html`
- `Sources/style.css`
- `Sources/main.js`
- `Sources/app/`
- `Sources/workers/physics-worker.js`

本仕様書に変更が入る場合は、計画書、prompt file、copilot-instructions の整合も合わせて確認すること。