---
name: sources-refactoring
description: Refactor the repository's Sources HTML, CSS, and JavaScript incrementally while preserving runtime behavior, UI contracts, persistence contracts, and renderer fallback behavior. Japanese triggers: Sources リファクタリング, HTML CSS JS 整理, 責務分離, 可読性改善.
argument-hint: Describe the target refactoring scope, preferred phase, or any areas to prioritize or exclude
agent: agent
---

# Sources 全体リファクタリング実行プロンプト

## 役割と目的

あなたは、このリポジトリの Sources 配下を段階的にリファクタリングする実装エンジニアです。
目的は、[Plans/20260326-sources-refactoring-plan.md](../../Plans/20260326-sources-refactoring-plan.md) に従って、HTML、CSS、JavaScript の構造を改善しつつ、現行仕様、UI 契約、保存復元契約、renderer fallback 契約を壊さずに保守性を高めることです。

作業は調査だけで止めず、対象フェーズに必要なコード修正、テスト更新、再実行、結果確認まで完了させてください。

## 最初に確認する資料

以下を最初に読み、前提を揃えてください。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [Plans/20260326-sources-refactoring-plan.md](../../Plans/20260326-sources-refactoring-plan.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。

- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)
- [.github/skills/n-body-testing-and-validation/SKILL.md](../skills/n-body-testing-and-validation/SKILL.md)
- [.github/skills/n-body-state-persistence/SKILL.md](../skills/n-body-state-persistence/SKILL.md)
- [.github/skills/n-body-threejs-rendering/SKILL.md](../skills/n-body-threejs-rendering/SKILL.md)

## 対象範囲

リファクタリング対象は以下とします。

- [Sources/index.html](../../Sources/index.html)
- [Sources/style.css](../../Sources/style.css)
- [Sources/main.js](../../Sources/main.js)
- [Sources/app](../../Sources/app) 配下の JavaScript
- [Sources/data/default-bodies.js](../../Sources/data/default-bodies.js)
- [Sources/workers/physics-worker.js](../../Sources/workers/physics-worker.js)

対象外は以下です。

- [Sources/vendor/three.module.min.js](../../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../../Sources/vendor/three.core.min.js)
- 画像やその他の非コードアセット

`Sources/vendor/` は third-party runtime asset なので編集してはいけません。

## 絶対遵守事項

1. 仕様未合意の機能追加をしないこと
2. React や外部状態管理ライブラリを導入しないこと
3. 物理演算、描画、UI 制御、永続化の責務分離を弱めないこと
4. public contract を変更する時は対応テストと文書を同時更新すること
5. `random-cluster` の再現性契約を壊さないこと
6. localStorage の hydration と normalization 契約を壊さないこと
7. Three.js 初期化失敗時の 2D fallback 継続と status message 契約を壊さないこと
8. compact controls、accessible name、validation 表示条件、Body card 複数展開契約を壊さないこと
9. `system-center` は全 Body の重心であり、総質量 0 の場合のみ位置平均へフォールバックすることを維持すること
10. 初期 Count 8 と bundled default body data の契約を維持すること

## 実行順序

以下の順で進めてください。

1. 現状把握
2. 対象フェーズの切り出し
3. 小さな単位でのリファクタリング
4. 対応テストの追加または更新
5. `npm test` 実行
6. `npm run test:ui` 実行
7. 文書整合確認
8. 結果報告

## 現状把握で必ず行うこと

1. 対象ファイルの責務を要約する
2. import/export 関係を確認する
3. DOM 契約、state mutation 経路、persistence 境界、renderer fallback 経路を確認する
4. `npm test` と `npm run test:ui` を実行してベースラインを確認する

ベースラインが失敗している場合は、その失敗を記録した上で、今回のリファクタリング対象と既存不具合を区別してください。

## 優先リファクタリング観点

### 1. state と persistence の境界

以下を確認してください。

- fallback state 構築と storage I/O が混ざっていないか
- normalization helper を pure function 化できるか
- `committedInitialState` の更新責務が追跡しやすいか

### 2. controller と execution の境界

以下を確認してください。

- playback state 遷移が読みやすいか
- generate、start、pause、resume、reset の責務が整理されているか
- worker/inline 分岐が controller に漏れすぎていないか

### 3. renderer と layout の境界

以下を確認してください。

- Three.js 依存処理と非依存 helper が分かれているか
- fallback 条件と通知条件が明確か
- resize handling と viewport 高さ調整が分離されているか

### 4. UI shell と HTML 契約

以下を確認してください。

- data-role、data-action、data-field-*、data-body-* が一貫しているか
- selector 解決、イベント束ね、描画更新が分かれているか
- semantic cleanup をしてもテスト契約を壊さないか

### 5. CSS 構造

以下を確認してください。

- token、base、layout、component、state style が整理されているか
- 重複 selector や過剰な coupling がないか
- mobile first と large layout の意図が明確か

## フェーズ分割ルール

1 回で Sources 全体を作り直さないでください。以下のどれか 1 フェーズ、または密結合な 2 フェーズまでに限定して進めてください。

1. エントリポイントと bootstrap
2. state、defaults、persistence
3. preset、controller、execution、loop
4. renderer、layout、viewport
5. UI shell と HTML 契約
6. CSS 再編
7. テスト補強と不要コード削除

フェーズ選定理由を最初に明示してください。

## テスト更新ルール

変更に応じて以下を実施してください。

- pure function 化した処理は Node テストを追加または更新する
- DOM 契約変更がある場合は UI テストまたは Playwright を更新する
- renderer fallback、seed 契約、persistence normalization、Body card multi-open は回帰確認対象に含める

最低確認項目は以下です。

- `random-cluster` の empty seed と invalid seed
- fixed preset の seed 表示契約
- `bodyCount` と body card 件数の同期
- `running` / `paused` 中の入力 lock
- `system-center` の camera target 解決
- localStorage 破損時の fallback
- compact controls と accessible name

## 文書更新ルール

仕様または契約に関わる変更をした場合のみ、必要最小限で以下を更新してください。

- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)
- [README.md](../../README.md)
- 関連する plan または prompt

内部実装のみの整理で仕様差分がなければ、文書を不用意に変更しないでください。

## 完了条件

以下をすべて満たした場合のみ、対象フェーズのリファクタリングを完了としてください。

1. 変更理由を責務分離、重複削減、命名統一、テスト容易性のいずれかで説明できる
2. `npm test` が成功する
3. `npm run test:ui` が成功する
4. 既存 UI 契約と保存復元契約が回帰していない
5. 変更ファイル、追加または更新したテスト、検証結果を簡潔に説明できる

## 最終報告の形式

以下の順で報告してください。

1. 対象フェーズ
2. 変更したファイル
3. リファクタリング内容
4. 追加または更新したテスト
5. 実行コマンドと結果
6. 残課題または次フェーズ候補

## 禁止事項

- vendor code の編集
- 一度に広範囲へ手を入れる大規模 rewrite
- テスト未実行のまま完了扱いにすること
- 仕様変更があるのに文書更新を省略すること
- cosmetic rename のみで大きな変更として扱うこと