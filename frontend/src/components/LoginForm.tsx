import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../context/AuthProvider'

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [profession, setProfession] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  const { login, register, error: authError, clearError } = useAuth()
  const navigate = useNavigate()

  // Password validation
  const passLength = password.length >= 6
  const passUpper = /[A-Z]/.test(password)
  const passNumber = /[0-9]/.test(password)
  const passValid = passLength && passUpper && passNumber

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isRegister && !passValid) {
      setError('La contraseña no cumple los requisitos')
      return
    }

    if (isRegister && !email.trim()) {
      setError('El correo electrónico es obligatorio')
      return
    }

    setIsLoading(true)

    try {
      let success
      if (isRegister) {
        success = await register(username, password, {
          email: email.trim(),
          age: age ? parseInt(age) : undefined,
          profession: profession.trim(),
        })
      } else {
        success = await login(username, password)
      }

      if (success) {
        navigate(username.trim().toLowerCase() === 'admin' ? '/admin' : '/', { replace: true })
      } else {
        setError(authError || (isRegister ? 'Error al registrarse' : 'Usuario o contraseña inválidos'))
      }
    } catch (err) {
      setError('Error de conexión')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,200,255,0.08)]">
      {/* Header */}
      <div className="mb-6 rounded border border-cyan-800/50 bg-[#0d1f3c] px-4 py-3 text-center shadow-inner">
        <h2 className="text-xl font-black uppercase tracking-wide text-cyan-300">
          {isRegister ? '📝 Crear Cuenta' : '🔐 Iniciar Sesión'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-rose-200 shadow-inner">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-cyan-400">
            Usuario *
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-slate-600/50 bg-[#060e1a]/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Tu nombre de aventurero"
            required
            disabled={isLoading}
            minLength={3}
          />
        </div>

        {/* Extra fields only for registration */}
        {isRegister && (
          <>
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-cyan-400">
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-slate-600/50 bg-[#060e1a]/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                placeholder="correo@ejemplo.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Name (full name) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Age */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-cyan-400">
                  Edad
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded border border-slate-600/50 bg-[#060e1a]/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  placeholder="25"
                  min={1}
                  max={120}
                  disabled={isLoading}
                />
              </div>

              {/* Profession */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-cyan-400">
                  Profesión
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full rounded border border-slate-600/50 bg-[#060e1a]/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  placeholder="Ingeniero, Estudiante..."
                  disabled={isLoading}
                />
              </div>
            </div>
          </>
        )}

        {/* Password */}
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-cyan-400">
            Contraseña *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-slate-600/50 bg-[#060e1a]/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            placeholder="Tu contraseña secreta"
            required
            disabled={isLoading}
          />

          {/* Password requirements — always visible during registration */}
          {isRegister && (
            <div className="mt-2 space-y-1 rounded border border-[#8f5728]/40 bg-[#160b08]/60 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-500">Requisitos de contraseña:</p>
              <div className="space-y-0.5">
                <p className={`text-xs ${passLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passLength ? '✓' : '○'} Mínimo 6 caracteres
                </p>
                <p className={`text-xs ${passUpper ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passUpper ? '✓' : '○'} Al menos una letra mayúscula
                </p>
                <p className={`text-xs ${passNumber ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {passNumber ? '✓' : '○'} Al menos un número
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || (isRegister && !passValid)}
          className="mt-2 w-full rounded border border-cyan-500/30 bg-gradient-to-b from-cyan-700 to-cyan-950 px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? '⏳ Cargando...' : isRegister ? '⚔️ Crear Aventurero' : '🗡️ Entrar al Mundo'}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700/40" />
        <span className="text-[10px] text-slate-500">✦</span>
        <div className="h-px flex-1 bg-slate-700/40" />
      </div>

      <div className="text-center">
        <button
          onClick={() => {
            setIsRegister(!isRegister)
            setError('')
            clearError()
          }}
          className="text-sm text-cyan-400/70 transition hover:text-cyan-300 hover:underline"
        >
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}
