import React, { useEffect, useRef, useState } from 'react'
import { useMultiplayer } from '../context/MultiplayerProvider'

export const MultiplayerChat: React.FC = () => {
  const { connected, players, chatMessages, sendChat, playerCount } = useMultiplayer()
  const [message, setMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      sendChat(message)
      setMessage('')
    }
  }

  return (
    <div className="rounded-lg border-2 border-[#6b371d] bg-[#2d160d]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_0_0_2px_rgba(245,193,108,0.16)]">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded border border-[#a96b32]/70 bg-[#5a2b17] px-3 py-2 text-center shadow-inner"
      >
        <h3 className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide text-[#ffd99a]">
          💬 Multijugador
          {/* Online indicator */}
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-500'}`} />
          <span className="text-xs font-bold text-emerald-300">{playerCount}</span>
        </h3>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Online players */}
          <div className="rounded border border-[#8f5728]/40 bg-[#160b08]/60 p-2">
            <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#f7c878]">
              En línea ({playerCount})
            </div>
            {players.length === 0 ? (
              <p className="text-[11px] text-[#ffe7bd]/50 italic">Solo tú en el mundo.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {players.map(p => (
                  <span
                    key={p.socketId}
                    className="inline-flex items-center gap-1 rounded border border-[#8f5728]/30 bg-[#3b1d11]/60 px-2 py-0.5 text-[11px] font-bold text-[#ffe2aa]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {p.username}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chat messages */}
          <div
            ref={scrollRef}
            className="h-32 overflow-y-auto rounded border border-[#8f5728]/40 bg-[#160b08]/60 p-2 space-y-1"
          >
            {chatMessages.length === 0 ? (
              <p className="text-[11px] text-[#ffe7bd]/40 italic">Sin mensajes aún...</p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={`${msg.timestamp}-${i}`} className="text-[11px]">
                  <span className="font-bold text-[#f7c878]">{msg.username}:</span>{' '}
                  <span className="text-[#ffe7bd]/80">{msg.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={200}
              className="flex-1 rounded border border-[#8f5728]/50 bg-[#160b08]/80 px-3 py-1.5 text-xs text-white placeholder-[#a96b32]/50 focus:border-[#f7c878]/50 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!message.trim() || !connected}
              className="rounded border border-emerald-400/30 bg-gradient-to-b from-emerald-700 to-emerald-950 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:brightness-110 disabled:opacity-40"
            >
              ➤
            </button>
          </form>

          {!connected && (
            <p className="text-center text-[10px] text-rose-300/70">⚠️ Desconectado del servidor</p>
          )}
        </div>
      )}
    </div>
  )
}
