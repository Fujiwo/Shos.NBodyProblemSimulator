# Shos.NBodyProblemSimulator

[English README](README.md)

HTML5、CSS3、Vanilla JavaScript、Three.js で構築された、ブラウザ専用の 3D N-body problem simulator です。

## Runtime

- 現行のベースラインは、Velocity Verlet を既定の integrator とする main-thread simulation path を使用します。
- Phase 4 以降では、RK4 comparison、Worker execution paths、simulation pipeline time validation が現行ベースラインに追加されています。
- 検証時は `?execution=main` または `?execution=worker` を使うことで、永続化されない simulation backend override ができます。
- Three.js は Sources/vendor 配下のローカル配布ファイルから読み込みます。
- Body texture は Body.name を正規化した値に基づいて Sources/images から解決されます。
- Three.js の初期化に失敗した場合でも、アプリは 2D fallback mode で継続利用でき、status message に texture-backed bodies が使えない理由を表示します。
- 既定の startup state は Count 8 で、Sources/data/default-bodies.js に同梱された body dataset を使います。Data/nbodies.csv は実行時には読み込みません。
- Target option の `System Center` は全 body の center of mass を追跡し、total mass が 0 の場合のみ average position に fallback します。
- 現行の baseline preset list は `binary-orbit`、`sample`、`random-cluster` です。
- `sample` preset は Sources/data/default-bodies.js の固定 dataset を適用します。
- `random-cluster` はより広い生成範囲を使います。mass は `0.05` から `120.00`、radius は `6.00`、minimum body distance は `0.80`、tangent speed は `0.30` から `1.40`、per-axis velocity jitter は最大 `0.25` です。

## Persistence policy

- localStorage は固定キー `nbody-simulator.state` を使用します。
- `PERSISTENCE_POLICY` は、persisted fields と non-persisted fields を implementation、specification、plans 間で整合させます。

Persisted fields:

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

Non-persisted fields:

- `runtime.lifecycleMetadata`
- `runtime.lifecycleNotice`
- `runtime.statusMessage`
- `runtime.executionNotice`
- `runtime.validationErrors`
- `runtime.fieldErrors`
- `runtime.fieldDrafts`
- `runtime.metrics`
- `runtime.simulationTime`
- trail history point arrays
- worker accumulators や pending requests などの intermediate computation state

- `runtime.lifecycleMetadata` と `runtime.lifecycleNotice` は observability 専用の runtime values であり、各 startup 時に再注入されます。
- `playbackState = running` と `playbackState = paused` は永続化されません。reload 時は常に `playbackRestorePolicy = restore-as-idle` を通じて `idle` に正規化されます。

## UI

- header には app title、playback state、runtime status message を表示します。
- header は compact に保ち、viewport が縦方向の大部分を確保できるようにしています。
- header の helper copy は small と medium layout では隠され、wide desktop layout のみ再表示されます。
- controls panel は全 breakpoint で header の直下に配置され、large layout では body editor と viewport row の上にある compact な full-width strip になります。
- controls panel は Count、dt、Soft、Target、Trail のような compact visible labels を使い、正式名称は title または aria-label に保持します。
- UI に表示する実数値は小数第 2 位までに丸めます。
- Seed field は `random-cluster` のとき blank なら `auto on Gen` を表示し、次の Generate で自動 seed が割り当てられることを示します。
- playback buttons は Gen、Run、Hold、Go、Reset のような compact visible text を使います。
- Validation はエラーがないときは非表示で、invalid input がある場合だけ強調表示します。
- Body settings は各 body card ごとに Open または Closed toggle を持ち、複数の body editor を同時に開いたままにできます。
- visualization stage は、非インタラクティブな UI よりも canvas 領域を優先するため、意図的に高さを大きめにしています。
- visualization height は mobile、tablet、desktop、wide desktop の各 breakpoint に応じて段階的に変化します。
- simulation metrics overlay は desktop と wide desktop で viewport を占有しすぎないよう、意図的に compact にしています。

## Local setup

1. `npm install` を実行します。
2. `npm run vendor:three` を実行します。
3. Sources を HTTP 経由で配信します。
4. ローカルサーバー経由で Sources/index.html を開きます。

## Minified bundle build

- `npm run build:min` を実行すると、worker を維持した minified runtime を生成します。
- 生成物は [Dist/index.html](Dist/index.html)、[Dist/main.min.js](Dist/main.min.js)、[Dist/physics-worker.min.js](Dist/physics-worker.min.js)、[Dist/style.css](Dist/style.css)、[Dist/images](Dist/images) です。
- source entry files を変更せず、distribution-only directory として bundled runtime を使いたい場合は [Dist/index.html](Dist/index.html) を利用します。
- `npm run build:min:clean` を実行すると、生成された Dist directory と、以前 Sources 配下に出力していた legacy minified files を削除します。

### Serving Dist

1. `npm run build:min` を実行します。
2. Dist を document root とする static HTTP server を起動します。
3. ブラウザで `http://localhost:<port>/index.html` を開きます。
4. module loading と Worker startup は HTTP 実行を前提としているため、Dist/index.html を `file:///` URL で直接開かないでください。

Example using Node:

```bash
npx serve Dist
```

Example using Python:

```bash
python -m http.server 8080 --directory Dist
```

Example using PowerShell:

```powershell
Set-Location Dist; python -m http.server 8080
```

## Testing

- `npm test` を実行すると、static compact UI contract checks を含む Node-based regression suite を実行します。
- Playwright が使う Chromium browser をインストールするには、一度だけ `npm run test:ui:install` を実行します。
- `npm run test:ui` を実行すると、local static server を使った real-browser UI acceptance coverage を実行します。
- `npm run benchmark:phase4` を実行すると、`?execution=main` と `?execution=worker` を比較する 60-second comparison harness を実行します。
- benchmark output は Works/benchmarks/phase4/ に、timestamped な *.raw.json、*.ci.json、および latest.raw.json、latest.ci.json として保存されます。

### Phase 4 comparison workflow

1. benchmark 前に `npm run test` を実行し、unit と integration suite を検証します。
2. `npm run test:ui` を実行し、compact UI contract が real browser でも維持されていることを確認します。
3. `npm run benchmark:phase4` を実行し、固定 benchmark condition で browser harness を起動します。
4. 全シナリオの詳細計測には latest.raw.json を使い、安定した CI comparison key には latest.ci.json を使います。
5. 短い smoke run が必要な場合だけ `BENCHMARK_DURATION_MS` を上書きし、acceptance measurement では既定の 60000ms を維持します。

### execution=worker comparison steps

1. まず `?execution=main` でアプリを開き、現在の baseline result を取得します。
2. 次に `?execution=worker` でアプリを開き、同じ preset、body count、integrator 条件で Worker backend を強制します。
3. acceptance condition では `random-cluster`、`bodyCount = 10`、`Integrator = Verlet`、`Trail = on`、camera interaction なしを使用します。
4. Worker backend が runtime で失敗した場合、アプリは自動的に main-thread backend へ切り替わり、status message で fallback を報告します。
5. fallback message が出た場合は Worker benchmark run 失敗として扱い、Worker を preferred backend と見なす前に原因を調査してください。
6. CI では latest.ci.json を使用し、summary.overallStatus、checks.workerFallbackDetected、comparison 配下の metric comparison objects を評価します。

### Compact UI contract checks

- compact visible control text は Count、dt、Soft、Target、Trail、Gen、Run、Hold、Go、Reset のまま維持されます。
- visible text を短縮していても、interactive controls は aria-label を通じて正式な accessible name を保持します。
- Validation は form が valid な間は hidden で、invalid input がある場合だけ表示されます。
- Body settings は body ごとの Open または Closed toggle を維持し、複数の body editor を同時に開いたままにできます。
- 幅 360px でも compact controls は horizontal overflow なしで利用可能である必要があります。
- running と paused の playback state 中は、body editing inputs は disabled のままです。

## Repository conventions

- Runtime Three.js files は Sources/vendor に保持します。
- 現在 vendored されている browser bundles は Sources/vendor/three.module.min.js と Sources/vendor/three.core.min.js です。
- Three.js を更新する場合は、npm dependency と vendored files を必ず同時に更新してください。

## Updating Three.js vendor files

1. `npm run three:update` を実行します。

Manual alternative:

1. `npm install three@desired-version` を実行します。
2. `npm run vendor:three` を実行します。
3. 必要なら `npm run vendor:three:verify` を実行します。
4. `npm test` を実行します。