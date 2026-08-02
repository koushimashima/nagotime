/**
 * ハッシュタグが有効かどうかを検証する。
 * バリデーションルール:
 *   - # で始まる
 *   - 全体の長さが 2〜31 文字（# を含む）
 *   - 空白・改行を含まない
 */
export function validateHashtag(tag: string): { valid: boolean; error?: string } {
  // 空白・改行チェック（\s は スペース、タブ、改行など全て）
  if (/\s/.test(tag)) {
    return { valid: false, error: 'ハッシュタグにスペースや改行は使用できません' }
  }

  // 長さ超過チェック（# を含む 31 文字超）
  if (tag.length > 31) {
    return { valid: false, error: 'ハッシュタグは30文字以内で入力してください' }
  }

  // # で始まらない、または長さ 2 未満
  if (!tag.startsWith('#') || tag.length < 2) {
    return { valid: false }
  }

  return { valid: true }
}
