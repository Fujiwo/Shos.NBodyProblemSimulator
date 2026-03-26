# ソースコードコメント追加計画書

## 1. 目的

本計画書の目的は、Sources 配下の JavaScript、HTML、CSS に対して、コードの意味や挙動を変えずに保守的な英語コメントを追加し、新しい開発者が責務分担と読み始める順序を素早く把握できる状態にすることである。

今回の作業では、実装変更ではなく可読性向上を対象とする。コメントは既存コードから観測可能な責務、状態契約、描画境界、UI 構造、レイアウト意図に限定し、推測や将来想定を書かない。

この計画書は、実装担当が追加解釈なしで着手できることを目的とする。そのため、対象判定、編集停止条件、確認手順、最終報告の粒度まで明示する。

## 2. 対象範囲

対象は以下とする。

- [Sources](../Sources) 配下のすべての JavaScript
- [Sources](../Sources) 配下のすべての HTML
- [Sources](../Sources) 配下のすべての CSS

主対象は少なくとも以下を含む。

- [Sources/app](../Sources/app)
- [Sources/workers](../Sources/workers)
- [Sources/index.html](../Sources/index.html)
- [Sources/style.css](../Sources/style.css)

対象外は以下とする。

- [Sources/vendor/three.module.min.js](../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../Sources/vendor/three.core.min.js)
- 画像、json、その他の非コードアセット
- コメント追加と無関係なロジック修正や仕様変更

作業中に対象ファイルへ競合する変更が入った場合は、最新内容を読み直したうえでコメント追加方針を再判定し、既存変更を巻き戻さない。

## 3. 非交渉制約

- ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript の前提を維持する
- 物理演算、描画、UI 制御、永続化の責務分離をコメント上でも崩さない
- `sample`、`binary-orbit`、`random-cluster` の preset 契約を推測で書き換えない
- localStorage、hydration、validation、fallback、worker 実行などの契約は既存コードから観測可能な範囲だけを説明する
- コメント追加以外の変更は、整形または極小の構文修正に限る
- 英語コメント以外は追加しない
- 既に十分で正確なコメントが存在する箇所には、重複コメントを追加しない
- 事実かどうか断定できない説明は追加しない。迷う場合は書かないことを優先する

## 4. コメント追加方針

### 4.1 JavaScript

- すべての JavaScript ファイル先頭に、file responsibility が分かる短い英語ヘッダーコメントを追加する
- 1 ファイルあたりのヘッダーコメントは 1 行から 2 行を目安にする
- 関数内部コメントは、以下のような誤読しやすい箇所に限定する
  - state normalization
  - persistence boundary
  - simulation loop timing
  - worker message boundary
  - renderer fallback
  - trail update や camera resolution などの描画責務境界
- 代入、if、return を言い換えるだけの自明コメントは禁止する
- 既に責務がファイル名とコード構造だけで明確な場合は、ヘッダー以外の内部コメントを追加しない

### 4.2 HTML

- layout 上の主要セクション、panel、toolbar、viewport、metrics など、構造責務が読み取りにくい箇所だけに短い英語コメントを追加する
- DOM 構造をそのまま説明するコメントは追加しない
- visible label、title、aria-label などの accessible name 契約と矛盾する説明を書かない
- 主要構造が十分明白な箇所には、コメントを追加しないという判断を許容する

### 4.3 CSS

- responsive 調整、compact layout、overflow 回避、panel 構造、viewport 高さ制御など、意図が読み取りにくい箇所に限定して短い英語コメントを追加する
- 色、サイズ、余白を単に言い換えるだけのコメントは禁止する
- workaround や state-dependent styling は、既存コードから説明可能な範囲だけ記述する
- 単なる selector grouping や視覚値の列挙にはコメントを追加しない

## 5. レビュー観点

文書レビューと実施後レビューでは、少なくとも以下を確認する。

1. 追加コメントが既存コードから観測可能な事実だけを述べているか
2. コメント追加が過剰になっておらず、未記載の判断にも一貫性があるか
3. 責務境界が曖昧なファイルへ優先的にコメントが追加される計画になっているか
4. コメント追加以外の差分を最小化する統制が入っているか
5. 実行担当が最終報告で何を示すべきか判断できるか

## 6. 優先順位

優先順位は以下の順とする。

1. app entrypoint、state、controller、simulation loop、physics、renderer、worker boundary の JavaScript
2. Three.js host、fallback renderer、layout service、persistence など責務境界が濃い JavaScript
3. [Sources/index.html](../Sources/index.html) の主要レイアウト構造
4. [Sources/style.css](../Sources/style.css) の compact / responsive / layout 調整
5. その他の補助 JavaScript、HTML、CSS

## 7. 実施手順

### フェーズ 0: 対象棚卸し

作業内容:

- Sources 配下の JavaScript、HTML、CSS を列挙する
- vendor code を除外する
- ファイルごとに、ヘッダーコメントのみで十分か、内部コメント追加が必要かを短く整理する
- 各ファイルを少なくとも以下のいずれかに分類する
  - header only
  - header + internal comments
  - no change

完了条件:

- 対象ファイル一覧がある
- 優先順位付きの着手順が決まっている
- ファイルごとの分類結果がある

### フェーズ 1: 高優先度 JavaScript コメント追加

作業内容:

- 高優先度 JavaScript に file responsibility ヘッダーコメントを追加する
- 必要箇所だけ内部コメントを追加する
- state shape や API を変更しない
- 既存コメントが正確な場合は追記しない、または置換せず維持する

完了条件:

- 高優先度 JavaScript のヘッダーコメントが揃っている
- 内部コメントは必要箇所に限定されている

### フェーズ 2: HTML / CSS コメント追加

作業内容:

- [Sources/index.html](../Sources/index.html) に主要レイアウト区画コメントを追加する
- [Sources/style.css](../Sources/style.css) に compact / responsive / layout 意図のコメントを追加する
- DOM や CSS 宣言の逐語説明は避ける
- コメントを追加しない判断をした箇所も、理由を報告用メモに残す

完了条件:

- HTML と CSS の主要責務境界が把握しやすくなっている
- コメント過多になっていない

### フェーズ 3: 残ファイル対応

作業内容:

- 残りの補助 JavaScript、HTML、CSS に必要最小限のコメントを追加する
- コメントトーンと粒度を全体で揃える
- 同一責務に対してコメント表現が揺れていないか確認する

完了条件:

- 対象範囲のコメント追加が完了している
- 英語コメントのトーンが統一されている

### フェーズ 4: 差分確認と回帰確認

作業内容:

- 変更差分を確認し、コメント追加以外の変更が混入していないか確認する
- 必要に応じて `npm test` を実行する
- 必要に応じて `npm run test:ui` を実行する
- テスト未実行の場合は、その理由が差分内容と整合しているか確認する

完了条件:

- 差分がコメント追加中心であることを説明できる
- 必要なテスト実行有無と理由を報告できる
- 最終報告でファイル分類、追加内容、未追加理由を説明できる

## 8. ファイル群ごとの方針

### 7.1 Sources/app

- file responsibility を全ファイル先頭に追加する
- controller、store、loop、renderer、runtime、state-rules、persistence 周辺は責務境界の誤読を防ぐコメントを優先する

### 7.2 Sources/workers

- worker entrypoint、message handling、simulation boundary を短く説明する

### 7.3 Sources/index.html

- app shell、controls、viewport、metrics、status などの主要セクション境界を説明する

### 7.4 Sources/style.css

- responsive layout、compact controls、viewport sizing、scroll / overflow 制御の意図を説明する

## 9. テスト実施判定

テスト実施は以下の基準で判断する。

1. コメントのみの追加で、構文、import、DOM 構造、class 名、属性、ロジックに変更がない場合は、差分確認を主とし、テストは任意とする
2. JavaScript の構文修正や import 周辺に触れた場合は `npm test` を実行する
3. HTML / CSS の編集で DOM 構造、class、attribute、UI 契約へ影響する懸念がある場合は `npm run test:ui` を実行する
4. テストを実行しない場合でも、なぜ不要と判断したかを最終報告に明記する

## 10. 禁止事項

- 推測に基づく説明の追加
- 実装とズレる将来想定コメントの追加
- public API や state shape の変更
- ロジック変更、性能調整、仕様変更の混入
- vendor code の編集
- 英語以外のコメント追加
- コメント追加に見せかけた大規模整形
- 確信が持てない説明を埋めるための憶測補完
- コメント追加のために識別子名やコード配置を変更すること

## 11. 受け入れ基準

以下を満たした場合に完了とみなす。

1. 対象範囲の JavaScript 先頭に短い英語ヘッダーコメントが追加されている
2. HTML と CSS のコメントは必要箇所に限定されている
3. コメント内容が既存実装から観測可能な事実に一致している
4. コメント追加以外の差分が最小限である
5. 追加したコメントの概要をファイル単位で報告できる
6. 必要に応じたテスト実行有無と理由を説明できる
7. 各対象ファイルについて、header only、header + internal comments、no change の判定を説明できる
8. no change としたファイルにも理由がある

## 12. 最終報告要件

最終報告では少なくとも以下を含める。

1. 対象ファイルの分類結果
2. 優先順位に従った実施順
3. 更新したファイル一覧
4. 各ファイルに追加したコメントの要約
5. no change としたファイルまたは区画の理由
6. テストまたは差分確認の実施内容

## 13. 成果物

今回の作業で作成または更新する成果物は以下とする。

- 本計画書
- 実行用 prompt
- Sources 配下のコメント追加差分
- 必要に応じたテスト結果
- 追加したコメント内容の簡潔な報告

## 14. リスク

- コメントが多すぎて逆に読みにくくなるリスク
- 既存実装とズレたコメントを残すリスク
- コメント追加に付随して不要な整形差分が混入するリスク

各ファイルの編集では、責務把握に寄与するかを基準に取捨選択し、説明過多を避ける。