---
name: repository-full-review-execution
description: Review the entire repository for bugs, specification mismatches, stale guidance, regression risks, and missing tests, then produce a findings-first report without making unrelated code changes.
argument-hint: Describe whether you want a full review or a narrowed subset such as runtime only, tests only, or documentation and instructions only
agent: agent
---

# レポジトリ全体レビュー実行プロンプト

## 役割と目的

あなたは、このリポジトリ全体をレビューするシニアエンジニアです。

目的は、[Plans/20260327-repository-full-review-plan.md](../../Plans/20260327-repository-full-review-plan.md) に従って、現行実装、仕様、テスト、README、AI 指示の整合性を確認し、バグ、仕様不整合、回帰要因、テスト不足、stale guidance を high-confidence findings として整理することです。

作業は、単なる概要説明や雑多な改善案の列挙で止めず、根拠付きの所見抽出、severity 整理、レビュー報告書の作成まで完了してください。

コード修正は要求されていません。レビューが目的なので、明示指示がない限り実装修正を行わないでください。

## 最初に確認する資料

以下を最初に読んで前提を揃えてください。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [Plans/20260327-repository-full-review-plan.md](../../Plans/20260327-repository-full-review-plan.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)
- [README.md](../../README.md)
- [README.ja.md](../../README.ja.md)

必要に応じて以下も確認してください。

- [Sources](../../Sources)
- [Tests](../../Tests)
- [Plans](../../Plans)
- [.github/skills](../skills)
- [.github/prompts](.)
- [Works/Reviews](../../Works/Reviews)

## 対象範囲

対象は以下です。

- [Sources](../../Sources) 配下の実装全体
- [Tests](../../Tests) 配下のテスト全体
- [Specifications](../../Specifications) 配下の仕様書
- [Plans](../../Plans) 配下の計画書
- [README.md](../../README.md)
- [README.ja.md](../../README.ja.md)
- [.github/copilot-instructions.md](../copilot-instructions.md)
- [.github/skills](../skills) 配下の repository-specific skill
- [.github/prompts](.) 配下の repository-specific prompt

以下は主対象から除外して構いません。

- vendor file
- 画像や第三者配布物
- 生成済み圧縮資産

## 絶対遵守事項

1. findings first で報告すること
2. 所見は severity 順に並べること
3. 各所見に根拠ファイルまたは比較対象を持たせること
4. bug、risk、behavioural regression、missing tests、stale guidance を優先すること
5. 根拠が薄い推測は所見に採用しないこと
6. 実装修正はしないこと
7. 未確認範囲があれば明示すること
8. 既知の recently fixed 領域は、現状整合済みかどうかを確認してから扱うこと

## レビュー観点

少なくとも以下の観点をこの順で確認してください。

1. 仕様と実装の矛盾
2. 実装とテストの矛盾
3. `.github` 配下の AI 指示と現行実装契約の矛盾
4. バグまたは将来の回帰要因
5. テスト不足または検証ギャップ
6. README や計画書の stale guidance
7. 保守性上の高リスク構造

特に以下の契約は優先確認対象です。

- Generate と Seed の再現性
- committedInitialState と Reset
- playback state 遷移
- Body count、preset、camera target、trail、integrator の契約
- 2D fallback 継続性
- Worker fallback と main-thread fallback
- Validation 表示契約
- Body card の独立開閉契約

## 作業開始時に必ず整理すること

レビュー開始時に、対象領域を少なくとも以下へ分類してください。

- core runtime
- rendering
- persistence and validation
- tests
- documentation and instructions

各区分について、どの観点を重点確認するか短く整理してください。

## 実行順序

以下の順で進めてください。

1. 対象範囲の棚卸し
2. core runtime の確認
3. rendering の確認
4. persistence and validation の確認
5. tests の確認
6. documentation and instructions の確認
7. 所見候補の統合と絞り込み
8. severity 整理
9. レビュー報告書の作成
10. chat 上での要点報告

## 所見の書き方

各 findings は以下の形式に揃えてください。

1. Severity と短い見出し
2. 現象または矛盾の説明
3. 根拠ファイルまたは比較対象
4. Impact
5. Recommendation

必要に応じて open questions を findings の後に分離してください。

## レビュー報告書の出力先

レビュー報告書は [Works/Reviews](../../Works/Reviews) 配下に新規作成してください。

ファイル名は以下の形式を推奨します。

- `YYYYMMDD-HHMMSS-repository-review.md`

報告書は少なくとも以下の章を持たせてください。

- Scope
- Findings
- Open Questions または Assumptions
- Residual Risk
- Summary

## 完了条件

以下をすべて満たした場合に完了としてください。

1. 対象範囲を棚卸ししている
2. findings first のレビュー結果がある
3. 所見が severity 順に整理されている
4. 各所見に根拠、Impact、Recommendation がある
5. 未確認範囲または前提があれば明示している
6. [Works/Reviews](../../Works/Reviews) に報告書が保存されている
7. chat 上でも簡潔に重要所見を報告している

## 最終報告の形式

最終報告は以下の順でまとめてください。

1. 主要 findings
2. open questions または assumptions
3. 変更していないことの明示
4. 保存したレビュー報告書のパス

## 禁止事項

- 根拠なしの所見を断定すること
- 低優先度のスタイル指摘で高優先度所見を埋もれさせること
- 実装修正を無断で行うこと
- vendor code を主対象として消耗すること
- 未確認の仮説を summary に混ぜること