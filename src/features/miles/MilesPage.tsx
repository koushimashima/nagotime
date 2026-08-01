// src/features/miles/MilesPage.tsx
// マイル・クーポン画面（Requirements 8.1〜8.8）

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useMile } from '../../contexts/MileContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Modal } from '../../components/Modal'
import type { Coupon, MileTransaction, MileTransactionType } from '../../mocks/data/types'

// ---- 取引タイプの日本語ラベル ----

const TRANSACTION_TYPE_LABEL: Record<MileTransactionType, string> = {
  GRANT_REVIEW: '口コミ投稿',
  GRANT_LIKES: 'いいね達成',
  GRANT_VIEWS: '閲覧数達成',
  REDEEM_COUPON: 'クーポン交換',
}

// ---- API レスポンス型 ----

interface MilesApiResponse {
  balance: number
  transactions: MileTransaction[]
}

interface RedeemApiResponse {
  couponCode: string
  couponName: string
  newBalance: number
}

interface ApiErrorResponse {
  error: {
    code: string
    message: string
    shortfall?: number
  }
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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- メインコンポーネント ----

/**
 * マイル・クーポン画面
 * - GET /api/miles でマイル残高と直近10件の取引履歴を表示
 * - ACTIVE クーポン一覧を表示（必要マイル数・有効期限・交換ボタン）
 * - 交換ボタン → 確認モーダル → POST /api/miles/redeem → クーポンコード表示
 * - 残高不足時は「あと〇マイル必要です」を表示し交換ボタンを disabled
 * - useMile の deductMiles() でローカル残高を更新
 *
 * Requirements: 8.1〜8.8
 */
export function MilesPage() {
  const { user } = useAuth()
  const { balance: localBalance, deductMiles, syncBalance } = useMile()

  // ---- API データ ----
  const [transactions, setTransactions] = useState<MileTransaction[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ---- 確認モーダル ----
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  // ---- クーポンコード表示モーダル ----
  const [isCodeOpen, setIsCodeOpen] = useState(false)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [redeemedCouponName, setRedeemedCouponName] = useState<string | null>(null)

  // ---- マイル残高（ローカルコンテキストで管理） ----
  // API 取得後は deductMiles() が呼ばれると localBalance が更新され表示に反映される
  const displayBalance = localBalance

  // ---- API 呼び出し ----

  const fetchMilesData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setFetchError(null)

    try {
      const [milesRes, couponsRes] = await Promise.all([
        fetch('/api/miles', {
          headers: {
            Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}`,
          },
        }),
        // GET /api/coupons/active は認証不要の一般ユーザー向け有効クーポン一覧
        fetch('/api/coupons/active'),
      ])

      if (!milesRes.ok) {
        const err = (await milesRes.json()) as ApiErrorResponse
        throw new Error(err.error?.message ?? 'マイル情報の取得に失敗しました')
      }

      const milesData = (await milesRes.json()) as MilesApiResponse
      setTransactions(milesData.transactions)
      // Sync local MileContext with server balance (fixes initial-login balance = 0)
      syncBalance(milesData.balance)

      if (couponsRes.ok) {
        const couponsData = (await couponsRes.json()) as { coupons: Coupon[] }
        setCoupons(couponsData.coupons)
      } else {
        setCoupons([])
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void fetchMilesData()
  }, [fetchMilesData])

  // ---- 交換ボタンクリック → 確認モーダル表示 ----

  function handleRedeemClick(coupon: Coupon) {
    setSelectedCoupon(coupon)
    setRedeemError(null)
    setIsConfirmOpen(true)
  }

  // ---- 確認モーダルで「交換」ボタン → POST /api/miles/redeem ----

  async function handleConfirmRedeem() {
    if (!selectedCoupon || !user) return

    setIsRedeeming(true)
    setRedeemError(null)

    try {
      const res = await fetch('/api/miles/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}`,
        },
        body: JSON.stringify({ couponId: selectedCoupon.couponId }),
      })

      const data = (await res.json()) as RedeemApiResponse | ApiErrorResponse

      if (!res.ok) {
        const errData = data as ApiErrorResponse
        setRedeemError(errData.error?.message ?? '交換に失敗しました')
        return
      }

      const successData = data as RedeemApiResponse

      // ローカル残高を更新（Requirements: deductMiles）
      deductMiles(selectedCoupon.requiredMiles)

      // クーポンコード表示モーダルへ
      setCouponCode(successData.couponCode)
      setRedeemedCouponName(successData.couponName)
      setIsConfirmOpen(false)
      setIsCodeOpen(true)

      // データを再取得してトランザクション履歴・クーポン在庫を更新
      await fetchMilesData()
    } catch {
      setRedeemError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsRedeeming(false)
    }
  }

  // ---- クーポンコード表示モーダルを閉じる ----

  function handleCodeClose() {
    setIsCodeOpen(false)
    setCouponCode(null)
    setRedeemedCouponName(null)
    setSelectedCoupon(null)
  }

  // ---- ローディング・エラー状態 ----

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-4 text-sm text-red-600">
          <p className="font-medium">データの取得に失敗しました</p>
          <p className="mt-1">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchMilesData()}
            className="mt-3 text-xs font-medium text-red-700 underline"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-8">

      {/* ---- マイル残高カード ---- */}
      <section aria-label="マイル残高">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-white px-6 py-8 shadow-lg">
          <p className="text-sm font-medium text-indigo-100">現在のマイル残高</p>
          <p className="mt-2 text-5xl font-bold tracking-tight">
            {displayBalance.toLocaleString()}
            <span className="ml-2 text-2xl font-normal text-indigo-200">マイル</span>
          </p>
        </div>
      </section>

      {/* ---- 取引履歴 ---- */}
      <section aria-label="取引履歴">
        <h2 className="text-base font-semibold text-gray-800 mb-3">取引履歴（直近10件）</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">取引履歴がありません</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {transactions.map((tx) => (
              <div key={tx.transactionId} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {TRANSACTION_TYPE_LABEL[tx.type]}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(tx.createdAt)}</p>
                </div>
                <div className="ml-4 flex flex-col items-end shrink-0">
                  <span
                    className={`text-sm font-semibold ${
                      tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount.toLocaleString()} マイル
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    残高 {tx.balanceAfter.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- クーポン一覧 ---- */}
      <section aria-label="クーポン一覧">
        <h2 className="text-base font-semibold text-gray-800 mb-3">利用可能なクーポン</h2>

        {coupons.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">現在利用可能なクーポンはありません</p>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const shortfall = coupon.requiredMiles - displayBalance
              const canRedeem = shortfall <= 0

              return (
                <div
                  key={coupon.couponId}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    {/* サムネイル */}
                    {coupon.thumbnailUrl && (
                      <img
                        src={coupon.thumbnailUrl}
                        alt={coupon.name}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                        loading="lazy"
                      />
                    )}

                    {/* クーポン情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-indigo-600 font-medium">{coupon.sponsorName}</p>
                      <h3 className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">
                        {coupon.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {coupon.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* 必要マイル */}
                        <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2.5 py-0.5">
                          {coupon.requiredMiles.toLocaleString()} マイル
                        </span>
                        {/* 有効期限 */}
                        <span className="text-xs text-gray-400">
                          期限: {formatDate(coupon.expiresAt)}
                        </span>
                        {/* 残り在庫 */}
                        <span className="text-xs text-gray-400">
                          残り {(coupon.issueLimit - coupon.redeemedCount).toLocaleString()} 枚
                        </span>
                      </div>

                      {/* 残高不足メッセージ */}
                      {!canRedeem && (
                        <p className="mt-2 text-xs text-amber-600 font-medium">
                          あと {shortfall.toLocaleString()} マイル必要です
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 交換ボタン */}
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => handleRedeemClick(coupon)}
                      disabled={!canRedeem}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors
                        ${
                          canRedeem
                            ? 'bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      aria-label={
                        canRedeem
                          ? `${coupon.name}を交換する`
                          : `${coupon.name}（マイル不足のため交換不可）`
                      }
                    >
                      {canRedeem ? '交換する' : 'マイルが不足しています'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---- 確認モーダル ---- */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => {
          if (!isRedeeming) {
            setIsConfirmOpen(false)
            setRedeemError(null)
          }
        }}
        onConfirm={() => void handleConfirmRedeem()}
        title="クーポン交換の確認"
        confirmLabel="交換する"
        cancelLabel="キャンセル"
        isLoading={isRedeeming}
      >
        {selectedCoupon && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              以下のクーポンと交換しますか？
            </p>

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
              <p className="text-xs text-indigo-600 font-medium">{selectedCoupon.sponsorName}</p>
              <p className="text-sm font-semibold text-gray-900">{selectedCoupon.name}</p>
              <p className="text-sm text-gray-600">
                必要マイル:{' '}
                <span className="font-semibold text-indigo-700">
                  {selectedCoupon.requiredMiles.toLocaleString()} マイル
                </span>
              </p>
              <p className="text-xs text-gray-400">
                交換後の残高:{' '}
                {(displayBalance - selectedCoupon.requiredMiles).toLocaleString()} マイル
              </p>
            </div>

            {/* エラーメッセージ */}
            {redeemError && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600"
              >
                {redeemError}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ---- クーポンコード表示モーダル ---- */}
      <Modal
        isOpen={isCodeOpen}
        onClose={handleCodeClose}
        title="交換完了"
        cancelLabel="閉じる"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            クーポンの交換が完了しました！以下のコードをご利用ください。
          </p>

          {redeemedCouponName && (
            <p className="text-sm font-semibold text-gray-900">{redeemedCouponName}</p>
          )}

          {/* クーポンコード */}
          <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 px-6 py-5 text-center">
            <p className="text-xs text-indigo-500 font-medium mb-2">クーポンコード</p>
            <p
              className="text-2xl font-bold font-mono tracking-widest text-indigo-800 break-all"
              aria-label={`クーポンコード: ${couponCode ?? ''}`}
            >
              {couponCode}
            </p>
          </div>

          <p className="text-xs text-gray-400 text-center">
            このコードを店頭でご提示ください
          </p>

          {/* 更新後の残高 */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-center">
            <p className="text-xs text-gray-500">現在のマイル残高</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">
              {displayBalance.toLocaleString()}
              <span className="text-sm font-normal text-gray-500 ml-1">マイル</span>
            </p>
          </div>
        </div>
      </Modal>

    </div>
  )
}
