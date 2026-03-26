# Repository Review 2026-03-26 15:59:01

## Scope

- 対象: `Sources/`, `Tests/`, `Plans/`, `Specifications/`, `README.md`, `.github/skills/`, `.github/copilot-instructions.md`
- 観点: バグ、仕様不整合、将来の回帰要因、テスト不足
- 備考: 所見は、読み取りと相互照合で裏付けできた高信頼のものだけに絞った。

## Findings

### 1. High: `.github` 配下の作業指示が、現行の Body card 契約と矛盾している

対応状況: 対応済み。2026-03-26 に `.github/copilot-instructions.md`、`.github/skills/n-body-state-persistence/SKILL.md`、`.github/skills/n-body-vanilla-webapp/SKILL.md`、`.github/skills/n-body-testing-and-validation/SKILL.md` を multi-open 前提へ更新した。

現行実装とテストは、Body card の複数同時オープンを前提にしている。実装側では `data-open` を各カードに持たせており、[Sources/app/ui-shell.js#L107](../../Sources/app/ui-shell.js#L107) で各 Body card が独立状態を持つ。テスト側でも [Tests/simulation-controller.test.mjs#L98](../../Tests/simulation-controller.test.mjs#L98) で 3 枚同時オープンを期待している。

一方で、将来の実装を誘導する `.github` 配下の指示は、いまも single-expand を要求している。

- [.github/copilot-instructions.md#L16](../../.github/copilot-instructions.md#L16)
- [.github/skills/n-body-state-persistence/SKILL.md#L45](../../.github/skills/n-body-state-persistence/SKILL.md#L45)
- [.github/skills/n-body-vanilla-webapp/SKILL.md#L62](../../.github/skills/n-body-vanilla-webapp/SKILL.md#L62)
- [.github/skills/n-body-testing-and-validation/SKILL.md#L39](../../.github/skills/n-body-testing-and-validation/SKILL.md#L39)

### Impact

- 以後の AI 支援実装やレビューが、正しい現行挙動ではなく、古い single-expand 契約へ戻そうとする。
- persistence 方針、UI 実装方針、テスト観点が同時に誤誘導されるため、回帰の再発点になる。
- 実際にこのセッションでも、Body card 回帰の根本原因調査で契約不整合が問題になっているため、理論上の懸念ではない。

### Recommendation

- 上記 4 ファイルの single-expand / 最大 1 件という記述を multi-open 前提へ更新する。
- `expandedBodyPanels` の正規化説明も、"存在しない body を落とす" 方向に修正し、開ける件数上限を削除する。
- テスト方針も、"最大 1 件" ではなく、"独立して開閉できること" を確認対象に置き換える。

### 2. Medium: `random-cluster` の invalid seed 入力時に、Generate が現在入力ではなく直前の有効 seed を使って成功してしまう

対応状況: 対応済み。2026-03-26 に [Sources/app/simulation-controller.js](../../Sources/app/simulation-controller.js) を修正し、invalid non-empty seed の Generate をブロックするよう更新した。あわせて [Tests/simulation-controller.test.mjs](../../Tests/simulation-controller.test.mjs) と [Tests/ui-acceptance.spec.mjs](../../Tests/ui-acceptance.spec.mjs) に回帰テストを追加し、Seed 欄が空欄のときに auto 生成予定だと分かる UI 文言も追加した。

`updateSimulationConfig("seed", rawValue)` は、seed が不正なとき canonical state を更新せず、draft だけを保持する。[Sources/app/simulation-controller.js#L285](../../Sources/app/simulation-controller.js#L285) と [Sources/app/simulation-controller.js#L300](../../Sources/app/simulation-controller.js#L300) がその境界になっている。

しかし `generate()` は draft seed を検証せず、空文字のときだけ `null` を使い、それ以外は常に canonical state 側の `appState.simulationConfig.seed` を渡している。[Sources/app/simulation-controller.js#L567](../../Sources/app/simulation-controller.js#L567)

その結果、ユーザーが不正な non-empty seed を入力したまま Generate すると、Generate は失敗せず、直前の有効 seed で成功扱いになる。成功メッセージも [Sources/app/simulation-controller.js#L584](../../Sources/app/simulation-controller.js#L584) でその seed を表示するため、入力欄で試した値と実際に使われた値が乖離する。

仕様側では、`random-cluster` で seed は必須であり、未指定なら現在時刻由来の整数を採用する一方、Generate 失敗時は前回有効状態を保持することが求められている。

- [Specifications/n-body-problem-simulator-specification.md#L153](../../Specifications/n-body-problem-simulator-specification.md#L153)
- [Specifications/n-body-problem-simulator-specification.md#L155](../../Specifications/n-body-problem-simulator-specification.md#L155)
- [Specifications/n-body-problem-simulator-specification.md#L156](../../Specifications/n-body-problem-simulator-specification.md#L156)
- [Specifications/n-body-problem-simulator-specification.md#L575](../../Specifications/n-body-problem-simulator-specification.md#L575)

### Impact

- ユーザーは現在の入力値で再現キーを変えたつもりでも、実際には古い seed で生成される。
- 再現性の理解を壊し、Generate 後に seed 欄と結果が食い違って見える。
- 不正入力が "エラー表示付き成功" になるため、失敗条件が曖昧になる。

### Recommendation

- `random-cluster` で seed draft が invalid non-empty の場合は Generate を失敗扱いにして、前回有効状態を保持する。
- もしくは Generate 前に invalid draft を canonical state へ昇格させず、明示的に validation error を返して処理を中断する。
- 併せて controller テストと UI テストに invalid seed Generate ケースを追加する。

## Residual Risk

- invalid seed の Generate 経路については controller テストと UI テストを追加済みである。
- 今後は Seed placeholder や status message の変更時に、compact UI 契約と再現性表示の両方を同時に確認しないと回帰しやすい。

## Summary

- High 指摘だった `.github` 配下の stale guidance は修正済み。
- Medium 指摘だった `random-cluster` の invalid seed 時の Generate 挙動も修正済みで、controller と UI の回帰テストを追加した。
- ほかの候補所見も確認したが、レビューへ残したのは、再現性と根拠が十分なものに限定した。