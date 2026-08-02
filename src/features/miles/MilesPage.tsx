// src/features/miles/MilesPage.tsx
// マイル・チケット画面（Requirements 8.1〜8.8）

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { useAuth } from '../../contexts/AuthContext'
import { useMile } from '../../contexts/MileContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Modal } from '../../components/Modal'
import { MapPin, X, Ticket as TicketIcon, CalendarDays, ChevronRight } from 'lucide-react'
import type { Ticket, MileTransaction, MileTransactionType } from '../../mocks/data/types'

const TRANSACTION_TYPE_LABEL: Record<MileTransactionType, string> = {
  GRANT_REVIEW: '口コミ投稿',
  GRANT_LIKES: 'いいね達成',
  GRANT_VIEWS: '閲覧数達成',
  REDEEM_TICKET: 'チケット交換',
}

interface MilesApiResponse {
  balance: number
  transactions: MileTransaction[]
}

interface RedeemApiResponse {
  ticketCode: string
  ticketName: string
  newBalance: number
}

interface ApiErrorResponse {
  error: { code: string; message: string; shortfall?: number }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function MilesPage() {
  const { user } = useAuth()
  const { balance: localBalance, deductMiles, syncBalance } = useMile()

  const [transactions, setTransactions] = useState<MileTransaction[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  const [isCodeOpen, setIsCodeOpen] = useState(false)
  const [ticketCode, setTicketCode] = useState<string | null>(null)
  const [redeemedTicketName, setRedeemedTicketName] = useState<string | null>(null)

  const displayBalance = localBalance
  const [historyOpen, setHistoryOpen] = useState(false)

  const fetchMilesData = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setFetchError(null)
    try {
      const [milesRes, ticketsRes] = await Promise.all([
        fetch('/api/miles', {
          headers: { Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}` },
        }),
        fetch('/api/tickets/active'),
      ])

      if (!milesRes.ok) {
        const err = (await milesRes.json()) as ApiErrorResponse
        throw new Error(err.error?.message ?? 'マイル情報の取得に失敗しました')
      }

      const milesData = (await milesRes.json()) as MilesApiResponse
      setTransactions(milesData.transactions)
      syncBalance(milesData.balance)

      if (ticketsRes.ok) {
        const data = (await ticketsRes.json()) as { tickets: Ticket[] }
        // マイルが足りているチケットを先頭に、同グループ内はランダム
        const balance = milesData.balance
        const sorted = [...data.tickets].sort((a, b) => {
          const aAffordable = a.requiredMiles <= balance ? 0 : 1
          const bAffordable = b.requiredMiles <= balance ? 0 : 1
          if (aAffordable !== bAffordable) return aAffordable - bAffordable
          return Math.random() - 0.5
        })
        setTickets(sorted)
      } else {
        setTickets([])
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => { void fetchMilesData() }, [fetchMilesData])

  function handleRedeemClick(ticket: Ticket) {
    setSelectedTicket(ticket)
    setRedeemError(null)
    setIsConfirmOpen(true)
  }

  function handleDetailOpen(ticket: Ticket) {
    setSelectedTicket(ticket)
    setIsDetailOpen(true)
  }

  function handleDetailClose() {
    setIsDetailOpen(false)
    // 確認モーダルが開いていない場合のみ selectedTicket をリセット
    if (!isConfirmOpen) {
      setSelectedTicket(null)
    }
  }

  function handleRedeemFromDetail() {
    // 詳細モーダルを閉じてから確認モーダルを開く
    setIsDetailOpen(false)
    setRedeemError(null)
    setIsConfirmOpen(true)
  }

  async function handleConfirmRedeem() {
    if (!selectedTicket || !user) return
    setIsRedeeming(true)
    setRedeemError(null)
    try {
      const res = await fetch('/api/tickets/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer mock-jwt-token-${user.userId}-${Date.now()}`,
        },
        body: JSON.stringify({ ticketId: selectedTicket.ticketId }),
      })

      const data = (await res.json()) as RedeemApiResponse | ApiErrorResponse

      if (!res.ok) {
        setRedeemError((data as ApiErrorResponse).error?.message ?? '交換に失敗しました')
        return
      }

      const success = data as RedeemApiResponse
      deductMiles(selectedTicket.requiredMiles)
      setTicketCode(success.ticketCode)
      setRedeemedTicketName(success.ticketName)
      setIsConfirmOpen(false)
      setIsCodeOpen(true)
      await fetchMilesData()
    } catch {
      setRedeemError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsRedeeming(false)
    }
  }

  function handleCodeClose() {
    setIsCodeOpen(false)
    setTicketCode(null)
    setRedeemedTicketName(null)
    setSelectedTicket(null)
    setIsDetailOpen(false)
  }

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
          <button type="button" onClick={() => void fetchMilesData()} className="mt-3 text-xs font-medium text-red-700 underline">
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-8">

      {/* マイル残高カード */}
      <section aria-label="マイル残高">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-400 text-white px-6 py-8 shadow-lg">
          <p className="text-sm font-medium text-orange-100 text-left">あなたの残高</p>
          <p className="mt-2 text-5xl font-bold tracking-tight text-right">
            {displayBalance.toLocaleString()}
            <span className="ml-2 text-2xl font-normal text-orange-200">マイル</span>
          </p>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => setHistoryOpen(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-100 underline underline-offset-2 hover:text-white transition-colors"
            >
              {historyOpen ? '取引履歴を閉じる ▲' : '取引履歴 ▼'}
            </button>
          </div>
        </div>

        {historyOpen && (
          <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">取引履歴がありません</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.transactionId} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{TRANSACTION_TYPE_LABEL[tx.type]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(tx.createdAt)}</p>
                  </div>
                  <div className="ml-4 flex flex-col items-end shrink-0">
                    <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} マイル
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">残高 {tx.balanceAfter.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* チケット一覧 */}
      <section aria-label="チケット一覧">
        <h2 className="text-base font-semibold text-gray-800 mb-3">利用可能なチケット</h2>

        {tickets.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">現在利用可能なチケットはありません</p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => {
              const shortfall = ticket.requiredMiles - displayBalance
              const canRedeem = shortfall <= 0
              return (
                <div key={ticket.ticketId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* カード本体：タップで詳細モーダルを開く */}
                  <button
                    type="button"
                    onClick={() => handleDetailOpen(ticket)}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-400"
                    aria-label={`${ticket.name}の詳細を見る`}
                  >
                    <div className="flex gap-4 p-4">
                      {ticket.thumbnailUrl && (
                        <img src={ticket.thumbnailUrl} alt={ticket.name} className="w-20 h-20 rounded-lg object-cover shrink-0" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-orange-500 font-medium flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          {ticket.sponsorName}
                        </p>
                        <h3 className="text-sm font-semibold text-gray-900 mt-0.5 leading-snug">{ticket.name}</h3>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="inline-flex items-center text-xs font-semibold text-orange-600 bg-orange-50 rounded-full px-2.5 py-0.5">
                            {ticket.requiredMiles.toLocaleString()} マイル
                          </span>
                          <span className="text-xs text-gray-400">期限: {formatDate(ticket.expiresAt)}</span>
                        </div>
                        {!canRedeem && (
                          <p className="mt-2 text-xs text-amber-600 font-medium">あと {shortfall.toLocaleString()} マイル必要です</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 self-center" aria-hidden="true" />
                    </div>
                  </button>
                  <div className="px-4 pb-4">
                    <button
                      type="button"
                      onClick={() => handleRedeemClick(ticket)}
                      disabled={!canRedeem}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        canRedeem
                          ? 'bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label={canRedeem ? `${ticket.name}を交換する` : `${ticket.name}（マイル不足のため交換不可）`}
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

      {/* チケット詳細モーダル */}
      {selectedTicket && (
        <div
          role={isDetailOpen ? 'dialog' : undefined}
          aria-modal={isDetailOpen ? 'true' : undefined}
          aria-label={isDetailOpen ? `${selectedTicket.name}の詳細` : undefined}
          className={`fixed inset-x-0 top-0 bottom-0 md:bottom-0 z-50 flex items-end justify-center transition-all duration-300 ${isDetailOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{ bottom: 'var(--bottom-nav-height, 4rem)' }}
        >
          {/* オーバーレイ（画面全体を覆う） */}
          <div
            className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isDetailOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleDetailClose}
            aria-hidden="true"
          />

          {/* シート本体 */}
          <div
            className={`relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-full md:max-h-[96dvh] transition-transform duration-300 ${isDetailOpen ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={handleDetailClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="詳細を閉じる"
            >
              <X className="w-5 h-5" />
            </button>

            {/* サムネイル */}
            {selectedTicket.thumbnailUrl && (
              <div className="px-4 pt-2">
                <img
                  src={selectedTicket.thumbnailUrl}
                  alt={selectedTicket.name}
                  className="w-full h-44 rounded-xl object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* 本文 */}
            <div className="px-5 pt-4 pb-2 space-y-5 overflow-y-auto flex-1">
              {/* スポンサー名 */}
              <p className="text-sm text-orange-500 font-medium flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                {selectedTicket.sponsorName}
              </p>

              {/* チケット名 */}
              <h2 className="text-lg font-bold text-gray-900 leading-snug -mt-2">
                {selectedTicket.name}
              </h2>

              {/* 説明（全文） */}
              <p className="text-sm text-gray-600 leading-relaxed">
                {selectedTicket.description}
              </p>

              {/* 詳細情報グリッド */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <TicketIcon className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs text-gray-500 w-24 shrink-0">必要マイル</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {selectedTicket.requiredMiles.toLocaleString()} マイル
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" aria-hidden="true" />
                  <span className="text-xs text-gray-500 w-24 shrink-0">有効期限</span>
                  <span className="text-sm text-gray-700">{formatDate(selectedTicket.expiresAt)}</span>
                </div>

              </div>

              {/* マイル不足メッセージ */}
              {displayBalance < selectedTicket.requiredMiles && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                  あと <span className="font-semibold">{(selectedTicket.requiredMiles - displayBalance).toLocaleString()} マイル</span> 貯めると交換できます
                </div>
              )}
            </div>

            {/* 交換ボタン（常に最下部に固定） */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
              <button
                type="button"
                onClick={handleRedeemFromDetail}
                disabled={displayBalance < selectedTicket.requiredMiles}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                  displayBalance >= selectedTicket.requiredMiles
                    ? 'bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                aria-label={
                  displayBalance >= selectedTicket.requiredMiles
                    ? `${selectedTicket.name}を交換する`
                    : `${selectedTicket.name}（マイル不足のため交換不可）`
                }
              >
                {displayBalance >= selectedTicket.requiredMiles ? '交換する' : 'マイルが不足しています'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認モーダル */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => { if (!isRedeeming) { setIsConfirmOpen(false); setRedeemError(null); setSelectedTicket(null) } }}
        onConfirm={() => void handleConfirmRedeem()}
        title="チケット交換の確認"
        confirmLabel="交換する"
        cancelLabel="キャンセル"
        isLoading={isRedeeming}
      >
        {selectedTicket && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">以下のチケットと交換しますか？</p>
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
              <p className="text-xs text-orange-500 font-medium">{selectedTicket.sponsorName}</p>
              <p className="text-sm font-semibold text-gray-900">{selectedTicket.name}</p>
              <p className="text-sm text-gray-600">
                必要マイル: <span className="font-semibold text-orange-600">{selectedTicket.requiredMiles.toLocaleString()} マイル</span>
              </p>
              <p className="text-xs text-gray-400">交換後の残高: {(displayBalance - selectedTicket.requiredMiles).toLocaleString()} マイル</p>
            </div>
            {redeemError && (
              <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                {redeemError}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* チケットコード表示モーダル */}
      <Modal isOpen={isCodeOpen} onClose={handleCodeClose} title="交換完了">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">チケットの交換が完了しました！</p>
          {redeemedTicketName && <p className="text-sm font-semibold text-gray-900">{redeemedTicketName}</p>}
          <div className="rounded-xl bg-orange-50 border-2 border-orange-200 px-6 py-5 flex flex-col items-center gap-3">
            {ticketCode && (
              <div
                className="bg-white p-3 rounded-lg shadow-sm"
                aria-label={`チケットQRコード: ${ticketCode}`}
              >
                <QRCode value={ticketCode} size={160} />
              </div>
            )}
            <p className="text-xs font-mono text-orange-700 break-all text-center">{ticketCode}</p>
          </div>
          <p className="text-xs text-gray-400 text-center">このQRコードを店頭でご提示ください</p>
        </div>
      </Modal>

    </div>
  )
}
