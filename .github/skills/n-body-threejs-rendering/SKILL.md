---
name: n-body-threejs-rendering
description: Use when implementing, refactoring, or reviewing Three.js rendering for this repository, including scene setup, camera behavior, body mesh updates, resize handling, overlay coordination, and renderer fallback strategy. Japanese triggers: Three.js, 描画, scene, camera, mesh, resize, renderer, viewport.
argument-hint: Describe the renderer feature, camera behavior, or resize/rendering issue
---

# N-body Three.js Rendering

この Skill は、このリポジトリで Three.js による描画レイヤーを実装、改修、レビューする時に使います。

## 使う場面

- `renderer-facade` を Three.js 前提へ強化する時
- scene、camera、light、grid、axes の構成を決める時
- Body 配列から mesh 群を同期する時
- resize 時の renderer 更新を実装する時
- 2D fallback と Three.js mode の切替を扱う時
- trail、camera target、overlay 連携を拡張する時

## 必須チェック項目

1. 描画責務が physics や persistence と混在していないか。
2. resize 後に再描画される経路があるか。
3. Body 数の増減で mesh の追加・削除が正しく行われるか。
4. camera が system center または指定 target に向けられる設計か。
5. overlay 更新責務が renderer と過度に結合していないか。
6. WebGL が使えない時の fallback があるか。
7. CDN 依存か module import かを明示しているか。
8. trail を入れる場合、点数上限や更新コストを考慮しているか。

## 推奨ワークフロー

1. `renderer-facade` を外部境界にする。
2. scene host を内部実装として分離する。
3. `resize`、`render`、`syncMeshes` を独立した責務にする。
4. camera target と overlay 更新は renderer 外部から state で渡す。
5. fallback mode を残す場合は mode 切替理由を UI へ出せるようにする。

## レビュー時の優先観点

- 描画都合の state mutation が controller 側へ漏れていないか。
- resize で stale frame が残らないか。
- mesh dispose 漏れがないか。
- Three.js 初期化失敗時に UI 全体が巻き込まれないか。