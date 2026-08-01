import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 未認証ユーザーを /login にリダイレクトするルートガード。
 * AuthContext の isAuthenticated を参照する（Requirements 11.1, 11.3）。
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
