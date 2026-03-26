# .github/prompts 一覧

この文書は、.github/prompts 配下で管理している prompt を用途別に参照しやすくするための一覧です。

このリポジトリでは、長期的に参照する実装 prompt と、特定日の作業に紐づく実行 prompt が混在しています。継続利用するものは機能名や phase 名を含むファイル名、単発の作業用は日付付きファイル名で管理しています。

## 用途別の見方

- Phase 1 から Phase 4 の prompt は、N-body simulator 本体の段階的実装に使います。
- repository 全体の修正、性能調査、コメント追加、Sources の整理などは、日付付きまたは目的別 prompt を使います。
- prompt を追加する場合は、frontmatter の `name`、`description`、`argument-hint` を明示し、関連する Plans、Specifications、README、Skill への参照を揃えます。

## Prompt 一覧

| ファイル | 役割 | 主な利用場面 |
| --- | --- | --- |
| [n-body-problem-simulator-webapp.prompt.md](./n-body-problem-simulator-webapp.prompt.md) | リポジトリ全体の開発計画書と Copilot customization 整備の起点 prompt | 開発計画書の新規作成、既存 customization の見直し、skills 更新 |
| [n-body-problem-simulator-phase-1-implementation.prompt.md](./n-body-problem-simulator-phase-1-implementation.prompt.md) | Phase 1 の scaffold 実装 prompt | Sources の初期構造、UI shell、responsible layout foundation の実装 |
| [n-body-problem-simulator-phase-2-validation-persistence.prompt.md](./n-body-problem-simulator-phase-2-validation-persistence.prompt.md) | Phase 2 の validation と persistence 実装 prompt | Body validation、localStorage 保存復元、state hydration の実装 |
| [n-body-problem-simulator-phase-3-physics-loop.prompt.md](./n-body-problem-simulator-phase-3-physics-loop.prompt.md) | Phase 3 の physics loop 実装 prompt | Velocity Verlet、fixed-step loop、playback state 遷移、runtime metrics 更新 |
| [n-body-problem-simulator-phase-4-worker-rk4.prompt.md](./n-body-problem-simulator-phase-4-worker-rk4.prompt.md) | Phase 4 の Worker と RK4 比較実装 prompt | integrator comparison、Worker execution path、simulation pipeline time 計測 |
| [20260326-sources-refactoring.prompt.md](./20260326-sources-refactoring.prompt.md) | Sources 配下全体の段階的リファクタリング prompt | HTML、CSS、JavaScript の責務整理と保守性改善 |
| [20260326-repository-test-and-bugfix-prompt.md](./20260326-repository-test-and-bugfix-prompt.md) | repository 全体テスト実行と bug fix の実行 prompt | npm test、Playwright UI test、失敗分析、root cause 修正 |
| [sourcecode-comment-prompt.md](./sourcecode-comment-prompt.md) | コメント追加作業の計画書と実行 prompt を設計する prompt | Sources 全体への英語コメント追加方針の策定 |
| [20260327-sourcecode-comment-execution.prompt.md](./20260327-sourcecode-comment-execution.prompt.md) | コメント追加を実行する prompt | Sources 配下への保守的な英語コメント追加の実施 |
| [20260327-performance-tuning.prompt.md](./20260327-performance-tuning.prompt.md) | 性能調査と必要最小限の tuning 実行 prompt | hotspot 調査、測定、改善、回帰確認 |

## 使い分けの目安

- 新規 phase の実装や phase 単位の追加作業では、phase 名付き prompt を優先します。
- Sources 全体の構造改善や repository 横断の修正では、目的別または日付付き prompt を使います。
- 計画を作る prompt と、実際に変更を実行する prompt は分けて管理します。
- 単発作業でも再利用価値が高い場合は、日付だけでなく目的が分かる語をファイル名に残します。

## 追加時の最低要件

1. 目的が 1 文で判別できる frontmatter `description` を入れる。
2. 呼び出し時に不足条件を補える `argument-hint` を入れる。
3. 関連する Plans、Specifications、README、Skill への参照を最初の方にまとめる。
4. 実装範囲、対象外、絶対遵守事項、完了条件を日本語で明記する。
5. 現行 UI 契約、永続化契約、renderer fallback 契約と矛盾しないように保つ。