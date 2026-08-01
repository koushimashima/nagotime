// src/mocks/data/users.ts
// ユーザーサンプルデータ（Requirements 8.1〜8.8）

import type { User } from './types'

export const mockUsers: User[] = [
  {
    userId: 'user-001',
    email: 'demo@example.com',
    displayName: '名古 大夢',
    role: 'user',
    mileBalance: 1250,
  },
  {
    userId: 'admin-001',
    email: 'admin@example.com',
    displayName: '管理者 一郎',
    role: 'sponsor-admin',
    mileBalance: 0,
  },
]

/** メールアドレスでユーザーを検索するユーティリティ */
export function findUserByEmail(email: string): User | undefined {
  return mockUsers.find((u) => u.email === email)
}
