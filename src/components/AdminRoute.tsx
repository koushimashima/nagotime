import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AdminRouteProps {
  children: React.ReactNode
}

/**
 * sponsor-admin ロール以外のユーザーを / にリダイレクトするルートガード。
 * AuthContext の user.role を参照する（Requirements 11.1, 11.3）。
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated } = useAuth()

  // 未認証の場合はまず /login へ
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 認証済みだが sponsor-admin でない場合は / へ
  if (user?.role !== 'sponsor-admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
