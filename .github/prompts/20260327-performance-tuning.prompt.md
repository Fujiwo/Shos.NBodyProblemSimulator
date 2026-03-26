---
name: performance-tuning
description: Investigate performance bottlenecks in the N-body simulator, measure hotspots, and implement only justified tuning changes while preserving simulation accuracy, UI contracts, persistence contracts, and renderer fallback behavior.
argument-hint: Describe the target hotspot, measurement scope, or whether you want investigation only or investigation plus tuning
agent: agent
---

# パフォーマンス調査・チューニング実行プロンプト

## 役割と目的

あなたは、このリポジトリの N-body simulator について、性能ボトルネックを測定ベースで調査し、必要性と効果が確認できた箇所に限定して安全にチューニングを実施する実装エンジニアです。

目的は、[Plans/20260327-performance-tuning-plan.md](../../Plans/20260327-performance-tuning-plan.md) に従って、感覚的な最適化ではなく、実測に基づく改善を行うことです。

調査だけで終える場合でも、どこが支配的コストで、なぜ今は未対応なのかを明確に報告してください。チューニングを実施する場合は、変更理由、測定結果、回帰確認まで完了してください。

## 最初に確認する資料

以下を最初に読んで前提を揃えてください。

- [.github/copilot-instructions.md](../copilot-instructions.md)
- [Plans/20260327-performance-tuning-plan.md](../../Plans/20260327-performance-tuning-plan.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)
- [README.md](../../README.md)

必要に応じて以下の Skill を活用してください。

- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-testing-and-validation/SKILL.md](../skills/n-body-testing-and-validation/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)
- [.github/skills/n-body-state-persistence/SKILL.md](../skills/n-body-state-persistence/SKILL.md)
- [.github/skills/n-body-threejs-rendering/SKILL.md](../skills/n-body-threejs-rendering/SKILL.md)

## 対象範囲

主対象は以下です。

- [Sources/app/physics-engine.js](../../Sources/app/physics-engine.js)
- [Sources/app/simulation-loop.js](../../Sources/app/simulation-loop.js)
- [Sources/app/simulation-execution.js](../../Sources/app/simulation-execution.js)
- [Sources/app/runtime-state.js](../../Sources/app/runtime-state.js)
- [Sources/app/ui-shell.js](../../Sources/app/ui-shell.js)
- [Sources/app/renderer-facade.js](../../Sources/app/renderer-facade.js)
- [Sources/app/three-scene-host.js](../../Sources/app/three-scene-host.js)
- [Sources/app/renderer-helpers.js](../../Sources/app/renderer-helpers.js)
- [Sources/app/layout-service.js](../../Sources/app/layout-service.js)
- [Sources/workers/physics-worker.js](../../Sources/workers/physics-worker.js)

必要に応じて関連テストや benchmark harness も更新対象に含めてください。

以下は編集してはいけません。

- [Sources/vendor/three.module.min.js](../../Sources/vendor/three.module.min.js)
- [Sources/vendor/three.core.min.js](../../Sources/vendor/three.core.min.js)

## 絶対遵守事項

1. 計測結果なしに micro-optimization を乱発しないこと
2. 精度要件や状態契約を暗黙に下げないこと
3. 物理演算、描画、UI 制御、永続化の責務分離を弱めないこと
4. `sample`、`binary-orbit`、`random-cluster` の preset 契約を壊さないこと
5. `sample` と `binary-orbit` の fixed preset が seed を使わない契約を壊さないこと
6. `random-cluster` の再現キー、seed 契約、bodyCount 契約を壊さないこと
7. localStorage の hydration、normalization、`PERSISTENCE_POLICY` を壊さないこと
8. compact controls、accessible name、validation 表示条件、Body card 複数展開契約を壊さないこと
9. Three.js 初期化失敗時の 2D fallback と status message 契約を壊さないこと
10. UI 表示値の小数 2 桁表示契約を壊さないこと

## 実行順序

以下の順で進めてください。

1. ベースライン把握
2. hotspot 候補の列挙
3. 計測方法の決定
4. 必要最小限の instrumentation 追加
5. 実測
6. チューニング対象の選定
7. 必要時のみチューニング実装
8. テスト更新
9. `npm test`
10. `npm run test:ui`
11. 必要に応じて `npm run benchmark:phase4`
12. 結果報告

## ベースライン把握で必ず行うこと

1. `npm test` を実行する
2. `npm run test:ui` を実行する
3. 必要に応じて `npm run benchmark:phase4` を実行する
4. 各実行結果を記録する
5. 変更前の支配的コスト候補を仮説として列挙する

ベースラインが失敗している場合は、今回の変更起因と既存不具合を区別してください。

## 最低限調べる hotspot 候補

### 1. 物理計算

- `computeAccelerations`
- `stepVelocityVerlet`
- `stepRk4`
- bodyCount 10 時の $O(n^2)$ コスト

### 2. シミュレーションループ

- `requestAnimationFrame` ごとの仕事量
- pipeline time の内訳
- pending request と worker round-trip overhead

### 3. UI 更新

- `ui-shell` の全体再描画頻度
- body card list 全再生成の有無
- metrics 更新の頻度と必要性

### 4. 描画

- trail 更新コスト
- mesh 更新コスト
- camera frame 解決と renderer 呼び出し回数

## チューニング実施条件

以下を満たした場合のみ実装変更してください。

1. hotspot が実測で支配的と確認できた
2. 何を減らす変更なのか説明できる
3. 回帰リスクが管理可能である
4. 変更後の改善を比較できる

改善が小さい、または契約破壊リスクが高い場合は、未実施として記録してください。

## 実装候補の例

測定結果に応じて、以下を検討して構いません。

- 不要な DOM 再構築の抑制
- metrics 更新頻度の制御
- per-frame allocation の削減
- 重複計算の削減
- trail 更新の条件分岐整理
- worker 通信 payload の縮小

ただし、測定なしで採用してはいけません。

## テスト更新ルール

変更に応じて以下を更新してください。

- Node テスト
- Playwright UI テスト
- benchmark 補助コードがある場合は関連検証

最低回帰確認対象は以下です。

- `sample` preset の fixed dataset 契約
- `binary-orbit` の fixed preset 契約
- `random-cluster` の empty seed と invalid seed
- `bodyCount` と body card 件数の同期
- `running` / `paused` 中の入力 lock
- localStorage 破損時の fallback
- Three.js fallback
- UI 表示値の小数 2 桁表示

## 完了条件

以下をすべて満たした場合のみ完了としてください。

1. hotspot 候補と測定結果を説明できる
2. 実施した変更に改善根拠があるか、未実施理由がある
3. `npm test` が成功する
4. `npm run test:ui` が成功する
5. 必要なら benchmark 比較結果がある
6. preset、UI、保存復元、renderer fallback 契約が回帰していない

## 最終報告の形式

以下の順で報告してください。

1. 調査対象と測定条件
2. hotspot 候補
3. 実施した計測
4. 実施したチューニング、または未実施理由
5. 更新したファイル
6. 更新したテスト
7. 実行コマンドと結果
8. 残課題と次の優先候補

## 禁止事項

- vendor code の編集
- 測定なしの思いつき最適化
- 精度や契約を暗黙に下げる変更
- テスト未実行のまま完了扱いにすること
- 調査結果を記録せずに終えること