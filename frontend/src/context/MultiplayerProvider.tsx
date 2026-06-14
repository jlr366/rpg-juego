import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { API_BASE_URL } from '../config'
import { useAuth } from './AuthProvider'

export interface OnlinePlayer {
  socketId: string
  userId: string
  username: string
  sceneKey: string
  x: number
  y: number
}

export interface ChatMessage {
  socketId: string
  username: string
  message: string
  timestamp: number
}

interface MultiplayerContextType {
  connected: boolean
  players: OnlinePlayer[]
  chatMessages: ChatMessage[]
  sendMove: (sceneKey: string, x?: number, y?: number) => void
  sendChat: (message: string) => void
  playerCount: number
}

const MultiplayerContext = createContext<MultiplayerContextType | undefined>(undefined)

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState<OnlinePlayer[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!user) return

    const socket = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('player:join', {
        userId: user.id,
        username: user.username,
        sceneKey: '',
      })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('player:list', (list: OnlinePlayer[]) => {
      setPlayers(list)
    })

    socket.on('player:joined', (player: OnlinePlayer) => {
      setPlayers(prev => [...prev.filter(p => p.socketId !== player.socketId), player])
    })

    socket.on('player:moved', (player: OnlinePlayer) => {
      setPlayers(prev => prev.map(p => p.socketId === player.socketId ? player : p))
    })

    socket.on('player:left', (data: { socketId: string }) => {
      setPlayers(prev => prev.filter(p => p.socketId !== data.socketId))
    })

    socket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-49), msg])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  const sendMove = useCallback((sceneKey: string, x?: number, y?: number) => {
    socketRef.current?.emit('player:move', { sceneKey, x, y })
  }, [])

  const sendChat = useCallback((message: string) => {
    if (message.trim()) {
      socketRef.current?.emit('chat:message', { message: message.trim() })
    }
  }, [])

  return (
    <MultiplayerContext.Provider
      value={{
        connected,
        players,
        chatMessages,
        sendMove,
        sendChat,
        playerCount: players.length + (connected ? 1 : 0),
      }}
    >
      {children}
    </MultiplayerContext.Provider>
  )
}

export const useMultiplayer = () => {
  const ctx = useContext(MultiplayerContext)
  if (!ctx) throw new Error('useMultiplayer must be used within MultiplayerProvider')
  return ctx
}
