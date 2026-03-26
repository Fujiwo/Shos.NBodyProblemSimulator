# レポジトリ全体テスト・バグフィックス計画

## 1. 目的

本計画の目的は、Shos.NBodyProblemSimulator リポジトリ全体に対して、既存仕様と現行 UI 契約を壊さずにテストを実施し、検出された不具合を優先度順に修正し、回帰防止まで完了することです。

本計画は、単なるテスト実行ではなく、以下を一連の完了条件に含む。

- ベースライン把握
- 失敗または不整合の分類
- root cause の特定
- 必要最小限の修正
- 回帰防止テストの追加または更新
- 文書整合の確認

## 2. 対象範囲

対象は以下とする。

- Sources 配下のアプリ実装全体
- Tests 配下の Node テストと Playwright UI テスト
- Plans、Specifications、README、.github 配下の実装拘束に関わる文書
- localStorage 復元、Generate 再現性、状態遷移、Body card UI、renderer fallback、layout 契約

対象外は以下とする。

- サーバーサイド機能の追加
- 新機能提案のみで終わる大規模仕様変更
- 11 体以上を前提とした性能最適化
- 学術精度の再設計

## 3. 前提条件

- 実装はブラウザのみ、HTML5、CSS3、JavaScript ES6+、Three.js、Vanilla JavaScript を前提とする。
- Three.js 実行時依存は Sources/vendor/three.module.min.js と Sources/vendor/three.core.min.js のローカル配布を前提とする。
- UI 文言は英語前提、計画・レビュー・作業記録は日本語前提とする。
- Validation はエラーが存在する時だけ表示する。
- Body settings は各 Body card を独立して開閉でき、同時に複数件を展開できる現行契約を維持する。
- random-cluster の Seed 欄は空欄時に auto seed 採番、invalid non-empty 値では Generate を失敗させる現行仕様を維持する。

運用上の前提は以下とする。

- テストが成功していても、既知の recently fixed 領域は追加確認対象とする。
- 文書と実装が矛盾している場合、実装が正であるか仕様が正であるかを切り分けてから修正する。
- 修正対象外の不具合を見つけても、優先度と影響を記録し、無断で横展開修正しない。

## 4. 成果物

本作業の成果物は以下とする。

1. 失敗テストまたは新規追加テスト
2. 原因を除去したバグ修正コード
3. 必要最小限の仕様・README・レビュー文書更新
4. 実行結果の要約
5. 未解決事項がある場合の残課題一覧

成果物ごとの必須内容は以下とする。

- テスト: 再現対象、期待結果、失敗条件、成功条件が判定可能であること
- コード修正: root cause を除去し、unrelated changes を含まないこと
- 文書更新: 変更した実装契約、保存対象、状態遷移、UI 契約が明記されること
- 結果要約: 実行コマンド、結果、失敗から成功への変化が追跡可能であること

## 5. 実施フェーズ

### 5.1 ベースライン確認

以下をこの順で実行する。

1. npm test
2. npm run test:ui

確認事項は以下とする。

- Node 回帰テストが全件成功するか
- Playwright UI テストが全件成功するか
- 既知の seed、Body card、layout、validation 契約が維持されているか

このフェーズの完了条件は以下とする。

- 実行コマンドと成功失敗の別が記録されていること
- 失敗がある場合、最初の失敗箇所を再現できること
- 全件成功の場合でも、recently fixed 領域の追加確認候補が列挙されていること

### 5.2 失敗分析

テスト失敗がある場合は、以下を必ず整理する。

- 失敗テスト名
- 再現手順
- 影響範囲
- 仕様違反か、テスト誤りか、環境依存か
- root cause

分析時は、各事象を次のいずれかへ必ず分類する。

- 実装修正が必要
- テスト修正が必要
- 文書修正が必要
- 環境要因であり恒久修正対象外

優先順位は以下で固定する。

1. 実行不能、データ破損、状態遷移破綻
2. 再現性破綻、保存復元破綻、Generate 破綻
3. UI 契約破綻、Body card 操作破綻、validation 破綻
4. 文書不整合、テスト不足

このフェーズでは、次の情報が不足している場合は修正へ進まないこと。

- どの仕様に対する違反か
- どの状態で発生するか
- 保存や再現性に影響するか
- 既存テストで検出可能か

### 5.3 修正実装

修正は以下の原則で行う。

- 表面的な回避ではなく root cause を修正する。
- public API と既存 UI 契約をむやみに変えない。
- 物理演算、描画、UI 制御、永続化の責務分離を維持する。
- 不具合に対応するテストが無い場合は先に失敗テストを追加する。
- unrelated changes は修正対象に含めない。

修正実装時の厳格ルールは以下とする。

- テストだけを直して実装不具合を覆い隠さないこと
- public API、状態 shape、localStorage 保存境界を無断で変更しないこと
- `running` と `paused` 中の入力無効化契約を壊さないこと
- compact controls、multi-open Body card、Seed placeholder 契約を壊さないこと
- Three.js 初期化失敗時の 2D fallback 継続契約を壊さないこと

### 5.4 回帰防止

修正後は以下を実施する。

1. 追加または更新したテストを再実行する。
2. npm test を再実行する。
3. npm run test:ui を再実行する。
4. 文書と実装の矛盾が残っていないか grep で確認する。

grep 確認では少なくとも以下を対象にする。

- stale UI 契約文言
- single-expand などの旧 Body card 仕様
- Seed 空欄 / invalid seed の旧仕様文言
- 実装済み挙動と矛盾するレビュー記述

### 5.5 報告

最終報告には以下を含める。

- 修正した不具合一覧
- 追加または更新したテスト一覧
- 実行したコマンドと結果要約
- 残課題があればその内容と影響

報告は、以下の順で記述する。

1. Findings または修正対象
2. 実施した修正
3. 更新したテスト
4. 実行結果
5. 残課題

## 6. 重点確認観点

### 6.1 状態遷移

- idle -> running
- running -> paused
- paused -> running
- running -> idle by Reset
- paused -> idle by Reset
- any -> idle by Generate

### 6.2 Generate と再現性

- preset ごとの再現キーが欠けていないか
- random-cluster の Seed 空欄が auto seed として処理されるか
- invalid non-empty seed が Generate をブロックするか
- Generate 後に committedInitialState が更新されるか

### 6.3 保存復元

- localStorage 読み込み後に state hydration が正規化されるか
- selectedBodyId、cameraTarget、expandedBodyPanels が現在の bodies と整合するか
- playbackState が常に idle に正規化されるか

### 6.4 UI 契約

- compact controls の visible text と accessible name が維持されるか
- Validation がエラー時のみ表示されるか
- Body card が独立して開閉できるか
- Seed 欄の placeholder が現行仕様どおり切り替わるか
- large layout の controls と metrics overlay 契約が維持されるか

### 6.5 renderer fallback

- Three.js 初期化失敗時に 2D fallback で継続するか
- texture unavailable 理由が status message に反映されるか

## 7. 受け入れ基準

以下をすべて満たした場合に完了とする。

1. npm test が成功すること
2. npm run test:ui が成功すること
3. 追加した不具合修正に対する回帰テストが存在すること
4. 仕様書、README、.github 指示、レビュー文書のうち変更が必要なものが更新されていること
5. 新たな高優先度不具合を持ち込んでいないこと

補助受け入れ基準は以下とする。

- root cause が説明できること
- recently fixed 領域について追加回帰がないこと
- 更新した文書が現行 UI 契約と矛盾しないこと
- 保存復元と Generate 再現性の契約が曖昧表現のまま残っていないこと

## 8. 実装ルール

- 変更は最小限かつ局所的に行う。
- ドキュメント変更だけで解決できない不具合は実装で直す。
- テストだけを修正して実装不具合を覆い隠さない。
- 既存の dirty worktree を無断で巻き戻さない。
- コミットやブランチ作成は本計画に含めない。

禁止事項は以下とする。

- `git reset --hard` などの破壊的操作
- 根拠のないリファクタリング拡大
- 失敗分析を飛ばしたままの一括修正
- Node テストのみ成功で UI テストを省略して完了扱いにすること

## 9. 推奨実行順

1. ベースラインテスト実行
2. 失敗分析
3. 再現テスト追加
4. バグ修正
5. Node テスト再実行
6. UI テスト再実行
7. 文書整合確認
8. 結果報告

## 10. 停止条件

以下に該当する場合は、修正を打ち切って状況を報告する。

- 原因が外部依存または環境不備であり、リポジトリ内で閉じて修正できない
- 既存仕様同士が矛盾し、実装の正否を一意に決められない
- 3 回以内の修正試行で同一障害が解消せず、追加判断が必要

## 11. 証跡管理

各修正では、少なくとも以下の証跡を残せる状態にする。

- 失敗前の症状
- 修正対象ファイル
- 追加または更新したテスト
- 修正後のテスト結果
