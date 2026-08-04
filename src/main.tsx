import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import './utils/leafletIconFix'
import App from './App'

async function bootstrap() {
  // MSW はデモ用途のため開発環境と本番ビルド両方で起動する。
  // Service Worker の登録完了を待ってからレンダリングを開始することで、
  // 初回フェッチも MSW がインターセプトできるようにする。
  // （初回読み込み時に "The string did not match the expected pattern." が
  //   出るバグの修正: SW 未登録状態でフェッチが走るのを防ぐ）
  if (import.meta.env.DEV || import.meta.env.MODE === 'production') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
