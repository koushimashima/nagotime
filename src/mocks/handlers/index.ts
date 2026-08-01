import { RequestHandler } from 'msw'
import { authHandlers } from './auth'
import { reviewHandlers } from './reviews'
import { spotHandlers } from './spots'
import { mileHandlers } from './miles'
import { ticketHandlers } from './tickets'

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...reviewHandlers,
  ...spotHandlers,
  ...mileHandlers,
  ...ticketHandlers,
]
