---
name: n-body-state-persistence
description: Use when implementing, reviewing, or refactoring localStorage save and restore, AppState hydration, migration, committedInitialState, or preset and bodyCount normalization for this repository. Japanese triggers: localStorage, 保存, 復元, 永続化, state hydration, migration, committedInitialState.
argument-hint: Describe the persistence feature, restore bug, or state normalization task
---

# N-body State Persistence

この Skill は、このリポジトリで AppState の保存復元、state 正規化、migration、`committedInitialState` 整合を扱う時に使います。

## 使う場面

- `Sources/app/persistence-facade.js` を実装・改修する時
- localStorage 保存対象を仕様書へ合わせる時
- 復元した state を既定 state とマージする時
- `bodyCount`、`bodies.length`、preset 制約、`expandedBodyPanels` を正規化する時
- `committedInitialState` の保存・復元・更新条件を実装する時

## 必須チェック項目

1. localStorage キーが `nbody-simulator.state` で固定されているか。
2. 保存対象が仕様書と一致しているか。
   - `appVersion`
   - `bodyCount`
   - `bodies`
   - `simulationConfig`
   - `uiState.selectedBodyId`
   - `uiState.cameraTarget`
   - `uiState.showTrails`
   - `uiState.expandedBodyPanels`
   - `committedInitialState`
   - `playbackRestorePolicy`
3. 保存しない対象が混入していないか。
   - `playbackState = running`
   - `playbackState = paused`
   - accumulator などの中間計算状態
   - trail の過去点列
4. 復元後の `playbackState` が常に `idle` へ正規化されるか。
5. `bodyCount` と `bodies.length` が一致するか。
6. preset と bodyCount の制約違反を復元時にも解消できるか。
7. `selectedBodyId`、`expandedBodyPanels` が現在の bodies に対して有効か。
8. `committedInitialState` が現在の仕様形に沿っているか。
9. 破損データ時に既定 state へフォールバックできるか。
10. `appVersion` 不一致時に migration を差し込める構造になっているか。
11. `expandedBodyPanels` が現行 UI 方針どおり存在する Body card の id のみに正規化され、複数件の展開状態を保持できるか。

## 推奨ワークフロー

1. 仕様書の `AppState` を固定の土台として読む。
2. 保存用 DTO と実行時 model を分ける。
3. `load` は「読み込み」「検証」「正規化」「フォールバック」を分離する。
4. `stage` や `save` は UI から直接呼ばず、controller か bootstrap から境界越しに呼ぶ。
5. migration は最初から関数境界を持たせ、後から if 文を増殖させない。

## レビュー時の優先観点

- 保存対象と非保存対象が混ざっていないか。
- 復元結果が `AppState` 形状を満たさないまま store に入っていないか。
- `committedInitialState` が current state と混線していないか。
- preset 制約違反を保存または復元していないか。