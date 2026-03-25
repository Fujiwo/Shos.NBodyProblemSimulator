---
name: n-body-problem-simulator-webapp
description: Create or revise a concrete development plan for the 3D N-body problem simulator in this repository, and prepare the repository-level GitHub Copilot customization files that support the project workflow.
argument-hint: Add any extra constraints, target devices, or planning focus
agent: agent
---

# 役割と目的
あなたは熟練のフロントエンドエンジニア兼Webアプリケーションアーキテクトです。
このリポジトリに対して、ブラウザ上で動作する「3D N-body problem simulator(N体問題シミュレータ)」を将来的に実装するための【開発計画書】を作成し、あわせて GitHub Copilot 用のリポジトリ内カスタマイズファイルを整備してください。

関連する常設ルールは [.github/copilot-instructions.md](../copilot-instructions.md) を参照してください。
必要に応じて以下の Skill を活用してください。
- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)

# 今回の成果物
1. `Plans/` 配下に保存する前提の開発計画書 1 件。
2. `.github/skills/` 配下に追加する Agent Skill 一式。
3. `.github/copilot-instructions.md` 1 件。

# 重要な制約事項(絶対遵守)
1. アプリ本体コード生成の禁止: 今回は計画とリポジトリ内カスタマイズ整備のフェーズです。`Sources/` 配下に置く HTML、CSS、JavaScript などのアプリ本体実装コードは生成しないでください。
2. 例外的に生成してよいファイル: GitHub Copilot カスタマイズ用途の Markdown ファイル(`.github/skills/` 配下の `SKILL.md`、`.github/copilot-instructions.md`)は今回の成果物として作成して構いません。
3. 計画書の具体性: 曖昧な表現を避け、次フェーズで開発者が迷わず実装に着手できる粒度で、何を・どの順序で・なぜそうするのかを具体的に記述してください。
4. 受け入れ基準の明確化: 「高精度」「高性能」「適切」などの表現で終わらせず、性能目標、誤差評価、対象端末、保存対象、UI状態遷移を定量または判定可能な形で定義してください。
5. 文書言語: 計画書および `.github` 配下の説明文は日本語で記述してください。ただし、アプリ UI 表示文言の想定、ボタン名、ラベル名、状態名は英語前提で整理してください。

# 参考資料・ドメイン知識
計画書の作成、特にアルゴリズムの選定やリスクの洗い出しにおいて、以下の資料およびそこから派生する物理学・数学的背景を前提知識として最大限活用してください。
- N-body simulation - Wikipedia: https://en.wikipedia.org/wiki/N-body_simulation
- Three-body problem - Wikipedia: https://en.wikipedia.org/wiki/Three-body_problem
- VS Code Agent Skills: https://code.visualstudio.com/docs/copilot/customization/agent-skills
- VS Code Custom Instructions: https://code.visualstudio.com/docs/copilot/customization/custom-instructions

特に以下の論点を必ず考慮してください。
- ニュートン力学
- 万有引力の法則
- 初期値鋭敏性とカオス的挙動
- 重力軟化
- エネルギー保存則と数値誤差の蓄積
- 特異点近傍での時間刻みと衝突・接近時の扱い

# プロジェクト概要
- アプリ名: 3D N-body problem simulator
- 実行環境: クライアントサイド(ブラウザ)のみで完結
- 文書言語: 日本語
- UI想定言語: 英語
- 計画書保存先: `Plans/`

# システムおよび技術要件
- 言語・ライブラリ: HTML5, CSS3, JavaScript (ES6+)。
- 描画ライブラリ: Three.js などの 3D 描画ライブラリの使用は必須とする。
- UI 実装方針: React などの UI フレームワーク、外部状態管理ライブラリは使用せず、Vanilla JavaScript で構築すること。
- レスポンシブ対応: PC、タブレット、スマートフォンに対応するモバイルファースト設計とし、3D 描画キャンバス領域は画面サイズと UI レイアウトに応じて動的にスケーリングすること。
- 状態管理: 設定値および再現に必要な補助情報は `localStorage` に保存し、再ロード時に自動復元すること。

# 必要な機能要件
1. Body設定
   - 個数は 2 個以上、10 個以下の N 体として UI から設定可能とすること。
   - 各天体について少なくとも以下を個別に設定可能とすること。
     - 質量
     - 初期位置ベクトル
     - 初速度ベクトル
   - 変更時は `localStorage` に保存すること。
2. Generate機能
   - 自動で妥当な初期条件セットを生成・適用すること。
   - Generate 実行時に、シミュレーション時刻、軌跡表示、選択状態、カメラ注視対象などの表示状態をどこまでリセットするかを定義すること。
   - 再現性確保のため、preset ごとの再現キーを明示すること。少なくとも `random-cluster` では `presetId`、`seed`、`bodyCount` の扱いを明示すること。
   - Generate 後の状態を `localStorage` に即時反映するかどうかを明記すること。
3. シミュレーション制御機能
   - `Start` はクリックで物理シミュレーションを開始すること。
   - `Pause`、`Resume`、`Reset` の要否と仕様を計画書内で明示すること。
   - 再実行時に初期条件へ戻すのか、現在状態から再開するのかを状態遷移として定義すること。
   - `Reset` が復帰する `committedInitialState` の保存内容を、物理条件だけでなく必要な UI 状態を含めて明示すること。

# アーキテクチャと設計方針
- N体問題としての計算とパフォーマンスの両立を必須要件とし、ブラウザ上での滑らかな描画と、長時間実行時に破綻しにくい数値積分設計の両立を目指すこと。
- 計画書内で、対象デバイス、目標 FPS、1 フレーム当たりの演算予算、許容するエネルギー誤差評価方法を必ず数値付きで定義すること。
- 物理演算ロジックと 3D 描画処理を明確に分離したオブジェクト指向設計とし、天体数が最大 10 個に増減しても柔軟に対応できる設計にすること。
- 精度維持とメインスレッドのブロック回避のため、Web Worker を採用する案と採用しない案を比較した上で、採用方針を明示すること。
- Web Worker の有効化判定は Desktop だけで閉じず、サポート対象のモバイルブラウザでの再計測方針まで明記すること。
- アニメーションには `requestAnimationFrame` を基本とし、必要に応じて `async/await` を補助的に用いること。

# 将来のファイル構成案(今回は計画書内に構成案として記載するのみ)
- `Sources/index.html`
- `Sources/style.css`
- `Sources/main.js`
- `Sources/app/` または同等のロジック分割用ディレクトリ
- `Sources/workers/physics-worker.js` または同等の Worker 用ファイル
- `Specifications/` (仕様書ディレクトリ)
- `Tests/` (将来の検証コード・検証データ配置先)
- `README.md` (英語)
- `README.ja.md` (README.md の日本語版)
- `LICENSE.md` (MIT ライセンス)

# GitHub Copilot カスタマイズ成果物要件
## 1. Agent Skills
VS Code の Agent Skills ドキュメントを参考に、`.github/skills/` 配下にこのリポジトリに適した Skill を追加してください。

最低要件は以下の通りです。
- `name` とディレクトリ名が一致すること。
- `description` に「何をする Skill か」と「どのような時に使う Skill か」を明記すること。
- このリポジトリで有用な手順、判断基準、チェック項目を含めること。
- 少なくとも以下のいずれか、できれば両方をカバーすること。
  - 計画書・仕様書・プロンプトの作成およびレビュー
  - 将来の N 体シミュレータ実装時の設計・実装ガイド

## 2. copilot-instructions.md
VS Code の Custom Instructions ドキュメントを参考に、`.github/copilot-instructions.md` を追加してください。

このファイルには少なくとも以下を含めてください。
- このリポジトリで常時適用したい言語方針
- 使用技術の前提
- 避けるべき技術選択
- 物理演算と描画の分離方針
- ドキュメントとプロンプトを編集する際の品質基準

# 計画書の必須構成(以下の目次通りに出力すること)
1. 目的とスコープ
2. 要件整理
3. 想定UI構成(最大 10 体のパラメータ設定を考慮したモバイル操作性と視認性を重視し、Start/Pause/Resume/Reset の扱いも明記すること)
4. 採用アルゴリズム候補と採用理由(参考資料を基に、N体問題において科学的厳密性と滑らかな描画を両立するアルゴリズムを比較し、4次のルンゲ・クッタ法、Velocity Verlet などのシンプレクティック積分、必要なら可変時間刻みの考え方を比較・検討して明記すること)
5. 描画方式の比較と採用方針(WebGL/3Dライブラリの選定理由)
6. クラス設計方針と責務分担(N体の動的増減に対応する設計、計算スレッドと描画スレッドの分離案を含む)
7. データ構造の方針
8. `localStorage` で保存する状態の一覧
9. レスポンシブ対応方針
10. アニメーションおよび物理演算ループの実装方針
11. 実装フェーズの分割案(WBSとして)
12. テスト観点(カオス系特有の挙動確認、エネルギー保存則の検証、再現性確認、端末別パフォーマンス検証を含む)
13. リスクと注意点(計算誤差の蓄積、特異点・衝突判定、重力軟化パラメータの必要性、Generate の再現性、保存データ互換性を含む)
14. 実装開始前の確認事項

# 追加の明示指示
- 計画書では、Body 設定に初期位置が必要である理由を明示してください。
- 計画書では、Generate 機能の再現性と保存仕様を明示してください。
- 計画書では、性能目標の判定方法を曖昧にせず、測定条件まで記述してください。
- 計画書では、実装フェーズの中に `.github/skills/` と `.github/copilot-instructions.md` の整備作業も含めてください。