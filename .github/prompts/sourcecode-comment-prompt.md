Shos.Maze リポジトリの現行構成、特に Sources/js 配下について、可読性を大きく向上させるための英語コメントを追加してください。  
最初に計画を立て、その計画に沿って作業してください。  
コードの意味や挙動は変更せず、コメント追加を中心に進めてください。

対象ファイル:
- Sources/js/app-config.js
- Sources/js/app-state.js
- Sources/js/app-timing.js
- Sources/js/ui-dom.js
- Sources/js/ui-sync.js
- Sources/js/render-scheduler.js
- Sources/js/render-canvas.js
- Sources/js/worker-message-protocol.js
- Sources/js/worker-request-client.js
- Sources/js/app-controller.js
- Sources/js/app-bootstrap.js
- Sources/js/worker-bootstrap.js
- Sources/js/worker/worker-heap.js
- Sources/js/worker/worker-messages.js
- Sources/js/worker/worker-algorithms.js
- Sources/index.html
- Sources/style.css

優先度:
1. まず以下の中核ファイルを優先する
- Sources/js/app-controller.js
- Sources/js/render-canvas.js
- Sources/js/worker-request-client.js
- Sources/js/worker/worker-algorithms.js
- Sources/js/app-state.js
- Sources/js/ui-sync.js

2. 次に以下の補助ファイルを整える
- Sources/js/app-config.js
- Sources/js/render-scheduler.js
- Sources/js/ui-dom.js
- Sources/js/worker-message-protocol.js
- Sources/js/worker/worker-heap.js
- Sources/js/worker/worker-messages.js
- Sources/js/app-bootstrap.js
- Sources/js/worker-bootstrap.js
- Sources/js/app-timing.js

3. 最後に HTML / CSS を必要最小限で補う
- Sources/index.html
- Sources/style.css

必須要件:
- すべての JavaScript ファイル先頭に、file responsibility が分かる短い英語ヘッダーコメントを追加する
- 以下の観点を優先してコメントする
  - app state の役割と更新方針
  - request lifecycle と request cancellation
  - generate / solve / highlight の state transitions
  - failure handling と rollback の意図
  - Worker communication の流れ
  - render scheduling の意図
  - static canvas cache、diff rendering、coordinate cache、Path2D などの performance-related decisions
  - typed array や cellId 表現を採用している理由
- HTML には、レイアウト上の主要セクションの責務が分かるコメントを必要に応じて追加する
- CSS には、レイアウト構造、ステータス領域、迷路表示領域、レスポンシブ意図が分かりにくい箇所だけコメントを追加する
- obvious な DOM 取得や単純代入へのコメントは避ける
- 実装とズレる推測コメントは禁止
- コメントは簡潔で保守的な英語に統一する

進め方:
1. 対象ファイルごとのコメント追加方針を短く計画する
2. 高優先度ファイルから順にコメントを追加する
3. 追加後、どのファイルに何の説明を入れたかを簡潔に報告する

特に重視すること:
- このコードベースは状態遷移、描画最適化、Worker 分離、失敗時復元が理解の要点なので、その意図が分かるようにすること
- 新しい開発者が Sources/js 配下を読み始めたときに、責務分担を素早く把握できるようにすること
- パフォーマンス チューニング済みの理由が読み取れるようにすること

コメント追加以外の変更は、整形やごく小さな修正を除き行わないでください。
