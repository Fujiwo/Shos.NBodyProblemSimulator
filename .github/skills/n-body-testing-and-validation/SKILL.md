---
name: n-body-testing-and-validation
description: Use when designing, implementing, or reviewing tests and validation for this repository's N-body simulator, including state transitions, reproducibility, localStorage restore, UI checks, performance checks, and energy-error verification planning. Japanese triggers: テスト, 検証, 再現性, 状態遷移, 保存復元, FPS, エネルギー誤差.
argument-hint: Describe the test target, acceptance criteria, or validation gap
---

# N-body Testing And Validation

この Skill は、このリポジトリでテスト観点、受け入れ基準、再現性確認、状態遷移検証、保存復元確認を扱う時に使います。

## 使う場面

- `Tests/` 配下の検証コードや検証計画を作る時
- 実装が仕様書の状態遷移に合っているか確認する時
- Generate の再現キーと保存仕様を検証する時
- localStorage 復元や migration の確認をする時
- モバイル UI、FPS、energy error の検証観点を整理する時

## 必須チェック項目

1. 状態遷移を検証する。
   - `idle -> running`
   - `running -> paused`
   - `paused -> running`
   - `running -> idle`
   - `paused -> idle`
   - `any -> idle` by Generate
2. `Reset` が常に `committedInitialState` を復元するか確認する。
3. `running` と `paused` 中に Body 入力が無効化されるか確認する。
4. 同一再現キーで同一結果になるか確認する。
5. 保存後の再読み込みで設定が復元されるか確認する。
6. 破損保存データや version 不一致時のフォールバックを確認する。
7. 360px 幅で UI が破綻しないか確認する。
8. 性能確認では対象ブラウザと測定条件を固定する。
9. エネルギー誤差確認ではステップ数、preset、許容値を明示する。

## 推奨ワークフロー

1. まず仕様書の受け入れ基準をテスト観点へ分解する。
2. 次に、unit 相当、integration 相当、manual validation を分離する。
3. state transition、persistence、rendering を別観点で扱う。
4. 数値検証は UI 挙動確認と混ぜずに扱う。
5. パフォーマンス検証では対象端末、Body 数、trail 条件、ブラウザを固定する。

## レビュー時の優先観点

- 受け入れ基準がテスト項目へ落ちているか。
- 再現性の検証で再現キーが欠けていないか。
- 保存復元確認が happy path のみになっていないか。
- パフォーマンス検証が対象ブラウザを欠いていないか。