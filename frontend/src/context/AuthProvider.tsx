import { API_BASE_URL } from '../config'
import React, { createContext, useState, useEffect, useCallback } from 'react'

export interface User {
  id: string
  username: string
  role: 'admin' | 'player'
}

interface AuthContextType {
  user: User | null
  isReady: boolean
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  register: (username: string, password: string, extra?: { email?: string; age?: number; profession?: string }) => Promise<boolean>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔍 Función para verificar sesión al cargar la app
  useEffect(() => {
    const loadSession = async () => {
      try {
        console.log(`🔵 [AuthProvider] Intentando conectar a: ${API_BASE_URL}/api/auth/session`)
        
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        console.log(`📊 [AuthProvider] Respuesta: ${response.status} ${response.statusText}`)

        if (response.ok) {
          const userData = await response.json()
          console.log('✅ [AuthProvider] Sesión recuperada:', userData)
          setUser(userData)
        } else if (response.status === 401) {
          console.log('⚠️ [AuthProvider] Sin sesión activa (401)')
          setUser(null)
        } else {
          console.warn(`⚠️ [AuthProvider] Estado inesperado: ${response.status}`)
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Error de red:', error)
        setError('No se pudo conectar al servidor')
        setUser(null)
      } finally {
        setIsReady(true)
      }
    }

    loadSession()
  }, [])

  // 🔐 LOGIN
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        console.log(`\n🔵 [Login] Iniciando login con usuario: "${username}"`)

        // Validaciones básicas
        if (!username || !password) {
          console.warn('⚠️ [Login] Username o password vacío')
          setError('Username y password requeridos')
          return false
        }

        if (username.length < 3) {
          console.warn('⚠️ [Login] Username muy corto')
          setError('Username debe tener al menos 3 caracteres')
          return false
        }

        if (password.length < 6) {
          console.warn('⚠️ [Login] Password muy corta')
          setError('Password debe tener al menos 6 caracteres')
          return false
        }

        console.log(`📨 [Login] Enviando petición a: ${API_BASE_URL}/api/auth/login`)

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        })

        console.log(`📊 [Login] Respuesta: ${response.status} ${response.statusText}`)

        const data = await response.json()
        console.log(`📦 [Login] Datos recibidos:`, data)

        if (!response.ok) {
          console.error('❌ [Login] Error en respuesta:', data.error)
          setError(data.error || 'Error en login')
          return false
        }

        console.log('✅ [Login] Login exitoso:', data)
        setUser(data)
        setError(null)
        return true

      } catch (error) {
        console.error('❌ [Login] Error de conexión:', error)
        setError(error instanceof Error ? error.message : 'Error de conexión')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // 📝 REGISTER
  const register = useCallback(
    async (username: string, password: string, extra?: { email?: string; age?: number; profession?: string }): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        if (!username || !password) {
          setError('Username y password requeridos')
          return false
        }

        if (username.length < 3) {
          setError('Username debe tener al menos 3 caracteres')
          return false
        }

        if (password.length < 6) {
          setError('Password debe tener al menos 6 caracteres')
          return false
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            password,
            email: extra?.email || '',
            age: extra?.age || null,
            profession: extra?.profession || '',
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Error en registro')
          return false
        }

        setUser(data)
        setError(null)
        return true
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error de conexión')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // 🚪 LOGOUT
  const logout = useCallback(async () => {
    try {
      setLoading(true)
      console.log('\n🔵 [Logout] Cerrando sesión...')

      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log(`📊 [Logout] Respuesta: ${response.status}`)

      if (response.ok) {
        console.log('✅ [Logout] Sesión cerrada en servidor')
      } else {
        console.warn('⚠️ [Logout] Error al cerrar sesión en servidor')
      }
    } catch (error) {
      console.error('❌ [Logout] Error de conexión:', error)
    } finally {
      setUser(null)
      setError(null)
      setLoading(false)
      console.log('✅ [Logout] Estado local limpiado')
    }
  }, [])

  // 🧹 Limpiar errores
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    isReady,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 🎯 Hook personalizado
export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}