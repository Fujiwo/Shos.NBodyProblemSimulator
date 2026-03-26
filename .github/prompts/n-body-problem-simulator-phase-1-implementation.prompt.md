---
name: n-body-problem-simulator-phase-1-implementation
description: Start Phase 1 implementation for the 3D N-body problem simulator by scaffolding the browser app structure, responsive layout foundation, and module boundaries without implementing later-phase simulation features. Japanese triggers: Phase 1 実装, 基盤実装, scaffold, app shell.
argument-hint: Add any constraints for file naming, UI tone, or scaffolding depth
agent: agent
---

# 役割と目的
あなたは、このリポジトリで 3D N-body problem simulator の Phase 1 を実装する担当エンジニアです。
今回の目的は、後続フェーズを安全に積み上げられるように、ブラウザアプリの基盤構造、初期化導線、レスポンシブレイアウト基盤、責務分離の骨格を `Sources/` 配下へ実装することです。

関連する常設ルールは [.github/copilot-instructions.md](../copilot-instructions.md) を参照してください。
関連ドキュメントは以下を参照してください。
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。
- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)

# 今回の実装範囲
今回の作業対象は Phase 1 のみとし、少なくとも以下を実装してください。

1. `Sources/index.html`
2. `Sources/style.css`
3. `Sources/main.js`
4. `Sources/app/` 配下の基盤モジュール群

Phase 1 で目指す成果は以下です。

- アプリ全体の初期化フローが存在すること
- 後続フェーズの Physics、Renderer、UI、Persistence を分離して実装できるディレクトリ構造とモジュール境界があること
- モバイルファーストのレイアウト骨格があること
- 主要 UI 領域が英語文言で配置されていること
- Three.js を後続フェーズで接続できる canvas / viewport の受け皿があること
- 後続フェーズで `Sources/vendor/three.module.min.js` をローカル import できる初期化導線を邪魔しないこと
- 後続フェーズの状態遷移実装を見据えたコントロール配置があること

# 今回は実装しないこと
以下は Phase 1 のスコープ外とし、完成実装を行わないでください。

- N 体の重力計算そのもの
- Velocity Verlet の本実装
- Generate の再現ロジック
- localStorage の完全実装
- Web Worker 本実装
- Three.js による最終描画実装
- 長時間性能最適化

ただし、後続フェーズで差し込めるように、最小限の API の骨格、スタブ、責務境界は用意して構いません。

# 技術制約
- ブラウザのみで完結すること
- HTML5、CSS3、JavaScript ES6+ を使うこと
- UI は Vanilla JavaScript で構築すること
- React や外部状態管理ライブラリは導入しないこと
- 後続フェーズで Three.js を採用する前提で構成すること
- 後続フェーズで Web Worker へ物理演算を分離しやすい責務分割にすること

# Phase 1 の実装要求
## 1. HTML 骨格
- アプリのルート構造を実装すること
- 少なくとも以下の領域を持つこと
  - Header
  - Control panel
  - Body settings panel
  - Visualization area
  - Metrics overlay
- UI 表示文言は英語にすること
- Header は app title に加えて playback state と status message の表示領域を持てること
- Control panel heading は compact heading として `Setup` / `Controls` を許容すること

## 2. CSS 基盤
- モバイルファーストで実装すること
- Small、Medium、Large を意識したレイアウト切替の基盤を用意すること
- 360px 幅でも横スクロールを発生させない構成にすること
- Canvas / viewport 領域が潰れないように高さ戦略を入れること
- 後続フェーズで Body カードが最大 10 件に増えても破綻しにくい構造にすること
- Large では左パネル 240px から 300px 程度の compact column を許容すること

## 3. JavaScript 初期化基盤
- `main.js` からアプリを起動すること
- アプリ初期化、レイアウト管理、後続フェーズのシミュレーション制御を分離したモジュール構造にすること
- 状態の土台は [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md) の `AppState`、`UiState`、`committedInitialState`、`playbackRestorePolicy` を前提に置くこと
- 少なくとも以下の責務の受け皿を持つこと
  - app bootstrap
  - layout / viewport handling
  - UI shell management
  - simulation controller stub
  - renderer stub
  - persistence stub
- `persistence stub` は完全実装でなくてよいが、後続フェーズで `nbody-simulator.state` に保存する `appVersion`、`bodyCount`、`bodies`、`simulationConfig`、`uiState`、`committedInitialState`、`playbackRestorePolicy` を無理なく扱える入出力境界を持つこと
- 後続フェーズで Start / Pause / Resume / Reset / Generate を接続しやすいイベント配線構造にすること

## 4. UI 骨格
- Control panel には以下のボタンまたはプレースホルダを配置すること
  - Generate
  - Start
  - Pause
  - Resume
  - Reset
- 以下の入力または表示枠の骨格を持つこと
  - Body Count
  - Preset
  - Seed
  - Time Step
  - Softening
  - Camera Target
  - Trails
- visible label / visible button text は compact 表示を許容し、正式名称は title または aria-label で保持できる構造にすること
- Validation は常時表示前提にせず、後続フェーズで「エラーがある時だけ表示」に切り替えられる構造にすること
- Body settings panel は、後続で各 Body の Name、Mass、Position X/Y/Z、Velocity X/Y/Z、Color を差し込めるカード構造にすること
- Body settings panel は各 Body ごとに Open / Closed を切り替えられるトグルを持つ折りたたみカード構造を許容すること
- 各 Body card は独立して開閉でき、同時に複数件を展開できること
- Visualization area には canvas の受け皿と overlay 表示領域を含めること

## 5. ファイル構成方針
必要なら `Sources/app/` 配下にモジュールを追加してよいですが、責務は明確に分離してください。
少なくとも以下のいずれかに相当する構造を持たせてください。

- app bootstrap
- UI shell
- layout / viewport service
- simulation controller
- renderer facade
- persistence facade

# 実装時の判断基準
- Phase 1 の目的は「後で作り直さなくてよい土台」を作ることです。
- 仮実装は許容されますが、責務境界を曖昧にする近道は避けてください。
- CSS と JavaScript は、後続フェーズで機能追加しても全面改修にならない粒度で分割してください。
- Body card と state schema の骨格は、後続フェーズで仕様書の型に寄せて作り直す必要がないことを合格条件にしてください。
- UI は見た目を作り込みすぎず、構造と拡張性を優先してください。

# 期待する出力
- 必要ファイルを実際に作成・更新してください。
- 変更内容は Phase 1 の範囲に留めてください。
- 実装後は、どの責務をどのファイルへ置いたかを簡潔に説明してください。
- 可能なら軽い動作確認観点も添えてください。