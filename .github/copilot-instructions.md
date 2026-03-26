# Repository Instructions

- このリポジトリでは、対話・仕様書・計画書・レビューコメントは日本語で記述する。
- アプリの UI 文言、ボタン名、ラベル名、状態名、README の英語版想定文言は英語前提で設計する。
- 計画書、仕様書、プロンプトを編集する場合は、曖昧な表現を避け、前提条件・受け入れ基準・保存対象・状態遷移を明記する。
- 3D N-body simulator の実装を提案または作業する場合は、ブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript を前提とし、React や外部状態管理ライブラリは使わない。
- Three.js を扱う場合は、実行時依存を CDN に置かず、`Sources/vendor/three.module.min.js` と `Sources/vendor/three.core.min.js` のローカル配布を前提にする。
- 物理演算、描画、UI 制御、永続化は責務を分離して扱う。
- Three.js 初期化失敗時は UI 全体を止めず、2D fallback 継続と texture unavailable 理由をステータスメッセージで明示する。
- N 体の各 Body 設定は、少なくとも質量、初期位置ベクトル、初速度ベクトルを含める。
- localStorage を使う場合は、ユーザー入力だけでなく再現に必要な seed、preset、表示設定、シミュレーション制御状態の保存要否を明示する。
- 数値積分やアルゴリズム比較を扱う場合は、RK4 とシンプレクティック積分の比較、エネルギー保存、時間刻み、重力軟化、接近時の安定性を評価軸に含める。
- モバイルファーストで設計し、最大 10 体の設定 UI がスマートフォンでも破綻しないことを優先する。
- 現行 UI は compact controls を前提とし、visible label や visible button text の短縮表示は許容するが、title や aria-label などの accessible name で正式名称を保持する。
- 現行 UI の Validation は常時表示ではなく、エラーが存在する時だけ表示して強調する。
- 現行 UI の Body settings は single-expand card を前提とし、同時展開数は最大 1 とする。
- Large レイアウトの左カラム幅は compact UI 前提として 240px から 300px を許容する。
- プロンプトや仕様のレビューでは、まず要件不足、矛盾、受け入れ基準の欠落、将来実装を迷わせる曖昧さを優先して指摘する。