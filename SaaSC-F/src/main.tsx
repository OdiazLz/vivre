import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode><AuthProvider><Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">Cargando módulo…</div>}><App /></Suspense></AuthProvider></StrictMode>,
)
