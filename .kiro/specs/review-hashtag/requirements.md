# 要件定義: 口コミハッシュタグ機能（review-hashtag）

## はじめに

NagoTime は名古屋のスポット情報を口コミで共有する React + TypeScript 製 SPA である。
本機能は、口コミ（レビュー）投稿時にハッシュタグを付与できるよう既存の口コミ機能を拡張する。
学生ユーザーが利用するシーンに特化したプリセットハッシュタグ（例: #勉強スポット / #デート / #飲み会 / #大人数）をタップで追加できるほか、手入力によるカスタムハッシュタグも追加できる。
投稿後の口コミ詳細画面・フィード画面にはハッシュタグが表示される。

---

## 用語集

- **Hashtag（ハッシュタグ）**: `#` に続く1〜30文字の文字列。空白・改行を含まない。
- **PresetHashtag（プリセットハッシュタグ）**: アプリが事前に定義した選択肢ハッシュタグ。
- **CustomHashtag（カスタムハッシュタグ）**: ユーザーが自由入力で追加するハッシュタグ。
- **HashtagSelector（ハッシュタグセレクター）**: 投稿画面に表示されるプリセット選択 + 手入力 UI コンポーネント。
- **ReviewForm（口コミ投稿フォーム）**: 既存の口コミ投稿フォーム（`SubmitPage`）。
- **ReviewDetail（口コミ詳細画面）**: 既存の口コミ詳細画面（`ReviewDetailPage`）。
- **FeedCard（フィードカード）**: フィード一覧の各口コミカード（`ReviewCard`）。
- **Review_API（口コミ API）**: MSW でモックされた `/api/reviews` エンドポイント群。
- **Review_Type（Reviewデータ型）**: `src/mocks/data/types.ts` で定義された `Review` インターフェース。

---

## 要件

### 要件 1: ハッシュタグのデータモデル拡張

**ユーザーストーリー:** 開発者として、口コミデータにハッシュタグフィールドを追加したい。そうすることで、ハッシュタグ情報をフロントエンド全体で一貫して扱える。

#### 受け入れ基準

1. THE Review_Type SHALL include a `hashtags` field of type `string[]` (default: empty array `[]`).
2. WHEN a new `hashtags` field is added to Review_Type, THE Review_Type SHALL remain backward-compatible with existing mock data that lacks the field (treating absence as `[]`).
3. THE Hashtag SHALL be a string that starts with `#`, contains 2 to 31 characters in total (including `#`), and contains no whitespace or newline characters.
4. THE Review_Type SHALL allow at most 10 hashtags per review.
5. WHEN the `hashtags` field contains duplicate values, THE Review_Type SHALL treat the review as invalid (duplicates are not permitted).

---

### 要件 2: プリセットハッシュタグの定義

**ユーザーストーリー:** 学生ユーザーとして、よく使うハッシュタグを一覧から選びたい。そうすることで、タイピングの手間なくシーンに合ったハッシュタグを素早く追加できる。

#### 受け入れ基準

1. THE HashtagSelector SHALL display the following preset hashtags as selectable chips:
   食事シーン: `#ランチ`, `#ディナー`, `#モーニング`, `#ブランチ`, `#テイクアウト`, `#食べ歩き`, `#食べ放題`, `#スイーツ`;
   利用シーン: `#勉強スポット`, `#デート`, `#飲み会`, `#大人数`, `#一人`, `#カフェ活`, `#サークル`, `#就活`, `#ゼミ後`, `#バイト帰り`;
   雰囲気・特徴: `#夜景`, `#穴場`, `#インスタ映え`, `#コスパ良し`, `#深夜営業`, `#Wi-Fi完備`, `#禁煙`, `#テラス席`, `#ペット可`, `#予約不要`.
2. THE HashtagSelector SHALL display each preset chip in a deselected state by default.
3. WHEN a user taps a deselected preset chip, THE HashtagSelector SHALL add the corresponding hashtag to the selected hashtag list.
4. WHEN a user taps a selected preset chip, THE HashtagSelector SHALL remove the corresponding hashtag from the selected hashtag list.
5. WHILE the total selected hashtag count equals 10, THE HashtagSelector SHALL disable all unselected preset chips.
6. WHILE the total selected hashtag count equals 10, THE HashtagSelector SHALL display a message indicating "最大10個まで追加できます".

---

### 要件 3: カスタムハッシュタグの手入力

**ユーザーストーリー:** 学生ユーザーとして、プリセットにないハッシュタグを自分で入力したい。そうすることで、スポットの個性をより細かく表現できる。

#### 受け入れ基準

1. THE HashtagSelector SHALL include a text input field for entering a custom hashtag.
2. WHEN a user enters text into the custom hashtag input and presses Enter or taps the add button, THE HashtagSelector SHALL prepend `#` if the input does not start with `#`, then add the resulting hashtag to the selected hashtag list.
3. WHEN the entered custom hashtag duplicates an already-selected hashtag, THE HashtagSelector SHALL not add it and SHALL display an inline error message "同じハッシュタグはすでに追加されています".
4. WHEN the hashtag text (after prepending `#`) exceeds 31 characters in total, THE HashtagSelector SHALL not add it and SHALL display an inline error message "ハッシュタグは30文字以内で入力してください".
5. WHEN the hashtag text contains whitespace or newline characters, THE HashtagSelector SHALL not add it and SHALL display an inline error message "ハッシュタグにスペースや改行は使用できません".
6. WHILE the total selected hashtag count equals 10, THE HashtagSelector SHALL disable the add button for custom hashtag input.
7. WHEN a custom hashtag is successfully added, THE HashtagSelector SHALL clear the custom hashtag input field.

---

### 要件 4: 口コミ投稿フォームへの統合

**ユーザーストーリー:** 学生ユーザーとして、口コミ投稿フォームの中でハッシュタグを選択・追加したい。そうすることで、投稿と同時にハッシュタグを紐付けることができる。

#### 受け入れ基準

1. THE ReviewForm SHALL display the HashtagSelector component as an optional field within the submission form.
2. THE ReviewForm SHALL include the selected `hashtags` array in the POST `/api/reviews` request body.
3. WHEN no hashtag is selected, THE ReviewForm SHALL send an empty `hashtags` array in the request body.
4. WHEN a user submits the form with hashtags selected, THE Review_API SHALL persist the `hashtags` field on the newly created review object.
5. THE ReviewForm SHALL NOT require at least one hashtag for form submission (hashtags are optional).

---

### 要件 5: 投稿後の口コミ詳細画面でのハッシュタグ表示

**ユーザーストーリー:** 閲覧ユーザーとして、口コミ詳細画面でハッシュタグを確認したい。そうすることで、スポットのシーンや雰囲気を素早く把握できる。

#### 受け入れ基準

1. WHEN a review has one or more hashtags, THE ReviewDetail SHALL display each hashtag as a styled chip below the review body text.
2. WHEN a review has no hashtags (empty array), THE ReviewDetail SHALL not render any hashtag area.
3. THE ReviewDetail SHALL display each hashtag chip with the `#` prefix visible.
4. WHERE more than 10 hashtag chips are present (defensive display), THE ReviewDetail SHALL display only the first 10 chips.

---

### 要件 6: フィードカードでのハッシュタグ表示

**ユーザーストーリー:** 閲覧ユーザーとして、フィード一覧でも口コミのハッシュタグを確認したい。そうすることで、詳細画面を開かずにスポットのシーンを判断できる。

#### 受け入れ基準

1. WHEN a review has one or more hashtags, THE FeedCard SHALL display hashtag labels in the upper-left area of the photo, stacked vertically, each in white text without any background treatment, matching the style of the like count display.
2. THE FeedCard SHALL display at most 3 hashtag rows vertically.
3. WHEN a review has more than 3 hashtags, THE FeedCard SHALL display a `+N` indicator below the 3rd row (where N is the count of hashtags beyond 3).
4. WHEN a hashtag label is too long to fit horizontally within the available space, THE FeedCard SHALL truncate the text with a trailing `…` (ellipsis).
5. WHEN a review has no hashtags, THE FeedCard SHALL not render any hashtag area.

---

### 要件 7: ハッシュタグバリデーション（API レベル）

**ユーザーストーリー:** システムとして、不正なハッシュタグデータが永続化されないようにしたい。そうすることで、データの整合性を保てる。

#### 受け入れ基準

1. WHEN a POST `/api/reviews` request contains a `hashtags` field with more than 10 items, THE Review_API SHALL return a 400 response with error code `VALIDATION_ERROR` and field `hashtags`.
2. WHEN a POST `/api/reviews` request contains a `hashtags` field with a hashtag exceeding 31 characters total, THE Review_API SHALL return a 400 response with error code `VALIDATION_ERROR` and field `hashtags`.
3. WHEN a POST `/api/reviews` request contains a `hashtags` field with a hashtag containing whitespace, THE Review_API SHALL return a 400 response with error code `VALIDATION_ERROR` and field `hashtags`.
4. WHEN a POST `/api/reviews` request contains a `hashtags` field with duplicate values, THE Review_API SHALL return a 400 response with error code `VALIDATION_ERROR` and field `hashtags`.
5. WHEN a POST `/api/reviews` request omits the `hashtags` field entirely, THE Review_API SHALL treat it as an empty array and proceed normally.

---

### 要件 8: 既存モックデータの後方互換性

**ユーザーストーリー:** 開発者として、既存のモックデータをすべて書き直さずにハッシュタグ機能を導入したい。そうすることで、既存の開発成果物を維持できる。

#### 受け入れ基準

1. WHEN an existing mock review object does not have the `hashtags` field, THE ReviewDetail SHALL render the review without a hashtag area (treating absence as `[]`).
2. WHEN an existing mock review object does not have the `hashtags` field, THE FeedCard SHALL render the review without a hashtag area.
3. THE Review_API GET handler SHALL include a `hashtags` field (defaulting to `[]`) in all review objects returned, regardless of whether the stored data includes the field.

---

### 要件 9: カスタムハッシュタグのサジェスト

**ユーザーストーリー:** 学生ユーザーとして、カスタムハッシュタグ入力時に過去の口コミで使われたハッシュタグの候補を見たい。そうすることで、タイピングの手間を減らし、既存のハッシュタグを再利用しやすくなる。

#### 受け入れ基準

1. THE HashtagSelector SHALL collect all hashtags from MSW mock reviews' `hashtags` fields and exclude any hashtag that is already contained in `ALL_PRESET_HASHTAGS`, treating the remainder as the custom hashtag suggestion source.
2. WHEN a user enters 1 or more characters into the custom hashtag input field, THE HashtagSelector SHALL display a dropdown list of candidate hashtags filtered from the suggestion source.
3. WHEN the custom hashtag input field is empty, THE HashtagSelector SHALL hide the dropdown list.
4. WHEN the input text does not start with `#`, THE HashtagSelector SHALL prepend `#` to the input text before applying the prefix-match filter against the suggestion source (case-insensitive).
5. THE HashtagSelector SHALL display at most 5 candidate hashtags in the dropdown list.
6. WHEN a user taps or clicks a candidate hashtag in the dropdown list, THE HashtagSelector SHALL add that hashtag to the selected hashtag list, clear the custom hashtag input field, and hide the dropdown list.
7. THE HashtagSelector SHALL exclude already-selected hashtags from the dropdown candidate list.
8. WHILE the total selected hashtag count equals 10, THE HashtagSelector SHALL hide the dropdown list entirely.
9. WHEN the dropdown list is visible and the user presses the Escape key, THE HashtagSelector SHALL hide the dropdown list without clearing the custom hashtag input field.
10. THE HashtagSelector SHALL implement the dropdown list with `role="listbox"` and each candidate item with `role="option"`.
