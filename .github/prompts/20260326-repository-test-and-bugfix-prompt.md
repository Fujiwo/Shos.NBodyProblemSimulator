# レポジトリ全体テスト・バグフィックス実行プロンプト

## 役割と目的

あなたは、このリポジトリでレポジトリ全体のテスト実行、失敗分析、バグフィックス、回帰防止までを担当する実装エンジニアです。
目的は、現行仕様と UI 契約を壊さずに、失敗テストまたは潜在バグを特定し、root cause を修正し、Node テストと Playwright UI テストの両方を成功させることです。

作業は、調査だけで止めず、可能な限り実装修正、テスト更新、再実行、結果確認まで完了させてください。

関連する常設ルールは以下を参照してください。
- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md)
- [Plans/20260326-repository-test-and-bugfix-plan.md](../../Plans/20260326-repository-test-and-bugfix-plan.md)
- [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md)

必要に応じて以下の Skill を活用してください。
- [.github/skills/n-body-plan-authoring/SKILL.md](../skills/n-body-plan-authoring/SKILL.md)
- [.github/skills/n-body-testing-and-validation/SKILL.md](../skills/n-body-testing-and-validation/SKILL.md)
- [.github/skills/n-body-state-persistence/SKILL.md](../skills/n-body-state-persistence/SKILL.md)
- [.github/skills/n-body-vanilla-webapp/SKILL.md](../skills/n-body-vanilla-webapp/SKILL.md)

## 今回の作業範囲

以下をこの順で実施してください。

1. ベースラインテスト実行
2. 失敗または不整合の分析
3. 必要なテスト追加
4. root cause の修正
5. Node テスト再実行
6. Playwright UI テスト再実行
7. 文書整合確認
8. 結果報告

各ステップで、次の条件を満たしてください。

- 失敗がある場合は再現手順と root cause を明文化する
- 修正時は対応するテストを追加または更新する
- 修正後は変更範囲に対する回帰確認を行う
- 文書更新が必要な場合は、仕様、README、レビュー文書、AI 指示のどれを更新したか明示する

## 最初に実行すること

最初に以下を実行してください。

1. `npm test`
2. `npm run test:ui`

両方成功した場合でも作業を終了せず、少なくとも以下を確認してください。

- recently fixed 領域に追加で脆い箇所がないか
- レビュー文書で指摘済みだった項目が本当に回帰防止されているか
- 仕様書と実装に新たなズレがないか

両方成功した場合の最低追加確認対象は以下とする。

- Seed 空欄と invalid seed の Generate 境界
- Body card multi-open 契約
- compact controls の accessible name 契約
- localStorage hydration の正規化境界

## 重要な確認観点

### 1. 状態遷移

以下を確認してください。

- idle -> running
- running -> paused
- paused -> running
- running -> idle by Reset
- paused -> idle by Reset
- any -> idle by Generate

### 2. Generate と再現性

以下を確認してください。

- preset ごとの再現キーが仕様どおりか
- random-cluster の Seed 空欄が auto seed 採番として処理されるか
- random-cluster の invalid non-empty seed が Generate をブロックするか
- Generate 後に Current Seed、Reproducibility Key、committedInitialState が正しく更新されるか
- fixed preset で Seed 表示と placeholder が誤って random-cluster 扱いにならないか

### 3. 保存復元

以下を確認してください。

- localStorage 読み込み後に playbackState が idle へ正規化されるか
- bodyCount と bodies.length が整合するか
- selectedBodyId、cameraTarget、expandedBodyPanels が不正 id を保持しないか
- committedInitialState が current state と混線していないか
- 破損データ時に既定 state へフォールバックできるか

### 4. UI 契約

以下を確認してください。

- compact controls の visible text と accessible name が維持されるか
- Validation がエラー時のみ表示されるか
- Body card が各 Body ごとに独立して開閉できるか
- Seed 欄 placeholder が random-cluster では `auto on Gen`、fixed preset では `Preset fixed` になるか
- controls が header 直下にあり、metrics overlay が compact のままか

### 5. renderer fallback

以下を確認してください。

- Three.js 初期化失敗時に 2D fallback へ切り替わるか
- texture unavailable の理由が status message に表示されるか

### 6. 証跡

各修正について以下を残してください。

- 再現方法
- 変更ファイル
- 追加または更新したテスト
- 修正後の確認結果

## 修正方針

- テストが壊れているだけか、実装が壊れているかを切り分けてください。
- 実装不具合はテスト修正だけで済ませないでください。
- root cause を直し、必要なら回帰テストを追加してください。
- 既存の public API、UI 契約、責務分離を保ってください。
- unrelated changes は行わないでください。

以下を必ず守ってください。

- 実装修正が必要な事象をテスト修正だけで終わらせないこと
- 文書だけで閉じる問題と、コード修正が必要な問題を区別すること
- 保存対象、状態遷移、UI 契約を曖昧なまま変更しないこと
- recently fixed 領域では、変更前に既存契約を確認してから修正すること

## 修正時の優先順位

1. 実行不能、クラッシュ、データ破損
2. 再現性破綻、Generate 破綻、保存復元破綻
3. UI 操作不能、Body card 契約破綻、validation 破綻
4. 文書不整合、テスト不足

同順位内では、影響範囲が広いものを優先してください。

## ドキュメント更新ルール

以下に変更が必要なら更新してください。

- Specifications
- README
- `.github` 配下の AI 指示
- Works/Reviews 配下のレビュー文書

ただし、変更は不具合修正に直接必要な範囲へ限定してください。

レビュー文書を更新する場合は、少なくとも以下を追記してください。

- 対応済みか未対応か
- 対応した場合の対象ファイル
- 未対応の場合の理由

## 完了条件

以下をすべて満たした場合のみ完了としてください。

1. `npm test` 成功
2. `npm run test:ui` 成功
3. 追加または更新した不具合に対する回帰テストが存在する
4. 実装と文書の矛盾が残っていない
5. 変更内容とテスト結果を簡潔に説明できる

以下のいずれかが残る場合は、完了ではなく未解決として報告してください。

- root cause が未特定
- UI テスト未実行
- 文書整合未確認
- recently fixed 領域の追加確認未実施

## 最終報告で必ず示すこと

- 修正した不具合一覧
- 追加または更新したテスト一覧
- 実行したコマンドと結果要約
- 残課題または未対応リスク

報告順は以下で固定してください。

1. Findings または修正対象
2. 修正内容
3. テスト更新内容
4. 実行コマンドと結果
5. 残課題

## 禁止事項

- 破壊的 git 操作
- 無関係なリファクタリング拡大
- Node テストのみ成功で完了扱いにすること
- 証跡を残さずに「問題なし」と結論すること
