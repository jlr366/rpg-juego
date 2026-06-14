import React, { useState } from 'react'

export const MusicControl: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false)

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 p-3 rounded-full hover:bg-slate-700 transition"
      title={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
  )
}