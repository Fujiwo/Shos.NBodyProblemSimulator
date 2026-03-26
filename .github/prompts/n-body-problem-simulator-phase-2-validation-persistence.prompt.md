---
name: n-body-problem-simulator-phase-2-validation-persistence
description: Implement Phase 2 for the 3D N-body problem simulator by adding Body input validation, localStorage save and restore, and state hydration on top of the existing scaffold. Japanese triggers: Phase 2 実装, バリデーション, localStorage, 保存復元, state hydration.
argument-hint: Add any constraints for validation UX, storage migration, or implementation depth
agent: agent
---

# 役割と目的
あなたは、このリポジトリで 3D N-body problem simulator の Phase 2 を実装する担当エンジニアです。
今回の目的は、すでに `Sources/` 配下にある Phase 1 scaffold を前提に、Body 入力バリデーションと localStorage 保存復元を実装し、次フェーズ以降のシミュレーション制御と Generate 実装が迷わず載る状態へ進めることです。

関連する常設ルールは [.github/copilot-instructions.md](../copilot-instructions.md) を参照してください。
関連ドキュメントは以下を参照してください。
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。
- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)

# 今回の実装範囲
今回の作業対象は Phase 2 のみとし、少なくとも以下を実装してください。

1. Body 入力バリデーション
2. localStorage 保存
3. localStorage 復元
4. 復元時の state hydration
5. Phase 1 scaffold と矛盾しない UI 反映

主な更新対象は以下を想定します。

- `Sources/main.js`
- `Sources/app/bootstrap.js`
- `Sources/app/defaults.js`
- `Sources/app/simulation-controller.js`
- `Sources/app/ui-shell.js`
- `Sources/app/persistence-facade.js`
- 必要なら `Sources/app/` 配下の補助モジュール

# 今回は実装しないこと
以下は Phase 2 のスコープ外とし、完成実装を行わないでください。

- N 体重力計算本体
- Velocity Verlet の本実装
- Generate の preset 別生成ロジック
- Three.js renderer の本格機能追加
- Web Worker 本実装
- trail の永続化
- パフォーマンス最適化

ただし、後続フェーズで無理なく接続できるよう、保存・復元 API、状態正規化、検証ユーティリティの分離は行って構いません。

# 技術制約
- ブラウザのみで完結すること
- HTML5、CSS3、JavaScript ES6+ を使うこと
- UI は Vanilla JavaScript で構築すること
- React や外部状態管理ライブラリは導入しないこと
- localStorage キーは `nbody-simulator.state` を使うこと
- state 形状は [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md) の `AppState` を土台にすること

# Phase 2 の実装要求
## 1. Body 入力バリデーション
以下の仕様を実装すること。

- `bodyCount` は 2 以上 10 以下の整数とする
- `mass <= 0` は不正とする
- `NaN`、`Infinity`、空文字は不正とする
- `name` は 1 から 32 文字とする
- `color` は空を許容しない
- `position.x/y/z` と `velocity.x/y/z` は有限数とする
- Body 数が範囲外の場合は直前の有効値へ戻すこと
- 不正入力中は `Start` を無効化すること

さらに、preset 制約も state に反映してください。

- `binary-orbit` は 2 体固定
- `three-body-figure-eight` は 3 体固定
- `random-cluster` は 3 体から 10 体

少なくとも、preset と bodyCount の矛盾状態を放置しないこと。

## 2. バリデーション UX
- エラー一覧に加えて、項目単位の error 表示を行うこと
- エラーメッセージは英語にすること
- 現在の入力値を勝手に破棄しないこと
- ただし `bodyCount` の範囲外だけは直前有効値へ戻してよい
- `running` と `paused` 中は Body 入力を無効化する既存方針を壊さないこと
- compact controls 前提で、visible label は `Count`、`dt`、`Soft`、`Target`、`Trail` のような短縮表示を許容し、accessible name で正式名称を保持できること
- validation panel は「エラーが存在する時だけ表示し、表示時は強調する」挙動を許容すること

## 3. localStorage 保存仕様
以下を保存対象にすること。

- `appVersion`
- `bodyCount`
- `bodies`
- `simulationConfig.gravitationalConstant`
- `simulationConfig.timeStep`
- `simulationConfig.softening`
- `simulationConfig.integrator`
- `simulationConfig.maxTrailPoints`
- `simulationConfig.presetId`
- `simulationConfig.seed`
- `uiState.selectedBodyId`
- `uiState.cameraTarget`
- `uiState.showTrails`
- `uiState.expandedBodyPanels`
- `committedInitialState`
- `playbackRestorePolicy`

以下は保存しないこと。

- `playbackState = running`
- `playbackState = paused`
- accumulator などの中間計算状態
- trail の過去点列

## 4. 保存タイミング
以下のタイミングで保存すること。

- Body 入力変更時
- Body 数変更時
- 表示設定変更時
- アプリ設定変更時
- Generate 実行時に相当する state 更新時

Phase 2 時点では Generate 本実装が未完成でも、後続フェーズの Generate 更新内容を保存しやすい persistence 境界を持つこと。

## 5. localStorage 復元仕様
- アプリ起動時に `nbody-simulator.state` を読み込むこと
- 保存内容が存在しない場合は既定状態を使うこと
- `appVersion` が互換でない場合に備え、migration を差し込める構造にすること
- migration 不可時は既定状態へフォールバックできる構造にすること
- 復元後の `playbackState` は常に `idle` とすること
- `committedInitialState` が存在する場合は Reset 復帰先として利用可能な状態にすること
- 保存データが壊れている場合は既定状態へ戻し、必要なら英語エラーメッセージを表示すること

## 6. state hydration 要求
- `PersistenceFacade.load()` の結果を実際に `AppStore` 初期 state へ反映すること
- 既定 state を先に作ってから部分的に上書きする場合でも、最終的に仕様書の `AppState` 形状を満たすこと
- 復元データは正規化すること
  - `bodyCount` と `bodies.length` の整合
  - `expandedBodyPanels` の整合
  - `selectedBodyId` の存在確認
  - preset と bodyCount の整合
  - `committedInitialState` の整合
- `expandedBodyPanels` は現行 UI 方針として最大 1 件の展開に正規化できること

## 7. 既存 scaffold からの改善対象
少なくとも以下の問題を解消してください。

- persisted state を読み取っても store に反映されない問題
- `random-cluster` と `bodyCount = 2` のような preset 制約違反が通る問題
- resize 後に再描画が走らない問題を、最小限の再描画経路で解消すること

ただし、Phase 2 の主目的は validation と persistence であり、描画の大改修は行わないでください。

# 実装時の判断基準
- Phase 2 の目的は「入力が壊れた state を保存しない」「起動時に一貫した state を復元する」ことです。
- localStorage 実装は最小限でもよいですが、後続フェーズで書き直しにならない API 境界を優先してください。
- バリデーションロジック、state 正規化、永続化ロジックは混ぜすぎないでください。
- UI shell に永続化詳細を埋め込まないこと。
- 後続フェーズで Generate と Reset を本実装した時に、`committedInitialState` と `playbackRestorePolicy` がそのまま使えることを合格条件にしてください。

# 期待する出力
- 必要ファイルを実際に作成・更新してください。
- 変更内容は Phase 2 の範囲に留めてください。
- 実装後は、validation、persistence、state hydration をどのファイルへ置いたかを簡潔に説明してください。
- 可能なら保存・再読み込み・不正入力の確認観点も添えてください。