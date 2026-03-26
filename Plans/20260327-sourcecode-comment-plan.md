# ソースコードコメント追加計画書

## 1. 目的

本計画書の目的は、Sources 配下の JavaScript、HTML、CSS に対して、コードの意味や挙動を変えずに保守的な英語コメントを追加し、新しい開発者が責務分担と読み始める順序を素早く把握できる状態にすることである。

今回の作業では、実装変更ではなく可読性向上を対象とする。コメントは既存コードから観測可能な責務、状態契約、描画境界、UI 構造、レイアウト意図に限定し、推測や将来想定を書かない。

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

## 3. 非交渉制約

- ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript の前提を維持する
- 物理演算、描画、UI 制御、永続化の責務分離をコメント上でも崩さない
- `sample`、`binary-orbit`、`random-cluster` の preset 契約を推測で書き換えない
- localStorage、hydration、validation、fallback、worker 実行などの契約は既存コードから観測可能な範囲だけを説明する
- コメント追加以外の変更は、整形または極小の構文修正に限る
- 英語コメント以外は追加しない

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

### 4.2 HTML

- layout 上の主要セクション、panel、toolbar、viewport、metrics など、構造責務が読み取りにくい箇所だけに短い英語コメントを追加する
- DOM 構造をそのまま説明するコメントは追加しない
- visible label、title、aria-label などの accessible name 契約と矛盾する説明を書かない

### 4.3 CSS

- responsive 調整、compact layout、overflow 回避、panel 構造、viewport 高さ制御など、意図が読み取りにくい箇所に限定して短い英語コメントを追加する
- 色、サイズ、余白を単に言い換えるだけのコメントは禁止する
- workaround や state-dependent styling は、既存コードから説明可能な範囲だけ記述する

## 5. 優先順位

優先順位は以下の順とする。

1. app entrypoint、state、controller、simulation loop、physics、renderer、worker boundary の JavaScript
2. Three.js host、fallback renderer、layout service、persistence など責務境界が濃い JavaScript
3. [Sources/index.html](../Sources/index.html) の主要レイアウト構造
4. [Sources/style.css](../Sources/style.css) の compact / responsive / layout 調整
5. その他の補助 JavaScript、HTML、CSS

## 6. 実施手順

### フェーズ 0: 対象棚卸し

作業内容:

- Sources 配下の JavaScript、HTML、CSS を列挙する
- vendor code を除外する
- ファイルごとに、ヘッダーコメントのみで十分か、内部コメント追加が必要かを短く整理する

完了条件:

- 対象ファイル一覧がある
- 優先順位付きの着手順が決まっている

### フェーズ 1: 高優先度 JavaScript コメント追加

作業内容:

- 高優先度 JavaScript に file responsibility ヘッダーコメントを追加する
- 必要箇所だけ内部コメントを追加する
- state shape や API を変更しない

完了条件:

- 高優先度 JavaScript のヘッダーコメントが揃っている
- 内部コメントは必要箇所に限定されている

### フェーズ 2: HTML / CSS コメント追加

作業内容:

- [Sources/index.html](../Sources/index.html) に主要レイアウト区画コメントを追加する
- [Sources/style.css](../Sources/style.css) に compact / responsive / layout 意図のコメントを追加する
- DOM や CSS 宣言の逐語説明は避ける

完了条件:

- HTML と CSS の主要責務境界が把握しやすくなっている
- コメント過多になっていない

### フェーズ 3: 残ファイル対応

作業内容:

- 残りの補助 JavaScript、HTML、CSS に必要最小限のコメントを追加する
- コメントトーンと粒度を全体で揃える

完了条件:

- 対象範囲のコメント追加が完了している
- 英語コメントのトーンが統一されている

### フェーズ 4: 差分確認と回帰確認

作業内容:

- 変更差分を確認し、コメント追加以外の変更が混入していないか確認する
- 必要に応じて `npm test` を実行する
- 必要に応じて `npm run test:ui` を実行する

完了条件:

- 差分がコメント追加中心であることを説明できる
- 必要なテスト実行有無と理由を報告できる

## 7. ファイル群ごとの方針

### 7.1 Sources/app

- file responsibility を全ファイル先頭に追加する
- controller、store、loop、renderer、runtime、state-rules、persistence 周辺は責務境界の誤読を防ぐコメントを優先する

### 7.2 Sources/workers

- worker entrypoint、message handling、simulation boundary を短く説明する

### 7.3 Sources/index.html

- app shell、controls、viewport、metrics、status などの主要セクション境界を説明する

### 7.4 Sources/style.css

- responsive layout、compact controls、viewport sizing、scroll / overflow 制御の意図を説明する

## 8. 禁止事項

- 推測に基づく説明の追加
- 実装とズレる将来想定コメントの追加
- public API や state shape の変更
- ロジック変更、性能調整、仕様変更の混入
- vendor code の編集
- 英語以外のコメント追加
- コメント追加に見せかけた大規模整形

## 9. 受け入れ基準

以下を満たした場合に完了とみなす。

1. 対象範囲の JavaScript 先頭に短い英語ヘッダーコメントが追加されている
2. HTML と CSS のコメントは必要箇所に限定されている
3. コメント内容が既存実装から観測可能な事実に一致している
4. コメント追加以外の差分が最小限である
5. 追加したコメントの概要をファイル単位で報告できる
6. 必要に応じたテスト実行有無と理由を説明できる

## 10. 成果物

今回の作業で作成または更新する成果物は以下とする。

- 本計画書
- 実行用 prompt
- Sources 配下のコメント追加差分
- 必要に応じたテスト結果
- 追加したコメント内容の簡潔な報告

## 11. リスク

- コメントが多すぎて逆に読みにくくなるリスク
- 既存実装とズレたコメントを残すリスク
- コメント追加に付随して不要な整形差分が混入するリスク

各ファイルの編集では、責務把握に寄与するかを基準に取捨選択し、説明過多を避ける。