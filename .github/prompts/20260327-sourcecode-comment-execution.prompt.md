---
name: sourcecode-comment-execution
description: Add conservative English comments across Sources to improve readability without changing behavior, repository contracts, or architecture.
argument-hint: Describe whether you want the full Sources comment pass or a subset such as app files, HTML, or CSS only
agent: agent
---

# ソースコードコメント追加実行プロンプト

## 役割と目的

あなたは、このリポジトリの Sources 配下に対して、実装挙動を変えずに英語コメントを追加する実装担当です。

目的は、[Plans/20260327-sourcecode-comment-plan.md](../../Plans/20260327-sourcecode-comment-plan.md) に従って、新しい開発者がファイル責務と主要な責務境界を短時間で把握できるようにすることです。

コメント追加以外の変更は最小限に抑え、観測可能な事実だけを書くことを最優先にしてください。

不確実な説明を埋めるくらいなら、コメントを追加しない判断を優先してください。

## 最初に確認する資料

以下を最初に読んで前提を揃えてください。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [Plans/20260327-sourcecode-comment-plan.md](../../Plans/20260327-sourcecode-comment-plan.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)
- [README.md](../../README.md)

必要に応じて以下も確認してください。

- [Sources/app](../../Sources/app)
- [Sources/workers](../../Sources/workers)
- [Sources/index.html](../../Sources/index.html)
- [Sources/style.css](../../Sources/style.css)
- [Tests](../../Tests)

## 対象範囲

対象は [Sources](../../Sources) 配下の以下です。

- すべての JavaScript
- すべての HTML
- すべての CSS

以下は編集してはいけません。

- [Sources/vendor/three.module.min.js](../../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../../Sources/vendor/three.core.min.js)
- その他の第三者配布物や圧縮済みファイル

## 絶対遵守事項

1. コードの意味や挙動を変えないこと
2. コメントは簡潔で保守的な英語に統一すること
3. 推測コメント、将来想定コメント、実装とズレる説明を入れないこと
4. コメント追加以外の変更は、整形または極小の構文修正に限ること
5. public API、state shape、DOM structure、style contract を実質変更しないこと
6. visible label、accessible name、validation 表示契約、renderer fallback 契約と矛盾する説明を書かないこと
7. 既に十分で正確なコメントがある箇所には、重複コメントを追加しないこと

## コメント追加ルール

### JavaScript

- すべての JavaScript ファイル先頭に、file responsibility が分かる短い英語ヘッダーコメントを追加する
- 関数内部コメントは、既存コードだけでは意図を取り違えやすい箇所に限定する
- 以下の責務境界を優先して説明する
  - state normalization
  - persistence boundary
  - simulation loop timing
  - worker message handling
  - renderer fallback
  - trail update と camera resolution
- 代入や return を言い換えるだけのコメントは禁止する
- 既に責務が明白な関数や短い補助処理には、内部コメントを追加しない判断を許容する

### HTML

- app shell、controls、viewport、metrics、status など、主要セクション境界が読み取りにくい箇所にだけコメントを追加する
- DOM を逐語説明するコメントは禁止する
- 明白な区画にはコメントを追加しない判断を許容する

### CSS

- compact layout、responsive adjustment、overflow 回避、viewport sizing、panel layout などの意図が読み取りにくい箇所にだけコメントを追加する
- 色やサイズを言い換えるだけのコメントは禁止する
- 単なる selector grouping や見た目の値の言い換えにはコメントを追加しない

## 作業開始前に必ず出す棚卸し結果

編集に入る前に、対象ファイルごとに少なくとも以下のいずれかへ分類してください。

- header only
- header + internal comments
- no change

この分類結果を基に優先順位を決め、no change としたファイルにも短い理由を持ってください。

## 実行順序

以下の順で進めてください。

1. Sources 配下の対象ファイルを棚卸しする
2. vendor code を除外する
3. ファイルごとに header only、header + internal comments、no change を短く整理する
4. 高優先度 JavaScript から順にコメントを追加する
5. [Sources/index.html](../../Sources/index.html) に主要構造コメントを追加する
6. [Sources/style.css](../../Sources/style.css) に layout / responsive 意図コメントを追加する
7. 残りの補助ファイルを処理する
8. 差分を確認し、コメント追加以外の変更を最小化する
9. 必要に応じて `npm test` または `npm run test:ui` を実行する
10. 更新内容をファイル単位で報告する

## 優先順位

優先順位は少なくとも以下の順にしてください。

1. `Sources/app` の entrypoint、state、controller、simulation、physics、renderer、worker boundary
2. `Sources/workers`
3. [Sources/index.html](../../Sources/index.html)
4. [Sources/style.css](../../Sources/style.css)
5. その他の補助ファイル

同優先度内では、責務境界の誤読リスクが高いファイルを先に処理してください。

## テストと確認

以下の方針で確認してください。

- コメント追加だけであれば、まず差分確認を優先する
- コメント追加に伴って構文や import 周辺を触れた場合は `npm test` を実行する
- HTML / CSS の編集で UI 契約に影響しうる懸念がある場合は `npm run test:ui` を実行する
- テストを実行しなかった場合も、その理由を最終報告で明記する
- コメントだけの変更でも、差分に不要な整形が混ざっていないかを確認する

## 完了条件

以下をすべて満たした場合に完了としてください。

1. 対象範囲の JavaScript に短い英語ヘッダーコメントが追加されている
2. HTML と CSS のコメントは必要箇所に限定されている
3. 実装とズレる推測コメントがない
4. vendor file を編集していない
5. コメント追加以外の差分が最小限である
6. どのファイルに何の説明を入れたかを簡潔に報告できる
7. no change としたファイルまたは区画について理由を説明できる

## 最終報告の形式

以下の順で報告してください。

1. 対象範囲と優先順位
2. 作業開始前の分類結果
3. 追加したコメントの方針
4. 更新したファイル一覧
5. 各ファイルに追加した説明の概要
6. no change としたファイルまたは区画の理由
7. 実行した確認内容
8. 未対応箇所があればその理由

## 禁止事項

- 推測に基づく説明の追加
- 仕様変更、ロジック変更、性能調整の混入
- public API や state shape の変更
- vendor code の編集
- 英語以外のコメント追加
- コメント追加に見せかけた大規模整形
- 憶測に基づいてコメント密度を埋めること
- コメント追加のために識別子名、DOM 構造、class 名を変更すること