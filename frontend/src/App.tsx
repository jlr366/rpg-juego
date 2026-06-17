import React from 'react'
import { HashRouter, Route, Routes, useNavigate } from 'react-router'
import HomePage from './pages/Home'
import LoginPage from './pages/Login'
import AdminPage from './pages/Admin'
import { AuthProvider } from './context/AuthProvider'
import PrivateRoute from './components/PrivateRoute'
import AdminRoute from './components/AdminRoute'
import { StoryProvider } from './context/StoryProvider'
import { MusicProvider } from './context/MusicProvider'
import { GameProvider } from './context/GameProvider'
import { MultiplayerProvider } from './context/MultiplayerProvider'
import { ExplorationPanel } from './components/ExplorationPanel'

function DemoGamePage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-500/40 bg-purple-950/80 px-5 py-3 shadow">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <div className="font-black text-purple-200 text-lg">MODO DEMO — Vista previa del juego</div>
              <div className="text-xs text-purple-400">Sin daño real · Mini-juegos saltables · Solo para el administrador</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="rounded-lg border border-purple-400/30 bg-purple-900/60 px-4 py-2 text-sm font-bold text-purple-200 hover:bg-purple-800/70 active:scale-95"
          >
            ← Volver al Admin
          </button>
        </div>
        <GameProvider>
          <ExplorationPanel demoMode />
        </GameProvider>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MultiplayerProvider>
        <StoryProvider>
          <MusicProvider>
            <HashRouter>
              <Routes>
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <GameProvider>
                        <HomePage />
                      </GameProvider>
                    </PrivateRoute>
                  }
                />

                <Route path="/login" element={<LoginPage />} />

                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPage />
                    </AdminRoute>
                  }
                />

                <Route
                  path="/demo"
                  element={
                    <AdminRoute>
                      <DemoGamePage />
                    </AdminRoute>
                  }
                />
              </Routes>
            </HashRouter>
          </MusicProvider>
        </StoryProvider>
      </MultiplayerProvider>
    </AuthProvider>
  )
}
