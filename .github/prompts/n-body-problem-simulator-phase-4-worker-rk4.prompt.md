---
name: n-body-problem-simulator-phase-4-worker-rk4
description: Implement Phase 4 for the 3D N-body problem simulator by adding RK4 comparison support, Worker-compatible physics execution, simulation pipeline time measurement, and acceptance-driven performance validation on top of the current compact UI and Phase 3 runtime. Japanese triggers: Phase 4 実装, Worker 対応, RK4, integrator comparison, simulation pipeline time, performance validation.
argument-hint: Add any constraints for integrator UI, Worker activation strategy, numerical tolerance, or benchmark conditions
agent: agent
---

# 役割と目的
あなたは、このリポジトリで 3D N-body problem simulator の Phase 4 を実装する担当エンジニアです。
今回の目的は、現行 baseline の Phase 3 実装を前提に、積分法比較と性能改善判断に必要な基盤を追加することです。

この prompt における Phase 4 は、古い計画書に残っている「3D 描画」ではなく、現行 baseline の次段階として未実装の残タスクを指します。具体的には以下を実装対象とします。

- RK4 を比較可能な積分法として追加すること
- Worker 移行可能な physics 実行境界を実装し、実際の Worker 実行経路を追加すること
- simulation pipeline time を含む性能計測を実装すること
- compact UI と既存の保存復元方針を維持したまま、後続の性能判断を可能にすること

関連する常設ルールは [.github/copilot-instructions.md](../copilot-instructions.md) を参照してください。
関連ドキュメントは以下を参照してください。

- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。

- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)
- [.github/skills/n-body-threejs-rendering/SKILL.md](../skills/n-body-threejs-rendering/SKILL.md)
- [.github/skills/n-body-testing-and-validation/SKILL.md](../skills/n-body-testing-and-validation/SKILL.md)

# 現在の前提
このリポジトリには、すでに以下が実装済みです。

- app bootstrap と store 初期化
- compact controls 前提の responsive UI shell
- Body 入力 validation と validation panel の条件付き表示
- localStorage 保存復元、hydration、migration 境界
- preset と seed に基づく Generate
- Velocity Verlet による fixed-step simulation loop
- Start / Pause / Resume / Reset の本実装
- runtime metrics 表示
- Three.js と 2D fallback の renderer
- trail 表示
- Playwright を含む UI 契約テスト

一方で、以下は現時点では未実装または実質未対応です。

- `velocity-verlet` 以外の積分法
- RK4 を含む比較実行
- Worker 実行経路
- simulation pipeline time 計測
- Worker 導入可否を判断できる性能検証基盤

Phase 4 では、既存構成を壊さずにこれらを追加してください。

# 今回の実装範囲
今回の作業対象は Phase 4 のみとし、少なくとも以下を実装してください。

1. `velocity-verlet` と `rk4` を切り替え可能な integrator 境界
2. RK4 本実装
3. Worker 互換の physics 実行 service と実 Worker 経路
4. simulation pipeline time を含む runtime metrics 拡張
5. 性能と数値差分を比較できるテストまたは検証ハーネス
6. 上記を既存 compact UI、persistence、Playwright 契約を壊さずに統合すること

主な更新対象は以下を想定します。

- `Sources/app/bootstrap.js`
- `Sources/app/defaults.js`
- `Sources/app/state-rules.js`
- `Sources/app/persistence-facade.js`
- `Sources/app/physics-engine.js`
- `Sources/app/simulation-loop.js`
- `Sources/app/simulation-controller.js`
- `Sources/app/ui-shell.js`
- 必要なら `Sources/app/` 配下の integrator / worker service 補助モジュール
- 新規 `Sources/workers/physics-worker.js`
- `Tests/` 配下の unit / integration / ui acceptance tests
- 必要なら `README.md`

# 今回は実装しないこと
以下は Phase 4 のスコープ外とし、完成実装を行わないでください。

- 衝突判定や合体処理
- 可変時間刻みや adaptive step
- Barnes-Hut など 10 体超前提の最適化
- OrbitControls などの本格カメラ操作
- renderer の全面刷新
- Desktop のみ Worker、有効化対象外モバイルでは main thread という分岐前提の製品方針確定

ただし、後続フェーズで衝突判定や追加積分法を差し込めるように、integrator と execution backend の責務分離は行って構いません。

# 技術制約
- ブラウザのみで完結すること
- HTML5、CSS3、JavaScript ES6+ を使うこと
- UI は Vanilla JavaScript で構築すること
- React や外部状態管理ライブラリは導入しないこと
- Three.js は `Sources/vendor/three.module.min.js` と `Sources/vendor/three.core.min.js` のローカル bundle を前提にすること
- 力学計算は正規化単位系、`G = 1.0` を前提にすること
- 既定積分法は引き続き `velocity-verlet` とすること
- compact controls の visible label / visible button text は短縮表示を許容しつつ、accessible name は正式名称を保持すること
- validation panel はエラーがある時だけ表示すること
- Body settings の single-expand card 前提を壊さないこと
- persistence はユーザー再現性を壊さないこと

# Phase 4 の実装要求
## 1. integrator 境界の再構成
Phase 3 の loop と physics engine が `velocity-verlet` 固定で密結合しないように整理してください。

要件は以下とします。

- `simulationConfig.integrator` を実行時に参照すること
- 少なくとも `velocity-verlet` と `rk4` を受け付けること
- main thread 実行と Worker 実行のどちらでも同じ integrator 名を使えること
- loop 側が積分法ごとの分岐詳細を持ちすぎないこと
- 現在の canonical `AppState` を破壊せず、state normalization で未知の integrator を既定値へ戻せること

## 2. RK4 の本実装
比較対象として RK4 を追加してください。

要件は以下とします。

- 4 段の評価で position と velocity を更新すること
- 入力は Phase 3 と同じ Body 配列、`G`、`softening`、`dt` を使うこと
- Body 数最大 10 を前提に、可読性と正しさを優先すること
- 同一初期条件、同一 integrator、同一 step 数では deterministic に再現できること
- `velocity-verlet` と `rk4` の比較時に、少なくとも energy error と経過時間を観測できること

RK4 を追加しても、既定値は `velocity-verlet` のまま維持してください。

## 3. UI と入力制御
integrator を切り替える UI を追加してください。

要件は以下とします。

- compact controls 前提を維持すること
- accessible name は `Integrator` を保持すること
- visible text は `Int` または同等の 4 文字以下の短縮表記に制限すること
- option visible text は `Verlet` と `RK4` を既定とし、意味不明な略称へ変更しないこと
- `idle` 中は変更可能、`running` と `paused` 中は既存編集ロック方針に合わせて扱うこと
- UI 追加で 360px 幅のレイアウトを壊さないこと
- Playwright のラベルベース検証が可能な DOM を維持すること
- Worker 有効化の明示切替 UI を追加する場合は、ユーザー向け常設 control ではなく、検証用途に限定された経路であることを明示すること

## 4. Worker 互換の execution service
physics 実行を main thread 固定から切り離し、Worker と main thread の両方で同じ snapshot 契約を扱える service 境界を作ってください。

要件は以下とします。

- Main thread 側責務は UI、Three.js、localStorage とすること
- Worker 側責務は力計算、数値積分、energy 計算、snapshot 生成とすること
- structured clone 可能な payload に限定すること
- renderer や DOM 参照を Worker 側へ持ち込まないこと
- Worker 初期化失敗時は main thread 実行へ安全に fallback すること
- fallback 時は UI 全体を停止せず、英語の status message で理由を示せること
- request payload と response payload の双方に `runId` と `stepSequence` 相当の世代識別子を含めること
- `runId` または `stepSequence` が現行実行状態と一致しない response は必ず破棄すること

## 5. Worker 本実装
実際に動作する Worker 経路を追加してください。

要件は以下とします。

- `Sources/workers/physics-worker.js` を追加すること
- Worker との message contract を明文化したモジュール境界を持つこと
- Start、Pause、Resume、Reset の各状態遷移で message の取り違えや stale snapshot 反映を起こさないこと
- Reset 直後や integrator 切替後に旧世代の Worker 応答を採用しないこと
- Worker 未対応環境でもアプリが動作継続すること
- 同時に複数の authoritative snapshot を競合反映しないこと

Worker 有効化の最終製品判断は性能測定に基づいて行ってください。Phase 4 では、少なくとも以下のどちらかを必須とします。

1. 実測に基づき main / worker の採用を切り替える deterministic な判定関数を実装すること
2. 既定では main thread としつつ、検証用または明示設定で Worker 経路を有効化できること

どちらを採用しても、Desktop のみ Worker、有効化対象外モバイルでは main thread という製品方針を暗黙導入しないでください。

## 6. simulation pipeline time 計測
Worker 版の評価指標として simulation pipeline time を実装してください。

定義は以下で固定します。

- main thread 版: 1 フレーム内で physics update に要した経過時間
- Worker 版: Main thread から Worker への送信開始から snapshot 受信完了までの往復遅延に、Worker 側計算時間を含めた simulation pipeline time

要件は以下とします。

- runtime metrics として finite な値を表示すること
- 更新停止時を除き 1 秒以上 stale にならないこと
- integrator 比較時に energy error と並べて確認できること
- Worker 版と main thread 版で計測定義が不整合にならないこと
- ベンチマーク条件は Desktop Chrome 最新安定版、Body 数 10、Trail on、60 秒連続実行、カメラ操作なしで固定すること
- 受け入れ目標は FPS 平均 55 以上、FPS 95 パーセンタイル 45 以上、1 フレーム当たりメインスレッド予算 16.7ms 以内とすること
- Worker 版を採用する場合の simulation pipeline time 目標は通常時 4ms 以内、ピーク 8ms 以内とすること

## 7. persistence と hydration
新規設定や比較機能を追加しても、既存の保存復元を壊さないでください。

要件は以下とします。

- `simulationConfig.integrator` を保存復元対象に含めること
- Worker の実行中間状態や in-flight message は persistence に保存しないこと
- 既存 snapshot の migration を壊さないこと
- Reset 復帰先は引き続き `committedInitialState` とすること
- Generate、preset、seed、cameraTarget、showTrails の既存保存対象を欠落させないこと
- 検証用の Worker 強制有効化フラグや debug override を追加する場合、それらは persistence に保存しないこと

## 8. 数値比較と検証ハーネス
Phase 4 では「実装した」だけで終わらず、比較可能であることを重視してください。

少なくとも以下を満たしてください。

- 同一 preset と seed から `velocity-verlet` と `rk4` を同じ step 数だけ実行する比較テストを追加すること
- main thread と Worker で、同一 integrator の結果差が position / velocity 各成分の絶対差 `1e-8` 以下、energy error の絶対差 `1e-8` 以下に収まることを検証すること
- 10,000 step 相当の長時間比較をすべて UI テストへ載せる必要はないが、関数単位または integration test として再現できること
- 性能計測条件として Body 数 10、Trail on、60 秒実行相当の検証観点を文書化すること

## 9. compact UI 契約の維持
Phase 4 の追加 UI は、既存 compact UI 契約を破らないでください。

要件は以下とします。

- 既存の `Count`、`dt`、`Soft`、`Target`、`Trail`、`Gen`、`Run`、`Hold`、`Go`、`Reset` の visible text を不必要に変更しないこと
- 新しい integrator control を追加する場合も、visible text は短く、accessible name は正式名称を保持すること
- validation panel は invalid 時のみ表示すること
- 360px 幅で横スクロールを発生させないこと
- 既存 Playwright テストの意図を壊す DOM 変更を避けること

## 10. 受け入れ基準
少なくとも以下を満たすこと。

1. `simulationConfig.integrator` が `velocity-verlet` と `rk4` の両方を受け付け、保存復元後も保持されること
2. 同一初期条件で 1,000 fixed step 実行した時、`velocity-verlet` と `rk4` の双方が有限な position、velocity、energy error を返すこと
3. RK4 実行時に `NaN`、`Infinity`、破綻した snapshot を renderer に渡さないこと
4. main thread 実行と Worker 実行で、同一 integrator・同一初期条件・同一 step 数の結果差が position / velocity 各成分の絶対差 `1e-8` 以下、energy error の絶対差 `1e-8` 以下に収まること
5. Worker 初期化失敗または Worker 非対応環境でも、main thread へ fallback して Start / Pause / Resume / Reset が継続動作すること
6. Worker 版では simulation pipeline time が finite 値として継続表示され、採用時は通常時 4ms 以内、ピーク 8ms 以内を満たすこと
7. compact controls、single-expand body card、validation panel の既存 UI 契約を壊さないこと
8. 既存 `npm test` と `npm run test:ui` に加えて、Phase 4 で追加した比較テストが通ること
9. `binary-orbit` などの通常 preset で 10,000 step 後の energy relative error が少なくとも仕様の監視対象として算出されること
10. Worker の採用可否を判断するための測定手順または自動判定根拠が、コードまたは README で追跡可能であること
11. ベンチマーク条件下で FPS 平均 55 以上、FPS 95 パーセンタイル 45 以上、1 フレーム当たりメインスレッド予算 16.7ms 以内の判定結果を確認できること

## 11. 実装後に最低限確認する検証項目
実装担当者は、少なくとも以下を確認してください。

1. integrator validation
   - `velocity-verlet` と `rk4` を切り替えて Start し、両方でシミュレーションが継続すること
   - Reset 後に `committedInitialState` と integrator 設定が一致すること
2. worker validation
   - Worker 利用可能環境で Worker 経路を有効化し、Start、Pause、Resume、Reset を順に実行して stale response が混入しないこと
   - Worker を強制失敗させても UI が main thread fallback で継続すること
3. metrics validation
   - FPS、Simulation Time、Energy Error、simulation pipeline time が仕様どおり更新されること
   - main thread 版と Worker 版で metrics 名称と意味が一致していること
4. compact UI validation
   - 360px 幅で追加 control が横溢れしないこと
   - accessible name ベースの Playwright 検証が継続可能であること

# 実装時の判断基準
- Phase 4 の目的は、単に Worker を追加することではなく、「積分法比較」と「Worker 導入可否の性能判断」をできる状態にすることです。
- UI 追加は最小限にし、複雑さは execution service と test harness 側へ寄せてください。
- Worker は導入した時点で正解ではなく、fallback、stale response 防止、測定可能性まで揃って合格とみなしてください。
- RK4 は採用可否の比較対象であり、既定値を安易に変更しないでください。
- 既存 compact UI、validation、persistence、Playwright 契約を壊さないことを合格条件に含めてください。
- 受け入れ基準は manual confirmation だけでなく、可能な範囲で unit test、integration test、browser acceptance test に落とし込める文にしてください。

# 期待する出力
作業完了時は少なくとも以下を示してください。

1. 追加または変更したファイル一覧
2. integrator 境界、Worker message contract、fallback 方針の要約
3. 追加したテストと検証結果
4. 既知の制約、未解決事項、次フェーズへ送るべき論点