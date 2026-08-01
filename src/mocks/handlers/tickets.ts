// src/mocks/handlers/tickets.ts
// チケット管理ハンドラー（Requirements 9.1〜9.5）

import { http, HttpResponse, delay } from 'msw'
import { getTickets, setTickets } from './miles'
import type { Ticket } from '../data/types'

function extractAuth(authHeader: string | null): { userId: string | null; role: string | null } {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { userId: null, role: null }
  const token = authHeader.slice(7)
  const match = token.match(/^mock-jwt-token-(.+)-\d+$/)
  if (!match) return { userId: 'user-unknown', role: 'user' }
  const userId = match[1]
  return { userId, role: userId.startsWith('admin') ? 'sponsor-admin' : 'user' }
}

function unauthorizedResponse() {
  return HttpResponse.json(
    { error: { code: 'UNAUTHORIZED', message: '認証が必要です', fields: [] } },
    { status: 401 },
  )
}

function forbiddenResponse() {
  return HttpResponse.json(
    { error: { code: 'FORBIDDEN', message: 'この操作にはsponsor-adminロールが必要です', fields: [] } },
    { status: 403 },
  )
}

export const ticketHandlers = [
  // GET /api/tickets — sponsor-admin 専用
  http.get('/api/tickets', async ({ request }) => {
    await delay(300)
    const { userId, role } = extractAuth(request.headers.get('Authorization'))
    if (!userId) return unauthorizedResponse()
    if (role !== 'sponsor-admin') return forbiddenResponse()

    const tickets = getTickets()
    const now = new Date()
    const updated = tickets.map((t) =>
      t.status === 'ACTIVE' && new Date(t.expiresAt) < now ? { ...t, status: 'EXPIRED' as const } : t,
    )
    if (updated.some((t, i) => t.status !== tickets[i].status)) setTickets(updated)

    return HttpResponse.json({ tickets: updated, total: updated.length })
  }),

  // POST /api/tickets — チケット登録（管理者用）
  http.post('/api/tickets', async ({ request }) => {
    await delay(300)
    const { userId, role } = extractAuth(request.headers.get('Authorization'))
    if (!userId) return unauthorizedResponse()
    if (role !== 'sponsor-admin') return forbiddenResponse()

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です', fields: [] } },
        { status: 400 },
      )
    }

    const errors: string[] = []
    const { name, description, requiredMiles, expiresAt, issueLimit } = body

    if (typeof name !== 'string' || name.length < 1 || name.length > 100) errors.push('name')
    if (typeof description !== 'string' || description.length > 500) errors.push('description')
    if (typeof requiredMiles !== 'number' || !Number.isInteger(requiredMiles) || requiredMiles < 1) errors.push('requiredMiles')
    if (typeof expiresAt !== 'string' || isNaN(Date.parse(expiresAt))) errors.push('expiresAt')
    if (typeof issueLimit !== 'number' || !Number.isInteger(issueLimit) || issueLimit < 1) errors.push('issueLimit')

    if (errors.length > 0) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: `入力内容にエラーがあります: ${errors.join(', ')}`, fields: errors } },
        { status: 400 },
      )
    }

    const newTicket: Ticket = {
      ticketId: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sponsorId: userId,
      sponsorName: (body.sponsorName as string) ?? '協賛企業',
      name: name as string,
      description: description as string,
      requiredMiles: requiredMiles as number,
      expiresAt: expiresAt as string,
      issueLimit: issueLimit as number,
      redeemedCount: 0,
      status: new Date(expiresAt as string) < new Date() ? 'EXPIRED' : 'ACTIVE',
      thumbnailUrl: (body.thumbnailUrl as string | null) ?? null,
    }

    setTickets([...getTickets(), newTicket])
    return HttpResponse.json(newTicket, { status: 201 })
  }),
]
