import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MileProvider } from './contexts/MileContext'
import { Layout } from './components/Layout/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LoginPage } from './features/auth/LoginPage'
import { FeedPage } from './features/feed/FeedPage'
import { ReviewDetailPage } from './features/review/ReviewDetailPage'
import { SubmitPage } from './features/submit/SubmitPage'
import { MapPage } from './features/map/MapPage'
import { MilesPage } from './features/miles/MilesPage'
import { AdminPage } from './features/admin/AdminPage'

/**
 * AppRoutes はルーティング定義をまとめたコンポーネント。
 * AuthProvider の内側に置くことで useAuth / useNavigate が使用可能になる。
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider は BrowserRouter の内側に置くことで useNavigate が使用可能 */}
      <AuthProvider>
        <MileProvider>
          <AppRoutes />
        </MileProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
