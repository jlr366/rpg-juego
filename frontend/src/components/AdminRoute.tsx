/**
 * File: src/components/AdminRoute.tsx
 * Description: Route guard that allows only admin users to access children.
 */

import React from 'react'
import { useAuth } from '../context/AuthProvider'
import { Navigate } from 'react-router'

interface AdminRouteProps {
  children: React.ReactElement
}

/**
 * Component: AdminRoute
 * Renders children only when current user is an admin. Otherwise redirects.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isReady } = useAuth()

  if (!isReady) {
    return <div className="p-6 text-black">Cargando sesión…</div>
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute