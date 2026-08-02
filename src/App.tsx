import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MileProvider } from './contexts/MileContext'
import { RecommendProvider } from './contexts/RecommendContext'
import { Layout } from './components/Layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'

// 各ページを lazy import することで、初回バンドルサイズを削減する。
// それぞれのページは対応するルートに初めてアクセスしたときに動的に読み込まれる。
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const FeedPage = lazy(() => import('./features/feed/FeedPage').then(m => ({ default: m.FeedPage })))
const ReviewDetailPage = lazy(() => import('./features/review/ReviewDetailPage').then(m => ({ default: m.ReviewDetailPage })))
const SubmitPage = lazy(() => import('./features/submit/SubmitPage').then(m => ({ default: m.SubmitPage })))
const MapPage = lazy(() => import('./features/map/MapPage').then(m => ({ default: m.MapPage })))
const MilesPage = lazy(() => import('./features/miles/MilesPage').then(m => ({ default: m.MilesPage })))
const AdminPage = lazy(() => import('./features/admin/AdminPage').then(m => ({ default: m.AdminPage })))
const AboutPage = lazy(() => import('./features/about/AboutPage').then(m => ({ default: m.AboutPage })))

/** ルート切り替え中に表示するフォールバック */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  )
}

/**
 * AppRoutes はルーティング定義をまとめたコンポーネント。
 * AuthProvider の内側に置くことで useAuth / useNavigate が使用可能になる。
 */
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/reviews/:id" element={<ReviewDetailPage />} />
          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <SubmitPage />
              </ProtectedRoute>
            }
          />
          <Route path="/map" element={<MapPage />} />
          <Route
            path="/miles"
            element={
              <ProtectedRoute>
                <MilesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider は BrowserRouter の内側に置くことで useNavigate が使用可能 */}
      <AuthProvider>
        <MileProvider>
          <RecommendProvider>
            <AppRoutes />
          </RecommendProvider>
        </MileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
