// src/utils/mileUtils.ts
// Mile and ticket utility functions for NagoTime

import type { Ticket, TicketAd, MileTransaction, Review } from '../mocks/data/types'

// toggleLike
export function toggleLike(
  likedSet: Set<string>,
  userId: string,
): { newSet: Set<string>; success: boolean } {
  if (likedSet.has(userId)) {
    return { newSet: new Set(likedSet), success: false }
  }
  const newSet = new Set(likedSet)
  newSet.add(userId)
  return { newSet, success: true }
}

// calcBalance
export function calcBalance(initial: number, transactions: MileTransaction[]): number {
  return Math.max(0, transactions.reduce((acc, tx) => acc + tx.amount, initial))
}

// generateTicketCode
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateTicketCode(): string {
  const length = Math.floor(Math.random() * 64) + 1
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return code
}

// injectAds
export function injectAds(reviews: Review[], tickets: Ticket[]): (Review | TicketAd)[] {
  if (reviews.length < 20) return [...reviews]

  const activeTickets = tickets.filter((t) => t.status === 'ACTIVE')
  if (activeTickets.length === 0) return [...reviews]

  const result: (Review | TicketAd)[] = []
  let adIndex = 0

  for (let i = 0; i < reviews.length; i++) {
    result.push(reviews[i])
    if ((i + 1) % 20 === 0) {
      result.push({
        type: 'ad',
        sponsored: true,
        ticket: activeTickets[adIndex++ % activeTickets.length],
      })
    }
  }

  return result
}
