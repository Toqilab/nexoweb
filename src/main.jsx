import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  let recargandoPorActualizacion = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargandoPorActualizacion) return
    recargandoPorActualizacion = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch((error) => console.error('Service Worker:', error))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div className="pantalla-carga"><span className="spinner-carga" /><h2>NexoWeb</h2><p>Cargando módulo...</p></div>}>
      <App />
    </Suspense>
  </StrictMode>,
)
