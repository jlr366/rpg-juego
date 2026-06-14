/**
 * File: src/components/PrivateRoute.tsx
 * Description: Route guard that protects children behind authentication.
 */

import React from 'react'
import { useAuth } from '../context/AuthProvider'
import { Navigate } from 'react-router'

interface PrivateRouteProps {
  children: React.ReactElement
}

/**
 * Component: PrivateRoute
 * Renders children when authenticated, otherwise navigates to /login.
 */
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, isReady } = useAuth()

  if (!isReady) {
    // small placeholder while auth initializes
    return <div className="p-6 text-white">Cargando sesión…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute