# レポジトリ全体レビュー計画書

## 1. 目的

本計画書の目的は、Shos.NBodyProblemSimulator リポジトリ全体を横断レビューし、現行仕様、実装、テスト、AI 指示、README の整合性を確認したうえで、重大な欠落、仕様矛盾、回帰要因、テスト不足、保守性リスクを高信頼の所見として整理することである。

今回のレビューは、単なる感想や広義の改善案収集ではなく、以下を完了条件に含む。

- 対象範囲の棚卸し
- 観点ごとの確認順序の固定
- high-confidence findings の抽出
- 所見ごとの根拠提示
- 優先度付き報告
- 未確認範囲と残リスクの明示

本計画書は、実行担当が追加解釈なしでレビューを進められることを目的とする。そのため、対象範囲、観点、証拠基準、停止条件、成果物、最終報告形式まで固定する。

## 2. 対象範囲

対象は以下とする。

- [Sources](../Sources) 配下のアプリ実装全体
- [Tests](../Tests) 配下の Node テスト、Playwright テスト、補助スクリプト
- [Specifications](../Specifications) 配下の仕様書
- [Plans](../Plans) 配下の開発計画書、作業計画書
- [README.md](../README.md) と [README.ja.md](../README.ja.md)
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [.github/skills](../.github/skills) 配下の repository-specific skill
- [.github/prompts](../.github/prompts) 配下の repository-specific prompt

主対象は少なくとも以下を含む。

- [Sources/app](../Sources/app)
- [Sources/workers](../Sources/workers)
- [Sources/index.html](../Sources/index.html)
- [Sources/style.css](../Sources/style.css)
- [Tests/ui-acceptance.spec.mjs](../Tests/ui-acceptance.spec.mjs)
- [Tests/simulation-controller.test.mjs](../Tests/simulation-controller.test.mjs)
- [Specifications/n-body-problem-simulator-specification.md](../Specifications/n-body-problem-simulator-specification.md)

対象外は以下とする。

- [Sources/vendor/three.module.min.js](../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../Sources/vendor/three.core.min.js)
- 画像や生成済みアセットなどの第三者配布物または圧縮済み資産
- 実装修正そのもの
- 新機能提案だけで終わる仕様拡張議論

レビュー中に対象ファイルへ競合する変更が入った場合は、最新内容を読み直してから根拠を再判定し、既存変更を巻き戻さない。

## 3. 非交渉前提

- ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript の前提を維持する
- Three.js 実行時依存は [Sources/vendor/three.module.min.js](../Sources/vendor/three.module.min.js) と [Sources/vendor/three.core.min.js](../Sources/vendor/three.core.min.js) のローカル配布を前提とする
- 物理演算、描画、UI 制御、永続化は責務分離を前提にレビューする
- UI visible text は compact 表示を許容し、accessible name は正式名称を維持する契約を前提にする
- Validation はエラー時のみ表示する現行契約を前提にする
- Body settings は各 Body card を独立して開閉でき、同時に複数件を展開できる現行契約を前提にする
- localStorage、Generate、Reset、Worker fallback、2D fallback は現行仕様と実装の整合対象とする

## 4. レビュー目的別の観点

今回のレビューでは、少なくとも以下の観点をこの順で扱う。

1. 仕様と実装の矛盾
2. 実装とテストの矛盾
3. `.github` 配下の AI 指示と現行実装契約の矛盾
4. バグまたは将来の回帰要因
5. テスト不足または検証ギャップ
6. ドキュメント鮮度の問題
7. 保守性上の高リスク構造

レビューでは、まずバグ、リスク、回帰要因、テスト不足を優先し、単なるスタイル論争や好みの差は後順位とする。

## 5. 証拠基準

所見として採用してよいのは、少なくとも以下のいずれかで裏付けられるものに限る。

- 実装ファイル相互の整合比較
- 実装とテストの期待値比較
- 実装と仕様書の比較
- 実装と README の比較
- 実装と `.github` 指示の比較
- 複数箇所の一致した観測結果

所見として採用してはいけないものは以下とする。

- 根拠のない憶測
- 再現条件の見えない漠然とした不安
- 具体的な影響範囲を説明できない違和感
- 単に改善余地があるだけで故障や矛盾に結びつかない意見

## 6. 優先順位

優先順位は以下の順とする。

1. 仕様違反または UI 契約違反につながる high severity finding
2. 再現性、保存復元、状態遷移、物理安定性に関わる medium severity finding
3. テスト不足や将来回帰要因として強い根拠を持つ medium severity finding
4. ドキュメント鮮度や AI 指示不整合として将来誤誘導を生む low to medium severity finding
5. 純粋な整理提案や低優先度改善案

## 7. 実施手順

### フェーズ 0: 事前読込

作業内容:

- [.github/copilot-instructions.md](../.github/copilot-instructions.md) を読む
- 仕様書、README、直近の計画書、直近のレビュー報告を読む
- 既存の `.github/skills` と `.github/prompts` の repository-specific 指示を確認する

完了条件:

- 現行契約の前提が整理されている
- レビュー対象ごとの優先度が決まっている

### フェーズ 1: 対象棚卸し

作業内容:

- 対象ディレクトリと主要ファイルを列挙する
- どの領域をどの観点で確認するかを対応付ける
- 以下のレビュー区分を付ける
  - core runtime
  - rendering
  - persistence and validation
  - tests
  - documentation and instructions

完了条件:

- 棚卸し結果がある
- どの観点をどの領域で確認するか明示できる

### フェーズ 2: 実装横断レビュー

作業内容:

- Sources 配下を中心に、状態遷移、Generate、Seed、Body count、Integrator、Target、Trail、fallback、Worker 実行を確認する
- 物理演算、描画、UI、永続化の責務境界が破綻していないか確認する
- 仕様上の既定値、入力制約、表示ルール、保存対象との矛盾を探す

完了条件:

- 主要 runtime 契約の観測結果が整理されている
- 所見候補と根拠ファイルが紐付いている

### フェーズ 3: テストと文書の整合レビュー

作業内容:

- Tests の期待値が現行実装と一致しているか確認する
- README、仕様書、Plans、`.github` 配下の指示が現行契約と矛盾していないか確認する
- stale guidance による将来回帰リスクを抽出する

完了条件:

- 実装とテストの矛盾候補が整理されている
- 実装と文書の矛盾候補が整理されている

### フェーズ 4: 所見の絞り込み

作業内容:

- 低根拠の候補を落とす
- 似た所見は統合する
- severity を High / Medium / Low に整理する
- 各所見に Impact と Recommendation を付与する

完了条件:

- 高信頼所見だけが残っている
- 優先度順の findings 一覧ができている

### フェーズ 5: 報告書作成

作業内容:

- [Works/Reviews](../Works/Reviews) 配下にレビュー報告を作成する
- findings first の形式で記述する
- 未確認範囲、残リスク、次の確認候補を整理する

完了条件:

- 報告書が保存されている
- chat 上でも要点を短く報告できる

## 8. レビュー区分ごとの確認方針

### 8.1 Core runtime

- state shape
- simulationConfig normalization
- Generate、Start、Pause、Resume、Reset の遷移
- committedInitialState
- Seed と preset の再現性

### 8.2 Rendering

- Three.js 初期化
- 2D fallback 継続性
- Target の camera 解決
- Trail 表示制御
- overlay と controls の表示契約

### 8.3 Persistence and validation

- localStorage 保存対象
- hydration と migration
- invalid input 時の state 取り扱い
- fieldDrafts と canonical state の境界

### 8.4 Tests

- Node テストの主対象網羅
- UI acceptance の契約網羅
- 既知回帰点の固定化有無
- 実装修正に対して不足している回帰テスト

### 8.5 Documentation and instructions

- README
- 仕様書
- Plans
- `.github/copilot-instructions.md`
- `.github/skills`
- `.github/prompts`

## 9. 実行時の禁止事項

- 根拠なしの所見を報告に残すこと
- 調査途中の仮説を確定事項として書くこと
- 実装修正を無断で混ぜること
- vendor code をレビュー対象の中核に据えること
- 低優先度のスタイル指摘で高優先度所見を埋もれさせること
- 所見の severity を説明なしで付けること

## 10. 受け入れ基準

以下を満たした場合にレビュー完了とみなす。

1. 対象範囲が明示されている
2. 所見が findings first で優先度順に整理されている
3. 各所見に根拠ファイルまたは根拠比較対象がある
4. 各所見に Impact と Recommendation がある
5. 重大な未確認範囲があれば報告されている
6. 単なる感想ではなく、再現性または比較可能性がある所見に絞られている
7. レビュー報告が [Works/Reviews](../Works/Reviews) に保存されている

## 11. 最終報告要件

最終報告では少なくとも以下を含める。

1. 対象範囲
2. 棚卸し結果の要約
3. Findings
4. 未確認範囲または open questions
5. Residual Risk
6. Summary

## 12. 成果物

今回の作業で作成または更新する成果物は以下とする。

- 本計画書
- 実行用 prompt
- [Works/Reviews](../Works/Reviews) 配下のレビュー報告
- 必要に応じた確認ログまたは参照メモ

## 13. リスク

- 対象範囲が広いため、低優先度指摘が増えやすいリスク
- 実装、仕様、AI 指示のどれを正とするか曖昧な領域があるリスク
- recently fixed な箇所を stale document が再汚染するリスク
- 既知問題と未解決問題を混同するリスク

レビューでは、所見を high-confidence なものに絞り、まずバグ、仕様矛盾、回帰要因、テスト不足を優先する。
