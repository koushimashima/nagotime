import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import './utils/leafletIconFix'
import App from './App'

async function bootstrap() {
  // MSW はデモ用途のため開発環境と本番ビルド両方で起動する。
  // ただし Service Worker の登録完了を待たずにレンダリングを開始し、
  // 登録中もUIが表示されるようにする（onUnhandledRequest: 'bypass' で
  // 未登録状態のリクエストは素通しされるため実害なし）。
  if (import.meta.env.DEV || import.meta.env.MODE === 'production') {
    const { worker } = await import('./mocks/browser')
    // await しない — Service Worker の登録はバックグラウンドで進める
    worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
