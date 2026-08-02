// Feature: review-hashtag, Property 1: ハッシュタグ形式バリデーション
// Validates: Requirements 1.3

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateHashtag } from './hashtagValidator'

describe('validateHashtag - Property 1: ハッシュタグ形式バリデーション', () => {
  /**
   * 有効ケース:
   * # で始まり、長さ 2〜31 文字、空白なし → valid: true を返す
   */
  it('# で始まり、長さ 2〜31 文字、空白を含まない文字列は valid: true を返す', () => {
    // 空白以外の任意の文字を1〜30文字生成して # を先頭に付加
    const validHashtagArb = fc
      .stringOf(
        fc.char().filter(c => !/\s/.test(c)),
        { minLength: 1, maxLength: 30 }
      )
      .map(s => `#${s}`)

    fc.assert(
      fc.property(validHashtagArb, (tag) => {
        const result = validateHashtag(tag)
        expect(result.valid).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 無効ケース（先頭が # でない）:
   * # で始まらない文字列 → valid: false を返す
   */
  it('# で始まらない文字列は valid: false を返す', () => {
    // # 以外の文字から始まる文字列を生成
    const noHashArb = fc
      .tuple(
        fc.char().filter(c => c !== '#' && !/\s/.test(c)),
        fc.string({ minLength: 0, maxLength: 29 })
      )
      .map(([first, rest]) => first + rest)

    fc.assert(
      fc.property(noHashArb, (tag) => {
        const result = validateHashtag(tag)
        expect(result.valid).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 無効ケース（長さ 1、つまり "#" のみ）:
   * 長さ 1 の文字列 → valid: false を返す
   */
  it('"#" のみ（長さ1）の文字列は valid: false を返す', () => {
    fc.assert(
      fc.property(fc.constant('#'), (tag) => {
        const result = validateHashtag(tag)
        expect(result.valid).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 無効ケース（長さ 32 以上）:
   * 32文字以上の # で始まる文字列 → valid: false を返す
   */
  it('# で始まり長さ 32 文字以上の文字列は valid: false を返す', () => {
    // # + 空白なし文字 31〜99文字 = 合計 32〜100文字
    const tooLongArb = fc
      .stringOf(
        fc.char().filter(c => !/\s/.test(c)),
        { minLength: 31, maxLength: 99 }
      )
      .map(s => `#${s}`)

    fc.assert(
      fc.property(tooLongArb, (tag) => {
        const result = validateHashtag(tag)
        expect(result.valid).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 無効ケース（空白・改行を含む）:
   * 空白や改行を含む文字列 → valid: false を返す
   */
  it('空白や改行を含む文字列は valid: false を返す', () => {
    // 空白文字（スペース・タブ・改行）を1つ以上含む文字列を生成
    const withWhitespaceArb = fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 15 }),
        fc.constantFrom(' ', '\t', '\n', '\r'),
        fc.string({ minLength: 0, maxLength: 15 })
      )
      .map(([before, ws, after]) => before + ws + after)

    fc.assert(
      fc.property(withWhitespaceArb, (tag) => {
        const result = validateHashtag(tag)
        expect(result.valid).toBe(false)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * 双方向性チェック（if and only if）:
   * validateHashtag が true を返す ⟺ 以下の条件をすべて満たす
   *   1. # で始まる
   *   2. 全体の長さが 2〜31 文字
   *   3. 空白・改行を含まない
   */
  it('valid: true の条件は「# で始まる ∧ 長さ 2〜31 ∧ 空白なし」と一致する（双方向）', () => {
    const anyStringArb = fc.string({ minLength: 0, maxLength: 40 })

    fc.assert(
      fc.property(anyStringArb, (tag) => {
        const result = validateHashtag(tag)
        const meetsConditions =
          tag.startsWith('#') &&
          tag.length >= 2 &&
          tag.length <= 31 &&
          !/\s/.test(tag)

        expect(result.valid).toBe(meetsConditions)
      }),
      { numRuns: 100 }
    )
  })
})
