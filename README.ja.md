# Shos.NBodyProblemSimulator

[English README](README.md)

![Browser](https://img.shields.io/badge/runtime-browser%20only-1f6feb?style=flat-square)
![Web Worker](https://img.shields.io/badge/compute-Web%20Worker-bb6c2f?style=flat-square)
![Playwright](https://img.shields.io/badge/tested%20with-Playwright-2ead33?style=flat-square&logo=playwright&logoColor=white)
[![Live Demo](https://img.shields.io/badge/demo-live%20site-0a7f5a?style=flat-square&logo=googlechrome&logoColor=white)](https://www2.shos.info/shosnbody/)

HTML5、CSS3、Vanilla JavaScript、Three.js で構築された、ブラウザ専用の 3 次元 N 体問題シミュレーターです。

## 公開サンプル

- [https://www2.shos.info/shosnbody/](https://www2.shos.info/shosnbody/)
- 公開サンプルは、現在のシミュレーターをブラウザ上で配信したものです。ローカルセットアップなしで、現行 UI、描画モード、再生操作の流れを確認できます。

### 実行イメージ

![公開サンプルの実行イメージ](README-assets/shos-nbody.png)

## アーキテクチャ

実行時は、物理計算、描画、UI 更新、永続化を分離し、メインスレッド経路と Worker 経路が同じアプリケーション状態の流れを共有する構成にしています。

```mermaid
flowchart TD
	利用者操作[利用者操作] --> UI操作[UIシェルと操作パネル]
	UI操作 --> 制御[シミュレーション制御]
	制御 --> ループ[シミュレーションループ]
	制御 --> 描画[描画ファサード]

	subgraph 状態管理系[状態管理系]
		状態[アプリ状態ストア]
		初期化[Bootstrap 初期化]
		永続化[永続化とlocalStorage]
	end

	subgraph 物理計算系[物理計算系]
		ループ --> 主経路[メインスレッド物理計算経路]
		ループ --> Worker経路[Worker物理計算経路]
		主経路 --> 物理[物理エンジン]
		Worker経路 --> Worker実行器[Worker実行器]
		Worker実行器 --> 物理Worker[物理Workerスクリプト]
		Worker実行器 -- worker fallback 検知 --> 主経路
	end

	subgraph 描画系[描画系]
		描画 --> 描画方式{描画方式}
		描画方式 --> Three描画[Three.jsテクスチャ描画]
		描画方式 --> 二次元描画[2Dフォールバック描画]
		Three描画 --> Threeホスト[Three.jsシーンホスト]
		Threeホスト --> テクスチャ[Sources/images のローカルテクスチャ]
		Threeホスト --> ビューポート[ビューポートCanvas]
		二次元描画 --> ビューポート
	end

	制御 --> 状態
	制御 -- 保存 --> 永続化
	永続化 -- 初回復元 --> 初期化
	初期化 --> 状態
	物理 --> 状態
	物理Worker --> 状態
	状態 --> UI操作
	状態 --> 描画
```

永続化への書き込みは store からの自動保存ではなく、controller 境界を通して行われます。初回復元は bootstrap が担当し、定常時の store 更新経路に入る前に状態へ反映されます。

## 動作概要

- 現在の既定実行経路は、Velocity Verlet を既定の積分法とするメインスレッド実行です。
- 現在の実装では、RK4 比較、Worker 実行経路、シミュレーション処理時間の検証も利用できます。
- 検証時は `?execution=main` または `?execution=worker` を使うことで、永続化されない実行方式の上書きができます。
- Three.js は Sources/vendor 配下のローカル配布ファイルから読み込みます。
- body 用テクスチャは Body.name を正規化した値に基づいて Sources/images から読み込まれます。
- Three.js の初期化に失敗した場合でも、アプリは 2D フォールバックモードで継続利用でき、ステータスメッセージにテクスチャ付き body が使えない理由を表示します。
- 既定の初期状態は Count 8 で、Sources/data/default-bodies.js に同梱された body データセットを使います。Data/nbodies.csv は実行時には読み込みません。
- Target option の `System Center` は全 body の質量中心を追跡し、total mass が 0 の場合のみ average position にフォールバックします。
- 現在の既定 preset 一覧は `binary-orbit`、`sample`、`random-cluster` です。
- `sample` preset は Sources/data/default-bodies.js の固定データセットを適用します。
- `random-cluster` はより広い生成範囲を使います。mass は `0.05` から `120.00`、radius は `6.00`、minimum body distance は `0.80`、tangent speed は `0.30` から `1.40`、per-axis velocity jitter は最大 `0.25` です。

## 永続化方針

- localStorage は固定キー `nbody-simulator.state` を使用します。
- 永続化フィールド方針は、永続化対象フィールドと非永続化フィールドを実装、仕様書、計画書の間で整合させます。

永続化対象フィールド:

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

非永続化フィールド:

- `runtime.lifecycleMetadata`
- `runtime.lifecycleNotice`
- `runtime.statusMessage`
- `runtime.executionNotice`
- `runtime.validationErrors`
- `runtime.fieldErrors`
- `runtime.fieldDrafts`
- `runtime.metrics`
- `runtime.simulationTime`
- 軌跡履歴の点配列
- worker accumulators や pending requests などの中間計算状態

- `runtime.lifecycleMetadata` と `runtime.lifecycleNotice` は観測用の実行時値であり、各起動時に再注入されます。
- `playbackState = running` と `playbackState = paused` は永続化されません。reload 時は常に `playbackRestorePolicy = restore-as-idle` を通じて `idle` に正規化されます。

## UI

- header には app title、playback state、runtime status message を表示します。
- header はコンパクトに保ち、viewport が縦方向の大部分を確保できるようにしています。
- header の補助説明文は small と medium layout では隠され、wide desktop layout のみ再表示されます。
- controls panel は全 breakpoint で header の直下に配置され、large layout では body editor と viewport row の上にあるコンパクトな full-width strip になります。
- controls panel は Count、dt、Soft、Target、Trail のような compact visible labels を使い、正式名称は title または aria-label に保持します。
- UI に表示する実数値は小数第 2 位までに丸めます。
- Seed field は `random-cluster` のとき blank なら `auto on Gen` を表示し、次の Generate で自動 seed が割り当てられることを示します。
- playback buttons は Gen、Run、Hold、Go、Reset のような compact visible text を使います。
- Validation はエラーがないときは非表示で、invalid input がある場合だけ強調表示します。
- Body settings は各 body card ごとに Open または Closed toggle を持ち、複数の body editor を同時に開いたままにできます。
- visualization stage は、非インタラクティブな UI よりも canvas 領域を優先するため、意図的に高さを大きめにしています。
- visualization height は mobile、tablet、desktop、wide desktop の各 breakpoint に応じて段階的に変化します。
- simulation metrics overlay は desktop と wide desktop で viewport を占有しすぎないよう、意図的にコンパクトにしています。

## ローカルセットアップ

1. `npm install` を実行します。
2. `npm run vendor:three` を実行します。
3. Sources を HTTP 経由で配信します。
4. ローカルサーバー経由で Sources/index.html を開きます。

## Minified バンドル生成

- `npm run build:min` を実行すると、worker を維持した最小化済み runtime を生成します。
- 生成物は [Dist/index.html](Dist/index.html)、[Dist/main.min.js](Dist/main.min.js)、[Dist/physics-worker.min.js](Dist/physics-worker.min.js)、[Dist/style.css](Dist/style.css)、[Dist/images](Dist/images) です。
- source entry files を変更せず、配布専用 directory として bundle 済み runtime を使いたい場合は [Dist/index.html](Dist/index.html) を利用します。
- `npm run build:min:clean` を実行すると、生成された Dist directory と、以前 Sources 配下に出力していた旧最小化ファイルを削除します。

### Dist の配信

1. `npm run build:min` を実行します。
2. Dist をドキュメントルートとする静的 HTTP サーバーを起動します。
3. ブラウザで `http://localhost:<port>/index.html` を開きます。
4. モジュール読み込みと Worker 起動は HTTP 実行を前提としているため、Dist/index.html を `file:///` URL で直接開かないでください。

Node を使う例:

```bash
npx serve Dist
```

Python を使う例:

```bash
python -m http.server 8080 --directory Dist
```

PowerShell を使う例:

```powershell
Set-Location Dist; python -m http.server 8080
```

## テスト

- `npm test` を実行すると、静的なコンパクト UI 確認を含む Node ベースの回帰テストを実行します。
- Playwright が使う Chromium browser をインストールするには、一度だけ `npm run test:ui:install` を実行します。
- `npm run test:ui` を実行すると、ローカル静的サーバーを使った実ブラウザ UI 受け入れテストを実行します。
- `npm run benchmark:phase4` を実行すると、`?execution=main` と `?execution=worker` を比較する 60 秒の比較処理を実行します。
- ベンチマーク結果は Works/benchmarks/phase4/ に、時刻付きの *.raw.json、*.ci.json、および latest.raw.json、latest.ci.json として保存されます。

### ベンチマーク比較手順

1. ベンチマーク前に `npm run test` を実行し、単体テストと結合テストを検証します。
2. `npm run test:ui` を実行し、コンパクト UI 条件が実ブラウザでも維持されていることを確認します。
3. `npm run benchmark:phase4` を実行し、固定ベンチマーク条件でブラウザ計測処理を起動します。
4. 全シナリオの詳細計測には latest.raw.json を使い、安定した CI 比較用キーには latest.ci.json を使います。
5. 短時間確認が必要な場合だけ `BENCHMARK_DURATION_MS` を上書きし、受け入れ用計測では既定の 60000ms を維持します。

### execution=worker 比較手順

1. まず `?execution=main` でアプリを開き、現在の基準結果を取得します。
2. 次に `?execution=worker` でアプリを開き、同じ preset、body count、integrator 条件で Worker 実行経路を強制します。
3. 受け入れ条件では `random-cluster`、`bodyCount = 10`、`Integrator = Verlet`、`Trail = on`、camera interaction なしを使用します。
4. Worker 実行経路が実行時に失敗した場合、アプリは自動的に main-thread 実行経路へ切り替わり、status message でフォールバックを報告します。
5. フォールバック message が出た場合は Worker ベンチマーク失敗として扱い、Worker を既定経路候補と見なす前に原因を調査してください。
6. CI では latest.ci.json を使用し、summary.overallStatus、checks.workerFallbackDetected、comparison 配下の比較結果オブジェクトを評価します。

### コンパクト UI 確認項目

- 表示上の control text は Count、dt、Soft、Target、Trail、Gen、Run、Hold、Go、Reset のまま維持されます。
- visible text を短縮していても、interactive controls は aria-label を通じて正式な accessible name を保持します。
- Validation は form が valid な間は hidden で、invalid input がある場合だけ表示されます。
- Body settings は body ごとの Open または Closed toggle を維持し、複数の body editor を同時に開いたままにできます。
- 幅 360px でも compact controls は horizontal overflow なしで利用可能である必要があります。
- running と paused の playback state 中は、body editing inputs は disabled のままです。

## リポジトリ規約

- Runtime Three.js files は Sources/vendor に保持します。
- 現在 vendored されている browser bundles は Sources/vendor/three.module.min.js と Sources/vendor/three.core.min.js です。
- Three.js を更新する場合は、npm dependency と vendored files を必ず同時に更新してください。

## Three.js vendor ファイル更新

1. `npm run three:update` を実行します。

手動更新の代替手順:

1. `npm install three@desired-version` を実行します。
2. `npm run vendor:three` を実行します。
3. 必要なら `npm run vendor:three:verify` を実行します。
4. `npm test` を実行します。