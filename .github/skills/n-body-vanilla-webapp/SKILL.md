---
name: n-body-vanilla-webapp
description: Use when implementing, refactoring, or reviewing the browser-based 3D N-body simulator in this repository. Japanese triggers: 実装, 改修, リファクタリング, 描画, localStorage, バリデーション. Guides a Vanilla JavaScript plus Three.js architecture with separated physics and rendering, worker-friendly simulation loops, localStorage persistence, and responsive controls for 2 to 10 bodies.
argument-hint: Describe the feature, bug, or files to work on
---

# N-body Vanilla Webapp

この Skill は、将来 `Sources/` や `Tests/` 配下で 3D N-body simulator を実装、改修、レビューする時に使います。

## 前提方針

- ブラウザのみで完結させる。
- HTML5、CSS3、JavaScript ES6+ を使う。
- Three.js を 3D 描画に使う。
- React や外部状態管理ライブラリは導入しない。
- 最大 10 体までの操作性と可読性を維持する。

## アーキテクチャ原則

1. 物理演算と描画を分離する。
2. UI 制御と永続化を物理演算クラスへ混在させない。
3. シミュレーション状態と表示状態を区別する。
4. メインスレッド負荷が高い場合は Web Worker を優先的に検討する。

## 実装時の確認項目

1. Body モデルに以下が含まれているか確認する。
   - mass
   - position
   - velocity
2. localStorage 保存時に以下を確認する。
   - body 設定
   - generate seed または preset
   - 表示設定
   - 前回の制御状態を復元すべきかどうか
3. 数値積分を選ぶ時は以下を比較する。
   - 長時間安定性
   - エネルギー保存の傾向
   - 実装複雑度
   - 1 フレーム内で処理できる計算量
4. 近接や衝突が起きる時は以下を確認する。
   - softening の有無
   - 時間刻みの破綻
   - 軌跡表示の暴走

## UI 実装時の確認項目

1. スマートフォン幅でも 10 体分の入力導線が破綻しないこと。
2. キャンバスが UI に押しつぶされず、可視領域が確保されること。
3. Start、Pause、Resume、Reset の状態遷移が一貫していること。

## レビュー時の優先観点

- FPS を稼ぐために精度要件を黙って下げていないか。
- 描画都合のコードが物理演算ロジックに混ざっていないか。
- 可変長の Body 設定追加で配列や UI が破綻しないか。
- localStorage のキーと復元仕様が将来拡張に耐えるか。