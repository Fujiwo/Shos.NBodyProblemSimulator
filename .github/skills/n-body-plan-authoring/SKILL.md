---
name: n-body-plan-authoring
description: Use when creating, revising, or reviewing prompts, specifications, plans, or WBS documents for this repository's 3D N-body simulator. Japanese triggers: 計画書, 仕様書, プロンプト, WBS, レビュー. Ensures physics requirements are complete, acceptance criteria are measurable, UI and persistence rules are explicit, and implementation ambiguity is removed.
argument-hint: Describe the target document and whether you want drafting, review, or revision
---

# N-body Plan Authoring

この Skill は、このリポジトリにおける計画書、仕様書、プロンプト、レビュー用ドキュメントを作成または改訂する時に使います。

## 使う場面

- `.github/prompts/` 配下の prompt file を設計・修正する時
- `Plans/` 配下の開発計画書を作る時
- Specifications 配下の仕様書を具体化する時
- 計画や仕様のレビューで、実装上の曖昧さを洗い出す時

## 必須チェック項目

1. 初期条件が完全か確認する。
   - Body ごとの質量、初期位置ベクトル、初速度ベクトルが定義されているか。
2. Generate の仕様が明確か確認する。
   - 何を生成するか。
   - seed または preset の再現性をどう扱うか。
   - 生成後に何を localStorage へ保存するか。
   - どの表示状態を reset するか。
3. シミュレーション制御が明確か確認する。
   - Start だけでなく Pause、Resume、Reset の扱いを定義しているか。
4. 性能と精度の評価軸が定量化されているか確認する。
   - 対象端末。
   - 目標 FPS。
   - 1 フレーム当たりの計算予算。
   - エネルギー誤差や軌道破綻の評価方法。
5. 数値積分の比較が十分か確認する。
   - RK4。
   - Velocity Verlet などのシンプレクティック積分。
   - 時間刻み戦略。
   - 重力軟化の必要性。
6. 実装移行しやすい構成になっているか確認する。
   - ロジックと描画の分離。
   - Web Worker の採否。
   - 将来ファイル構成案。
7. UI 表示仕様が現行実装と矛盾していないか確認する。
   - visible label / visible button text と accessible name の対応。
   - Validation を常時表示するか、エラー時のみ表示するか。
   - Body card の同時展開数。
   - Large レイアウト時の左カラム幅。

## 推奨ワークフロー

1. まず非交渉要件を抽出する。
   - ブラウザのみ。
   - HTML5、CSS3、JavaScript ES6+。
   - Three.js 必須。
   - Vanilla JavaScript。
   - localStorage。
   - 2 体から 10 体。
2. 次に、要件不足と矛盾を先に潰す。
3. その後で、UI、アルゴリズム、データ構造、テスト、リスクの順に具体化する。
4. 最後に、各セクションが次の実装担当者にとって判断可能な文になっているか見直す。

## 出力の期待値

- 日本語で簡潔に書く。
- 数値または判定可能な条件を優先する。
- 「適切」「十分」だけで終わらせない。
- レビュー時は、重大な欠落と矛盾を先に挙げる。