// src/features/admin/AdminPage.tsx
// 管理画面（Requirements 9.1〜9.5）
// - sponsor-admin ロール以外は AdminRoute がリダイレクトするため、ここではロールチェック不要
// - クーポン登録フォーム + 登録済みクーポン一覧

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import type { Coupon, CouponStatus } from '../../mocks/data/types'

// ---- 型定義 ----

interface ApiErrorResponse {
  error: {
    code: string
    message: string
    fields?: string[]
  }
}

// ---- フォームの初期値 ----

const INITIAL_FORM = {
  name: '',
  description: '',
  requiredMiles: '',
  expiresAt: '',
  issueLimit: '',
}

type FormValues = typeof INITIAL_FORM

// ---- ステータスバッジ ----

interface StatusBadgeProps {
  status: CouponStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<CouponStatus, { label: string; className: string }> = {
    ACTIVE: {
      label: '有効',
      className: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
    SOLD_OUT: {
      label: '売り切れ',
      className: 'bg-red-100 text-red-700 border border-red-200',
    },
    EXPIRED: {
      label: '期限切れ',
      className: 'bg-gray-100 text-gray-500 border border-gray-200',
    },
  }

  const { label, className } = config[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

// ---- 日付フォーマット ----

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ---- メインコンポーネント ----

/**
 * 管理画面（Sponsor Admin 専用）
 * - AdminRoute で sponsor-admin 以外は / にリダイレクト済み
 * - クーポン登録フォーム: POST /api/coupons
 * - クーポン一覧: GET /api/coupons
 *
 * Requirements: 9.1〜9.5
 */
export function AdminPage() {
  const { user } = useAuth()

  // ---- フォーム状態 ----
  const [form, setForm] = useState<FormValues>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ---- クーポン一覧状態 ----
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // ---- GET /api/coupons ----

  const fetchCoupons = useCallback(async () => {
    if (!user) return

    setIsLoadingList(true)
    setListError(null)

    try {
      const res = await fetch('/api/coupons', {
        headers: {
          Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}`,
        },
      })

      if (!res.ok) {
        const err = (await res.json()) as ApiErrorResponse
        throw new Error(err.error?.message ?? 'クーポン一覧の取得に失敗しました')
      }

      const data = (await res.json()) as { coupons: Coupon[]; total: number }
      setCoupons(data.coupons)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoadingList(false)
    }
  }, [user])

  useEffect(() => {
    void fetchCoupons()
  }, [fetchCoupons])

  // ---- フォーム入力ハンドラー ----

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // 入力時にそのフィールドのエラーをクリア
    if (fieldErrors[name as keyof FormValues]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // ---- クライアントサイドバリデーション ----

  function validateForm(): Partial<Record<keyof FormValues, string>> {
    const errors: Partial<Record<keyof FormValues, string>> = {}

    if (!form.name.trim() || form.name.length < 1 || form.name.length > 100) {
      errors.name = 'クーポン名は1〜100文字で入力してください'
    }

    if (form.description.length > 500) {
      errors.description = '説明は500文字以内で入力してください'
    }

    const miles = Number(form.requiredMiles)
    if (!form.requiredMiles || !Number.isInteger(miles) || miles < 1) {
      errors.requiredMiles = '必要マイル数は1以上の整数で入力してください'
    }

    if (!form.expiresAt || isNaN(Date.parse(form.expiresAt))) {
      errors.expiresAt = '有効期限を正しく入力してください'
    }

    const limit = Number(form.issueLimit)
    if (!form.issueLimit || !Number.isInteger(limit) || limit < 1) {
      errors.issueLimit = '発行枚数上限は1以上の整数で入力してください'
    }

    return errors
  }

  // ---- POST /api/coupons ----

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(false)

    // クライアントサイドバリデーション
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-jwt-token-${user!.userId}-${Date.now()}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
          requiredMiles: Number(form.requiredMiles),
          // date input の値は "YYYY-MM-DD" 形式なので ISO 8601 に変換
          expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
          issueLimit: Number(form.issueLimit),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errData = data as ApiErrorResponse
        // サーバーサイドバリデーションエラーのフィールドマッピング
        if (errData.error?.fields && errData.error.fields.length > 0) {
          const serverErrors: Partial<Record<keyof FormValues, string>> = {}
          errData.error.fields.forEach((field) => {
            if (field in INITIAL_FORM) {
              serverErrors[field as keyof FormValues] =
                `${field} の値が不正です`
            }
          })
          setFieldErrors(serverErrors)
        }
        throw new Error(errData.error?.message ?? 'クーポン登録に失敗しました')
      }

      // 登録成功 → フォームリセット → 一覧を再取得
      setForm(INITIAL_FORM)
      setFieldErrors({})
      setSubmitSuccess(true)
      await fetchCoupons()

      // 3秒後に成功メッセージを消す
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'クーポン登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- レンダリング ----

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-10">

      {/* ---- ページタイトル ---- */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
        <p className="mt-1 text-sm text-gray-500">クーポンの登録・管理ができます</p>
      </header>

      {/* ---- クーポン登録フォーム ---- */}
      <section aria-label="クーポン登録">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-800">新しいクーポンを登録</h2>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-6 space-y-5" noValidate>

            {/* クーポン名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                クーポン名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="例: みそかつ定食 100マイル割引"
                maxLength={100}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors
                  ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                aria-invalid={!!fieldErrors.name}
              />
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.name ? (
                  <p id="name-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.name}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {form.name.length} / 100
                </span>
              </div>
            </div>

            {/* 説明 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                説明 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="クーポンの詳細説明を入力してください"
                maxLength={500}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none transition-colors
                  ${fieldErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                aria-describedby={fieldErrors.description ? 'description-error' : undefined}
                aria-invalid={!!fieldErrors.description}
              />
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.description ? (
                  <p id="description-error" role="alert" className="text-xs text-red-600">
                    {fieldErrors.description}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {form.description.length} / 500
                </span>
              </div>
            </div>

            {/* 必要マイル数 + 発行枚数上限（横並び） */}
            <div className="grid grid-cols-2 gap-4">
              {/* 必要マイル数 */}
              <div>
                <label htmlFor="requiredMiles" className="block text-sm font-medium text-gray-700 mb-1">
                  必要マイル数 <span className="text-red-500">*</span>
                </label>
                <input
                  id="requiredMiles"
                  name="requiredMiles"
                  type="number"
                  value={form.requiredMiles}
                  onChange={handleChange}
                  placeholder="例: 100"
                  min={1}
                  step={1}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors
                    ${fieldErrors.requiredMiles ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  aria-describedby={fieldErrors.requiredMiles ? 'requiredMiles-error' : undefined}
                  aria-invalid={!!fieldErrors.requiredMiles}
                />
                {fieldErrors.requiredMiles && (
                  <p id="requiredMiles-error" role="alert" className="mt-1 text-xs text-red-600">
                    {fieldErrors.requiredMiles}
                  </p>
                )}
              </div>

              {/* 発行枚数上限 */}
              <div>
                <label htmlFor="issueLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  発行枚数上限 <span className="text-red-500">*</span>
                </label>
                <input
                  id="issueLimit"
                  name="issueLimit"
                  type="number"
                  value={form.issueLimit}
                  onChange={handleChange}
                  placeholder="例: 100"
                  min={1}
                  step={1}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors
                    ${fieldErrors.issueLimit ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                  aria-describedby={fieldErrors.issueLimit ? 'issueLimit-error' : undefined}
                  aria-invalid={!!fieldErrors.issueLimit}
                />
                {fieldErrors.issueLimit && (
                  <p id="issueLimit-error" role="alert" className="mt-1 text-xs text-red-600">
                    {fieldErrors.issueLimit}
                  </p>
                )}
              </div>
            </div>

            {/* 有効期限 */}
            <div>
              <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-1">
                有効期限 <span className="text-red-500">*</span>
              </label>
              <input
                id="expiresAt"
                name="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors
                  ${fieldErrors.expiresAt ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                aria-describedby={fieldErrors.expiresAt ? 'expiresAt-error' : undefined}
                aria-invalid={!!fieldErrors.expiresAt}
              />
              {fieldErrors.expiresAt && (
                <p id="expiresAt-error" role="alert" className="mt-1 text-xs text-red-600">
                  {fieldErrors.expiresAt}
                </p>
              )}
            </div>

            {/* 送信エラー */}
            {submitError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
              >
                <p className="font-medium">登録に失敗しました</p>
                <p className="mt-0.5">{submitError}</p>
              </div>
            )}

            {/* 送信成功 */}
            {submitSuccess && (
              <div
                role="status"
                className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"
              >
                クーポンを登録しました
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                  <span>登録中...</span>
                </>
              ) : (
                'クーポンを登録する'
              )}
            </button>

            {/* 管理者アカウントヒント */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
              <p className="font-medium">管理者アカウント</p>
              <p className="mt-0.5">
                メールアドレス: <span className="font-mono font-semibold">admin@example.com</span>
                　パスワード: <span className="font-mono font-semibold">password</span>
              </p>
            </div>
          </form>
        </div>
      </section>

      {/* ---- クーポン一覧 ---- */}
      <section aria-label="登録済みクーポン一覧">
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          登録済みクーポン一覧
        </h2>

        {isLoadingList ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : listError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-600">
            <p className="font-medium">一覧の取得に失敗しました</p>
            <p className="mt-1">{listError}</p>
            <button
              type="button"
              onClick={() => void fetchCoupons()}
              className="mt-3 text-xs font-medium text-red-700 underline"
            >
              再試行
            </button>
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            登録済みのクーポンはありません
          </p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* テーブル（デスクトップ） */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      クーポン名
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      必要マイル
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      有効期限
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      発行上限
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      交換済み
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {coupons.map((coupon) => (
                    <tr key={coupon.couponId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-xs">
                            {coupon.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{coupon.sponsorName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap font-medium">
                        {coupon.requiredMiles.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(coupon.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {coupon.issueLimit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={
                            coupon.redeemedCount >= coupon.issueLimit
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-700'
                          }
                        >
                          {coupon.redeemedCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={coupon.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* フッター: 件数表示 */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-400">
                全 {coupons.length} 件
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
