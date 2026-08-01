// src/mocks/handlers/miles.ts
// マイル系ハンドラー（Requirements 8.1〜8.8）

import { http, HttpResponse, delay } from 'msw'
import { mockUsers } from '../data/users'
import { mockTransactions } from '../data/transactions'
import { mockTickets } from '../data/tickets'
import type { MileTransaction, Ticket } from '../data/types'

// ---- メモリ上のミュータブルなデータ ----

const userBalances = new Map<string, number>(
  mockUsers.map((u) => [u.userId, u.mileBalance]),
)

const userTransactions = new Map<string, MileTransaction[]>()
mockTransactions.forEach((tx) => {
  const list = userTransactions.get(tx.userId) ?? []
  userTransactions.set(tx.userId, [...list, tx])
})

let tickets: Ticket[] = [...mockTickets]

// ---- ヘルパー ----

function extractUserId(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  const match = token.match(/^mock-jwt-token-(.+)-\d+$/)
  return match ? match[1] : 'user-unknown'
}

function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 16; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function unauthorizedResponse() {
  return HttpResponse.json(
    { error: { code: 'UNAUTHORIZED', message: '認証が必要です', fields: [] } },
    { status: 401 },
  )
}

function userNotFoundResponse() {
  return HttpResponse.json(
    { error: { code: 'NOT_FOUND', message: '指定されたユーザーが見つかりません', fields: [] } },
    { status: 404 },
  )
}

export const mileHandlers = [
  // GET /api/miles
  http.get('/api/miles', async ({ request }) => {
    await delay(300)
    const userId = extractUserId(request.headers.get('Authorization'))
    if (!userId) return unauthorizedResponse()

    const balance = userBalances.get(userId)
    if (balance === undefined) return userNotFoundResponse()

    const transactions = (userTransactions.get(userId) ?? [])
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    return HttpResponse.json({ balance, transactions })
  }),

  // POST /api/tickets/redeem
  http.post('/api/tickets/redeem', async ({ request }) => {
    await delay(300)
    const userId = extractUserId(request.headers.get('Authorization'))
    if (!userId) return unauthorizedResponse()

    let body: { ticketId?: string }
    try {
      body = (await request.json()) as { ticketId?: string }
    } catch {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です', fields: [] } },
        { status: 400 },
      )
    }

    const { ticketId } = body
    if (!ticketId) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ticketId は必須です', fields: ['ticketId'] } },
        { status: 400 },
      )
    }

    const balance = userBalances.get(userId)
    if (balance === undefined) return userNotFoundResponse()

    const ticketIndex = tickets.findIndex((t) => t.ticketId === ticketId)
    if (ticketIndex === -1) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '指定されたチケットが見つかりません', fields: ['ticketId'] } },
        { status: 404 },
      )
    }

    const ticket = tickets[ticketIndex]

    if (ticket.status === 'EXPIRED' || new Date(ticket.expiresAt) < new Date()) {
      return HttpResponse.json(
        { error: { code: 'TICKET_EXPIRED', message: 'このチケットは有効期限が切れています', fields: [] } },
        { status: 409 },
      )
    }

    if (ticket.status === 'SOLD_OUT' || ticket.redeemedCount >= ticket.issueLimit) {
      return HttpResponse.json(
        { error: { code: 'TICKET_SOLD_OUT', message: 'このチケットは売り切れです', fields: [] } },
        { status: 409 },
      )
    }

    if (balance < ticket.requiredMiles) {
      return HttpResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_MILES',
            message: `マイルが不足しています。現在の残高: ${balance}マイル、必要マイル: ${ticket.requiredMiles}マイル（あと${ticket.requiredMiles - balance}マイル必要です）`,
            fields: [],
            currentBalance: balance,
            requiredMiles: ticket.requiredMiles,
            shortfall: ticket.requiredMiles - balance,
          },
        },
        { status: 409 },
      )
    }

    const newBalance = balance - ticket.requiredMiles
    userBalances.set(userId, newBalance)

    const newTransaction: MileTransaction = {
      transactionId: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      type: 'REDEEM_TICKET',
      amount: -ticket.requiredMiles,
      balanceAfter: newBalance,
      relatedId: ticketId,
      createdAt: new Date().toISOString(),
    }
    userTransactions.set(userId, [...(userTransactions.get(userId) ?? []), newTransaction])

    const newRedeemedCount = ticket.redeemedCount + 1
    tickets[ticketIndex] = {
      ...ticket,
      redeemedCount: newRedeemedCount,
      status: newRedeemedCount >= ticket.issueLimit ? 'SOLD_OUT' : ticket.status,
    }

    return HttpResponse.json(
      { ticketCode: generateTicketCode(), ticketName: ticket.name, newBalance, transaction: newTransaction },
      { status: 200 },
    )
  }),

  // GET /api/tickets/active
  http.get('/api/tickets/active', async () => {
    await delay(200)
    const now = new Date()
    const activeTickets = tickets
      .filter((t) => t.status === 'ACTIVE' && new Date(t.expiresAt) >= now && t.redeemedCount < t.issueLimit)
      .slice()
      .sort(() => Math.random() - 0.5)
    return HttpResponse.json({ tickets: activeTickets, total: activeTickets.length })
  }),
]

export function getTickets(): Ticket[] { return tickets }
export function setTickets(updated: Ticket[]): void { tickets = updated }
