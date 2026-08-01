import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import './utils/leafletIconFix'
import App from './App'

async function bootstrap() {
  // MSW を開発環境と本番ビルド（デモ用）の両方で起動する
  // import.meta.env.MODE === 'production' でも有効化することで
  // vite build 後の静的ホスティングデモでもモックAPIが動作する
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
