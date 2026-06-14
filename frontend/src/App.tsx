import React from 'react'
import { HashRouter, Route, Routes } from 'react-router'
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
              </Routes>
            </HashRouter>
          </MusicProvider>
        </StoryProvider>
      </MultiplayerProvider>
    </AuthProvider>
  )
}
