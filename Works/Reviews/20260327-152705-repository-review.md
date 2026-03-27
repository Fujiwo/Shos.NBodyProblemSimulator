# Repository Review 2026-03-27 15:27:05

## Scope

- 対象: [Sources](../../Sources), [Tests](../../Tests), [Specifications](../../Specifications), [Plans](../../Plans), [README.md](../../README.md), [README.ja.md](../../README.ja.md), [.github/copilot-instructions.md](../../.github/copilot-instructions.md), [.github/skills](../../.github/skills), [.github/prompts](../../.github/prompts)
- 観点: バグ、仕様不整合、回帰要因、テスト不安定性、テスト不足、stale guidance
- 実施した確認:
  - `npm test` は成功
  - `npm run test:ui` は 1 回目に 3 failures で失敗、単一 worker 実行は 13/13 成功、既定並列設定の再実行は成功
- 備考: 所見は、実装・テスト・文書の相互照合または今回の実行ログで裏付けできた高信頼のものに限定した。

## Findings

High severity の所見は今回の確認範囲では確定しなかった。

### 1. Medium: Playwright UI 受け入れテストが並列実行時に flaky で、回帰検知の信頼性を落としている

`npm run test:ui` は今回のレビューで 1 回目に失敗し、`body cards toggle independently and body inputs lock while running`、`random preset generate keeps the first body much heavier than the rest`、`invalid random-cluster seed stays blocked in the browser` の 3 件が `Target page, context or browser has been closed` で落ちた。失敗ログには headless Chromium 側の WebGL stall 出力も含まれていた。一方で、同じスイートを単一 worker で実行すると 13 件すべて成功し、既定の並列設定での再実行も成功した。したがって、現行 UI スイートは deterministic failure ではなく flaky failure を抱えている。

並列実行は [playwright.config.mjs](../../playwright.config.mjs#L6-L23) で `fullyParallel: true` に固定されている。UI テスト本体は [Tests/ui-acceptance.spec.mjs](../../Tests/ui-acceptance.spec.mjs#L1-L20) と [Tests/ui-acceptance.spec.mjs](../../Tests/ui-acceptance.spec.mjs#L164-L280) にあり、Three.js / canvas を使う実ブラウザケースを同じ設定で並列消化している。

Impact:

- `npm run test:ui` の成功可否が実装の健全性だけでなく実行タイミングにも左右される。
- CI やローカル確認で false negative が出るため、回帰検知の信頼性が下がる。
- UI 契約の変更がなくてもテストが不安定だと、将来のレビューやリファクタリング時にノイズが増える。

Recommendation:

- WebGL / canvas を使う UI acceptance を単一 worker へ制限するか、描画負荷の高いケースだけ serial 化する。
- 少なくとも flaky が確認されるケースに retry か worker 分離を入れる。
- 失敗時の `executionNotice`、renderer mode、browser console を artifact として残し、クラッシュ原因が app 側か headless Chromium 側かを継続観測できるようにする。

### 2. Medium: `?execution=worker` のブラウザ起動経路は文書で重視されているのに、回帰テストで直接検証されていない

実装では [Sources/app/bootstrap.js](../../Sources/app/bootstrap.js#L19-L25) が `documentRef.location.href` の `execution` query parameter を読んで execution mode を決定する。README でも [README.md](../../README.md#L73) と [README.md](../../README.md#L277-L283) で `?execution=worker` を明示的な検証手順として案内している。さらにベンチマークスクリプトも [Tests/benchmark-phase4.mjs](../../Tests/benchmark-phase4.mjs#L48-L70) で `/?execution=main` と `/?execution=worker` を直接開く。

しかし、UI acceptance は [Tests/ui-acceptance.spec.mjs](../../Tests/ui-acceptance.spec.mjs#L4-L11) の `page.goto("/")` だけを使い、browser-level に query parameter を渡すケースを持たない。bootstrap の unit テストも [Tests/bootstrap.test.mjs](../../Tests/bootstrap.test.mjs#L223-L236) で `documentRef.location.href` を変えず、`globalThis.__N_BODY_EXECUTION_MODE__` override に依存している。そのため、URL query から Worker を選ぶ実際の起動経路は、README と benchmark で重要視されている割に、日常の回帰スイートでは直接守られていない。

Impact:

- `?execution=worker` の URL 解決や bootstrap wiring が壊れても、`npm test` と `npm run test:ui` の両方をすり抜ける。
- Worker ベンチマークや README の検証手順が、日常回帰と切り離された fragile path になる。
- query parameter ベースの運用が将来 stale code path になりやすい。

Recommendation:

- UI acceptance に `/?execution=worker` を開く最小ケースを追加し、少なくとも execution mode の status / fallback 表示を検証する。
- bootstrap unit テストにも URL query parameter を直接使うケースを 1 本追加する。
- benchmark 専用確認に依存せず、通常回帰で documented path を守る。

### 3. Medium: 開発計画書だけが DT / SOFT の 3 桁表示ルールに追随しておらず、現行仕様と矛盾している

現行仕様と README、UI テストは、Time Step と Softening の controls input だけ 3 桁表示に更新済みである。仕様書は [Specifications/n-body-problem-simulator-specification.md](../../Specifications/n-body-problem-simulator-specification.md#L430-L434)、README は [README.md](../../README.md#L128-L133)、UI テストは [Tests/ui-acceptance.spec.mjs](../../Tests/ui-acceptance.spec.mjs#L53-L58) がその前提で揃っている。

一方、開発計画書は [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md#L269-L276) で、controls の数値 input を含め UI 実数値を一律 2 桁と書いている。ここだけが古い契約を保持しており、今後この計画書を起点に作業する実装・レビュー・プロンプト生成を誤誘導する。

Impact:

- 仕様、README、テスト、実装は揃っていても、開発計画書を読む作業者だけが古い 2 桁契約へ引っ張られる。
- DT / SOFT 表示の意図が再度巻き戻る回帰要因になる。
- AI 指示や将来の作業計画へ stale guidance が再流入しやすい。

Recommendation:

- [Plans/n-body-problem-simulator-development-plan.md](../../Plans/n-body-problem-simulator-development-plan.md) の表示桁数ルールを、仕様書と同じく「原則 2 桁、Time Step と Softening の controls input は 3 桁」に更新する。
- 変更後は README / specification / plan の 3 文書で同じ文言粒度に揃える。

### 4. Low: `benchmark:phase4` は Worker fallback を「失敗扱い」と記録するが、コマンド自体は成功終了するため運用ミスを見逃しやすい

ベンチマークスクリプトは [Tests/benchmark-phase4.mjs](../../Tests/benchmark-phase4.mjs#L118-L160) で `workerFallbackDetected` と `summary.overallStatus = "fallback-detected"` を生成し、note でも `Treat this run as a failed worker benchmark.` と書く。しかし、その後の処理は [Tests/benchmark-phase4.mjs](../../Tests/benchmark-phase4.mjs#L170-L196) のとおり JSON を出力して終了するだけで、fallback 検知時に non-zero exit へ変えない。

README も [README.md](../../README.md#L277-L285) で CI は `latest.ci.json` を評価すると書いており、外部の読み手が JSON をきちんと解釈する前提になっている。したがって、`npm run benchmark:phase4` を単独で成功可否判断に使う運用では、Worker fallback が起きてもコマンド成功として見えてしまう。

Impact:

- ローカル運用や単純な CI では、Worker fallback を失敗として扱い忘れやすい。
- ベンチマーク結果が「計測はできた」と誤解され、Worker backend の健全性判断を誤る恐れがある。

Recommendation:

- CI 用 strict mode を追加し、`workerFallbackDetected` なら non-zero exit にする。
- あるいは README に、`benchmark:phase4` 単体の終了コードではなく `latest.ci.json` の確認が必須であることをさらに明示する。

## Open Questions Or Assumptions

- UI テストの flaky failure は headless Chromium の WebGL 安定性に強く依存している可能性があり、app 側の論理不具合と断定はしていない。
- `?execution=worker` の browser-level coverage については、benchmark スクリプトで間接確認はされているが、日常の回帰テストへ組み込まれていない点をギャップとして扱った。

## Residual Risk

- `npm test` は安定して通るが、実ブラウザ並列テストの安定性が低いままだと将来の UI 変更レビューでノイズが続く。
- 文書系では、今回確認した stale guidance 以外にも旧計画書に部分的な契約差分が残る可能性がある。
- Worker 経路は unit / benchmark で確認されている一方、documented browser path の回帰検知が弱いままである。

## Summary

- High severity の所見は今回の確認範囲では確定しなかった。
- 主要な所見は、UI acceptance の flaky parallel execution、`?execution=worker` の browser-level regression gap、開発計画書の stale decimal guidance、benchmark fallback の成功終了リスクの 4 件である。
- 実装・仕様・README・主要テストの整合は概ね取れており、現時点の中心課題は「壊れている本体機能」よりも「回帰検知の信頼性」と「stale guidance の残り」である。
