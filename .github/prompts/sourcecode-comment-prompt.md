---
name: sourcecode-comment-plan-and-prompt
description: Create a concrete plan and an execution prompt for adding conservative English comments across Sources without changing behavior, architecture, or repository contracts.
argument-hint: Describe whether you want drafting, revision, or review of the comment-addition plan and prompt
agent: agent
---

# ソースコードコメント追加計画・実行プロンプト作成

## 役割と目的

あなたは、このリポジトリの Sources 配下に対する英語コメント追加作業を設計する担当です。

目的は、コードの意味や挙動を変えずに、新しい開発者が Sources 配下の責務分担と主要ロジックを短時間で把握できるよう、コメント追加作業の計画書と実行用 prompt を作成することです。

この prompt 自体では一括コメント追加を完了させることではなく、実装担当がそのまま着手できる粒度で、対象範囲、優先順位、禁止事項、完了条件を明確化してください。

## 最初に確認する資料

以下を最初に読んで前提を揃えてください。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)
- [README.md](../../README.md)

必要に応じて以下も確認してください。

- [Sources/app](../../Sources/app)
- [Sources/styles.css](../../Sources/styles.css)
- [Sources/index.html](../../Sources/index.html)
- [Tests](../../Tests)

## この作業で作成する成果物

以下の 2 つを新規作成してください。

1. Plans フォルダー配下の Markdown 計画書 1 件
2. .github/prompts フォルダー配下の Markdown 実行 prompt 1 件

ファイル名には日付と目的が分かる語を含めてください。

## 対象範囲

コメント追加作業の対象は、Sources 配下の以下です。

- すべての JavaScript
- すべての HTML
- すべての CSS

vendor code が Sources 配下に存在する場合は、圧縮済み配布物や第三者配布ファイルを編集対象から除外してください。

## コメント追加作業の必須要件

計画書と実行 prompt では、以下を明示してください。

1. すべての JavaScript ファイル先頭に、file responsibility が分かる短い英語ヘッダーコメントを追加すること
2. HTML には、主要レイアウトセクションや責務境界が読み取りにくい箇所にのみ、短い英語コメントを追加すること
3. CSS には、意図が読み取りにくい rule block、state-dependent styling、layout workaround、responsive 調整に限定して短い英語コメントを追加すること
4. 実装とズレる推測コメント、将来想定コメント、過度な逐語説明コメントを禁止すること
5. コメント文体は簡潔で保守的な英語に統一すること
6. コメント追加以外の変更は、整形または極小の構文修正に限ること

## コメント規則

計画書と実行 prompt には、少なくとも以下の規則を含めてください。

### JavaScript

- 各ファイル先頭に 1 行から 2 行程度の責務ヘッダーコメントを追加する
- 関数内部コメントは、読解コストが高い箇所に限定する
- 代入や return を言い換えるだけの自明コメントは禁止する
- runtime behavior、state contract、fallback、normalization、worker boundary など、誤読しやすい責務を優先して説明する

### HTML

- section、panel、toolbar、viewport、metrics など、レイアウト責務が分かりにくい境界を優先する
- DOM 構造をそのまま言い換えるだけのコメントは禁止する
- アクセシビリティ名や visible label の仕様と矛盾する説明を書かない

### CSS

- compact layout、breakpoint 調整、sticky 的な見え方、scroll 制御、overflow 回避など、意図が伝わりにくい箇所を優先する
- color や font-size を単に説明するコメントは禁止する
- 実装理由が読み取れるコメントだけを追加する

## 優先順位の決め方

計画書には、対象ファイルごとのコメント追加方針を短く整理してください。

優先順位は少なくとも以下の順で検討してください。

1. app entrypoint、state、controller、simulation loop、physics、renderer、worker boundary などの責務分離が重要な JavaScript
2. Sources/index.html の主要構造
3. Sources/styles.css の responsive / compact / layout 調整
4. その他の補助 JavaScript、HTML、CSS

## 実行 prompt に必ず含めること

実行 prompt には以下を明記してください。

1. 先に対象ファイルを棚卸しし、ファイルごとのコメント方針を短く整理すること
2. 高優先度ファイルから順にコメントを追加すること
3. コメント追加以外の変更を避けること
4. vendor file を編集しないこと
5. 不明な箇所は推測せず、既存コードの観測可能な責務だけを書くこと
6. 追加後に、どのファイルに何の説明を入れたかを簡潔に報告すること
7. 必要に応じてテストまたは差分確認を行うこと

## 禁止事項

以下を計画書と実行 prompt の両方に明記してください。

- 推測に基づく説明の追加
- 実装挙動を変更する修正
- public API や state shape の変更
- vendor code の編集
- 英語以外のコメント追加
- コメント追加に見せかけた大規模整形

## 受け入れ基準

計画書と実行 prompt は、少なくとも以下を満たす内容にしてください。

1. どのファイル群をどういう優先順位で進めるか判断できる
2. JavaScript、HTML、CSS それぞれのコメント方針が区別されている
3. 禁止事項が明確で、コメント追加以外の逸脱を防げる
4. 最終報告で何を報告すべきか分かる
5. 実装担当が追加で解釈せずに着手できる

## 最終報告の形式

最終報告では以下の順でまとめるよう、実行 prompt に明記してください。

1. 作成した計画書ファイル
2. 作成した実行 prompt ファイル
3. 対象ファイルの優先順位方針
4. コメント規則の要点
5. 禁止事項と完了条件

## 特に重視すること

- 新しい開発者が Sources 配下を読み始めたときに、責務分担を素早く把握できること
- 既存実装とズレない、保守的で短い英語コメントに限定すること
- 計画書と実行 prompt の両方が、そのまま次の担当者へ引き継げる具体性を持つこと
