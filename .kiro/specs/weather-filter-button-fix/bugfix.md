# Bugfix Requirements Document

## Introduction

フィード画面の `ContextFilterBar` に天気フィルターチップが表示されていないバグを修正する。
`Weather` 型（SUNNY / CLOUDY / RAINY / SNOWY）の選択肢がフィルタバーに存在しないため、ユーザーは天気条件を切り替えてレコメンドフィードを絞り込む操作ができない。
また、`FeedPage` が `weather` パラメータとして常にコンテキスト自動取得の固定値（`'SUNNY'`）を渡しており、ユーザーが天気を選択したとしてもフィードに反映されない状態になっている。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN ユーザーがフィード画面の `ContextFilterBar` を表示する THEN 天気フィルターチップ（SUNNY / CLOUDY / RAINY / SNOWY）が一切表示されない

1.2 WHEN ユーザーが天気の選択肢を選ぼうとする THEN 選択 UI が存在しないため操作できない

1.3 WHEN `FeedPage` が `useRecommendFeed` を呼び出す THEN `weather` パラメータにコンテキスト固定値（常に `'SUNNY'`）が渡され、ユーザーが選択した天気フィルターが反映されない

1.4 WHEN フィルタバーの `isFilterModified` を算出する THEN 天気フィルターの変更が考慮されず、天気だけ変更した場合にリセットボタンが表示されない

### Expected Behavior (Correct)

2.1 WHEN ユーザーがフィード画面の `ContextFilterBar` を表示する THEN 時間帯・曜日種別チップと並んで天気フィルターチップ（SUNNY / CLOUDY / RAINY / SNOWY）が表示される

2.2 WHEN ユーザーが天気チップをタップしてドロップダウンから選択する THEN `RecommendContext` の `filterWeather` 状態が更新される

2.3 WHEN `FeedPage` が `useRecommendFeed` を呼び出す THEN `weather` パラメータとして `filterWeather` の値が渡され、選択した天気でフィードが絞り込まれる

2.4 WHEN ユーザーが天気フィルターをデフォルト値（`'SUNNY'`）以外に変更する THEN `isFilterModified` が `true` になりリセットボタンが表示される

### Unchanged Behavior (Regression Prevention)

3.1 WHEN ユーザーが時間帯チップを操作する THEN 従来どおり `filterTimeSlot` が更新され、フィードが時間帯で絞り込まれる

3.2 WHEN ユーザーが曜日種別チップを操作する THEN 従来どおり `filterDayType` が更新され、フィードが曜日種別で絞り込まれる

3.3 WHEN ユーザーがリセットボタンを押す THEN 時間帯・曜日種別に加えて天気フィルターもデフォルト値にリセットされる

3.4 WHEN 位置情報の取得中またはエラー時にフィルタバーが描画される THEN ローディングスピナーおよびエラーメッセージの表示ロジックは変わらない

3.5 WHEN `RecommendContext` の `weather` 自動取得値が `'SUNNY'` 固定である THEN その値は変更されず、`filterWeather` の初期値として使用される

3.6 WHEN `filterWeather` がデフォルト値（`'SUNNY'`）のままで時間帯・曜日種別もデフォルトの場合 THEN `isFilterModified` は `false` のままでリセットボタンは表示されない
