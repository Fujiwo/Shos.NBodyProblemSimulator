# Sources 全体リファクタリング計画書

## 1. 目的

本計画書の目的は、[Sources/index.html](../Sources/index.html)、[Sources/style.css](../Sources/style.css)、[Sources/main.js](../Sources/main.js)、および [Sources/app](../Sources/app) 配下の JavaScript を対象として、現行仕様と UI 契約を維持したまま、責務分離、可読性、変更容易性、検証容易性を高めるための段階的リファクタリング計画を定義することにある。

今回のリファクタリングは動作品質の維持を前提とし、機能追加を主目的としない。仕様変更が必要な場合は、実装前に [Specifications/n-body-problem-simulator-specification.md](../Specifications/n-body-problem-simulator-specification.md) と関連文書を更新し、受け入れ基準を明示した上で着手する。

## 2. 対象範囲

対象は以下とする。

- [Sources/index.html](../Sources/index.html)
- [Sources/style.css](../Sources/style.css)
- [Sources/main.js](../Sources/main.js)
- [Sources/app](../Sources/app) 配下の全 JavaScript
- [Sources/data/default-bodies.js](../Sources/data/default-bodies.js)
- [Sources/workers/physics-worker.js](../Sources/workers/physics-worker.js)

対象外は以下とする。

- [Sources/vendor/three.module.min.js](../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../Sources/vendor/three.core.min.js)
- 画像アセットなどの非コードファイル
- 仕様変更が前提となる UI 文言変更や機能追加

`Sources/vendor/` 配下はローカル配布の third-party runtime asset であり、minified vendor code をリファクタリング対象に含めない。

## 3. 非交渉制約

- ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript を維持する
- React や外部状態管理ライブラリは導入しない
- 物理演算、描画、UI 制御、永続化の責務分離を維持または強化する
- Three.js 初期化失敗時は 2D fallback を継続し、status message で理由を示す契約を壊さない
- localStorage の保存復元契約、`committedInitialState` 契約、preset 再現性契約を壊さない
- compact controls、accessible name、validation 表示条件、Body card の独立開閉契約を壊さない
- 初期 Count 8、既定 Body データ、`system-center` の意味を壊さない

## 4. 現状構成の整理

現行の Sources 構成は以下の責務に分かれている。

- [Sources/index.html](../Sources/index.html): 画面骨格と DOM の static contract
- [Sources/style.css](../Sources/style.css): 全体レイアウト、panel、controls、viewport、metrics のスタイル
- [Sources/main.js](../Sources/main.js): エントリポイントと bootstrap 起動
- [Sources/app/bootstrap.js](../Sources/app/bootstrap.js): 初期化、store、UI、renderer、controller の組み立て
- [Sources/app/state-rules.js](../Sources/app/state-rules.js): persisted AppState の正規化境界
- [Sources/app/persistence-facade.js](../Sources/app/persistence-facade.js): localStorage への保存復元
- [Sources/app/simulation-controller.js](../Sources/app/simulation-controller.js): UI 操作と state mutation の統括
- [Sources/app/simulation-execution.js](../Sources/app/simulation-execution.js): execution mode と worker/inline 実行制御
- [Sources/app/simulation-loop.js](../Sources/app/simulation-loop.js): requestAnimationFrame ベースのループ制御
- [Sources/app/physics-engine.js](../Sources/app/physics-engine.js): 物理演算と積分
- [Sources/app/three-scene-host.js](../Sources/app/three-scene-host.js): Three.js scene/camera/mesh 更新
- [Sources/app/renderer-facade.js](../Sources/app/renderer-facade.js): renderer 切替と fallback 協調
- [Sources/app/ui-shell.js](../Sources/app/ui-shell.js): DOM 参照、描画、入力バインディング
- [Sources/app/layout-service.js](../Sources/app/layout-service.js): viewport/layout 調整
- [Sources/app/defaults.js](../Sources/app/defaults.js): 初期 state と default body 構築
- [Sources/app/preset-generator.js](../Sources/app/preset-generator.js): preset 生成と seed 再現性

リファクタリングではこの責務境界を起点に、責務のにじみ、重複、命名不整合、過大モジュール、DOM 依存の散在を削減する。

## 5. リファクタリング目標

### 5.1 保守性

- 1 ファイル内の責務を明確化し、主目的が 1 つに説明できないモジュールを分割する
- DOM 操作、state 変換、renderer 依存、persistence 依存を横断的に混在させない
- 命名規則を統一し、同義の概念を複数語で表現しない

### 5.2 安全性

- public contract を変える変更は必ず対応テストを更新する
- localStorage payload、runtime field draft、validation error の境界を壊さない
- `PERSISTENCE_POLICY` により、保存対象と非保存対象をコードと文書の両方で固定する
- Worker あり/なし双方で simulation pipeline time と playback state の整合を維持する

### 5.3 可読性

- 長大関数を意図ごとの private helper へ分解する
- 条件分岐は state transition、validation、renderer fallback などの観点でまとまりを持たせる
- CSS は design token、layout、component、state style の順に整理する

### 5.4 テスト容易性

- pure function 化できる処理は pure function として切り出す
- DOM 依存ロジックは selector 解決と描画ロジックを分ける
- fallback、normalization、preset reproducibility などの high-risk path に対するテスト追加余地を増やす

## 6. 受け入れ基準

以下をすべて満たした場合に、Sources 全体リファクタリングを完了とみなす。

1. `npm test` が成功する
2. `npm run test:ui` が成功する
3. HTML の data-role、data-action、data-field-*、data-body-* 契約が維持される
4. compact controls の visible text と accessible name 契約が維持される
5. validation はエラー時のみ表示される
6. Body card は独立して複数展開できる
7. `random-cluster` の seed 再現性契約が維持される
8. localStorage 破損時の正規化 fallback が維持される
9. Three.js 初期化失敗時に 2D fallback と status notice が維持される
10. 変更後の各主要モジュールについて責務を 1 文で説明できる

## 7. 実施方針

### 7.1 進め方

- 小さなバッチで進め、各バッチごとにテストを回す
- 仕様変更を伴わない内部整理を優先する
- 影響が広い変更は、先に plan と prompt の対象粒度を切り出し、1 回で巨大変更しない
- 既存コードの大規模整形だけを先行しない

### 7.2 変更の優先順位

1. state と persistence の境界
2. controller と execution の境界
3. renderer と UI shell の境界
4. HTML の semantic cleanup と selector contract の整理
5. CSS の token/component/layout 再編

高リスク領域から順に、root cause を見ながら分割する。

## 8. フェーズ計画

### フェーズ 0: ベースライン確認

作業内容:

- Sources 配下の責務マップを作る
- 各ファイルの export/import 関係、DOM 契約、state mutation 経路を整理する
- `npm test` と `npm run test:ui` を実行して現状グリーンを確認する

完了条件:

- 高リスク箇所の一覧がある
- 変更前のテスト成功結果を記録している

### フェーズ 1: エントリポイントと bootstrap の整理

作業内容:

- [Sources/main.js](../Sources/main.js) と [Sources/app/bootstrap.js](../Sources/app/bootstrap.js) の起動責務を明確化する
- bootstrap の依存注入、初期化順、エラーハンドリングを明文化する
- global へ露出する依存を最小化する

受け入れ基準:

- 起動順序がコードから読み取りやすい
- renderer/UI/controller/store の初期化責務が混線していない

### フェーズ 2: state、defaults、persistence の整理

作業内容:

- [Sources/app/defaults.js](../Sources/app/defaults.js)、[Sources/app/state-rules.js](../Sources/app/state-rules.js)、[Sources/app/persistence-facade.js](../Sources/app/persistence-facade.js) の責務境界を再確認する
- 初期 state 構築、payload 正規化、保存 I/O を相互独立に近づける
- normalization helper の pure function 化を進める

受け入れ基準:

- persisted payload の正規化入口が明確である
- fallback state 構築と storage I/O が分離されている
- `committedInitialState` の更新責務が一箇所で追える
- observability 用 lifecycle metadata が localStorage 保存対象へ混入しない

Phase 2 の persistence 境界では、少なくとも以下を保存対象に固定する。

- `appVersion`
- `bodyCount`
- `bodies`
- `simulationConfig`
- `uiState.selectedBodyId`
- `uiState.cameraTarget`
- `uiState.showTrails`
- `uiState.expandedBodyPanels`
- `committedInitialState`
- `playbackRestorePolicy`

Phase 2 の persistence 境界では、少なくとも以下を非保存対象に固定する。

- `runtime.lifecycleMetadata`
- `runtime.lifecycleNotice`
- `runtime.statusMessage`
- `runtime.executionNotice`
- `runtime.validationErrors`
- `runtime.fieldErrors`
- `runtime.fieldDrafts`
- `runtime.metrics`
- `runtime.simulationTime`
- trail の過去点列
- worker accumulator や pending request などの中間計算状態
- bootstrap fail-fast 時に部分初期化済み resource を cleanup して副作用を残さない

### フェーズ 3: preset と simulation control の整理

作業内容:

- [Sources/app/preset-generator.js](../Sources/app/preset-generator.js)、[Sources/app/simulation-controller.js](../Sources/app/simulation-controller.js)、[Sources/app/simulation-execution.js](../Sources/app/simulation-execution.js)、[Sources/app/simulation-loop.js](../Sources/app/simulation-loop.js) の責務を再整理する
- state transition、validation、generate、start/pause/resume/reset を helper 単位で切り出す
- inline execution と worker execution の分岐点を読みやすくする

受け入れ基準:

- playback state 遷移が関数単位で追跡できる
- generate と reset の committed state 契約が読み取りやすい
- worker/inline 分岐が controller へ過度に漏れていない

### フェーズ 4: renderer と viewport 周辺の整理

作業内容:

- [Sources/app/renderer-facade.js](../Sources/app/renderer-facade.js)、[Sources/app/three-scene-host.js](../Sources/app/three-scene-host.js)、[Sources/app/renderer-helpers.js](../Sources/app/renderer-helpers.js)、[Sources/app/layout-service.js](../Sources/app/layout-service.js) の境界を再整理する
- fallback 表示、texture 解決、camera target 解決、resize handling の責務を分離する
- `system-center` や selected body の camera target 解決を helper 化する

受け入れ基準:

- renderer fallback 条件と UI 通知条件が明確である
- Three.js 非依存 helper と Three.js 依存処理が分離されている
- resize と viewport 高さ調整の責務が分かる

### フェーズ 5: UI shell と HTML 契約の整理

作業内容:

- [Sources/index.html](../Sources/index.html) と [Sources/app/ui-shell.js](../Sources/app/ui-shell.js) の DOM 契約を整理する
- selector 文字列の散在を減らし、参照集合を意味単位でまとめる
- field rendering、validation rendering、body card rendering、metrics rendering を分離する
- semantic element の改善余地を確認する。ただしテスト契約を壊さない

受け入れ基準:

- data attribute 契約が一貫している
- UI 更新処理が入力、表示、状態同期に分かれている
- accessibility を損なわない

### フェーズ 6: CSS 再編

作業内容:

- [Sources/style.css](../Sources/style.css) を token、base、layout、panel、control、body-card、viewport、responsive rules のセクションに整理する
- 重複宣言と過剰な selector coupling を減らす
- 大きな見た目変更を避けつつ、命名と並び順を整える

受け入れ基準:

- セクションごとの責務が分かる
- breakpoints と compact layout の意図が追いやすい
- 既存 UI の見た目と可用性が回帰しない

### フェーズ 7: テスト補強と整合確認

作業内容:

- 変更した責務境界に対する Node テストまたは Playwright テストを追加・更新する
- 文書と実装のズレを確認する
- 不要コード、未使用 helper、死んだ branch を削除する

受け入れ基準:

- 追加したリファクタリングに対する回帰テストがある
- 仕様、README、prompt の参照先が最新の構成と矛盾しない

## 9. テスト方針

各フェーズで以下を実施する。

- pure function 化した処理は Node テストで確認する
- DOM 契約変更が入る場合は UI 契約テストまたは Playwright で確認する
- renderer fallback、persistence normalization、preset reproducibility は変更の有無に関わらず回帰確認対象に含める

重点確認項目:

- `random-cluster` の seed 空欄、固定 preset、invalid seed
- `bodyCount` と body card 表示件数の同期
- `running` / `paused` 中の入力 lock
- `system-center` と body target の camera 解決
- localStorage 破損時の fallback 復元
- compact layout と accessible name

## 10. リスクと対策

### 10.1 過大リファクタリング

リスク:

- 1 回の変更量が大きすぎて root cause を追えなくなる

対策:

- フェーズごとに commit 相当の塊で作業し、毎回テストを回す

### 10.2 責務再配置による回帰

リスク:

- controller、renderer、persistence 間の暗黙依存が壊れる

対策:

- 既存テストを先に通し、責務移動後に同一観点を再検証する

### 10.3 CSS の副作用

リスク:

- selector の並び替えや共通化で mobile layout や overlay が崩れる

対策:

- compact layout、header、control strip、viewport height の UI テストを回す

### 10.4 vendor code への誤編集

リスク:

- `Sources/vendor` 配下の third-party code を変更して保守不能になる

対策:

- vendor を明示的に対象外へ固定する

## 11. 実行時の判断ルール

- 振る舞いを変えない変更を優先する
- 仕様差分を見つけた場合は、実装修正前に文書更新要否を判断する
- 変更理由を「責務分離」「重複削減」「命名統一」「テスト容易性」のどれかで説明できない変更は避ける
- minified code の整形や cosmetic rename のみで終わる変更は避ける

## 12. 成果物

本計画に基づく実行フェーズでは、少なくとも以下を成果物とする。

- Sources 配下の対象コードの段階的リファクタリング
- 必要なテスト追加または更新
- 必要に応じた文書更新
- 変更理由と検証結果の要約