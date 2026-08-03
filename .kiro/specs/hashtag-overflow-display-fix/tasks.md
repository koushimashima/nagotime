# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - 4件以上のハッシュタグで +N インジケーターが表示されるバグ
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: ハッシュタグが4件以上の具体的ケース（例: 5件）に絞って再現性を確保する
  - `ReviewCard` を4件以上のハッシュタグでレンダリングし、すべてのハッシュタグテキストが DOM に存在することをアサート（Bug Condition: `hashtags.length >= 4`）
  - 同時に「+」から始まるインジケーターテキストが DOM に存在しないことをアサート（Expected Behavior: no overflow indicator）
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found（例: 「4件目以降のタグが描画されない、+2 というノードが存在する」）
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - 3件以下・0件のハッシュタグでの既存動作
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: 3件以下のハッシュタグは現行コードでもすべて表示される（変更なし）
  - Observe: 0件のときはハッシュタグエリアが描画されない（変更なし）
  - Observe: いいね数・写真・aria-label などハッシュタグ以外の要素は常に描画される（変更なし）
  - Write property-based tests: `hashtags.length in [0, 1, 2, 3]` の任意値に対してすべてのタグが表示されること、かつインジケーターが存在しないことを検証（Preservation Requirements 3.1, 3.2, 3.3 より）
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix: ハッシュタグ省略インジケーターの廃止

  - [x] 3.1 Implement the fix
    - `src/components/ReviewCard/ReviewCard.tsx` のハッシュタグ描画部を修正する
    - `.slice(0, 3)` によるハッシュタグの絞り込みを削除し、全件表示に変更する
    - `+{N-3}` インジケーターを描画している JSX ブロックを削除する
    - _Bug_Condition: `review.hashtags.length >= 4` のときに `.slice(0, 3)` と `+{N-3}` ブロックが存在する_
    - _Expected_Behavior: すべてのハッシュタグを `map` で描画し、インジケーターブロックを含まない_
    - _Preservation: 3件以下・0件のハッシュタグ、及びハッシュタグ以外のレビュー情報（いいね数、写真など）の描画は変わらない_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 4件以上のハッシュタグがすべて表示される
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - 3件以下・0件のハッシュタグでの既存動作
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - すべてのテストがグリーンになっていることを確認する
  - 疑問点があればユーザーに確認する
