import { useCallback, useEffect, useRef, useState } from 'react'

const reconnectDelays = [1000, 2000, 4000, 8000]

function socketUrl(lobbyCode) {
  const configured = import.meta.env.VITE_WS_URL
  if (configured) return `${configured.replace(/\/$/, '')}/ws/lobbies/${encodeURIComponent(lobbyCode)}`
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const localDevServer = window.location.port === '5173'
  const authority = localDevServer ? 'localhost:8000' : window.location.host
  return `${protocol}//${authority}/ws/lobbies/${encodeURIComponent(lobbyCode)}`
}

/** Keeps one authenticated lobby connection alive for the mounted screen. */
export function useLobbySocket({ lobbyCode, memberToken, onLobbyExpired }) {
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const heartbeatRef = useRef(null)
  const retryRef = useRef(0)
  const shouldReconnectRef = useRef(true)
  const [connection, setConnection] = useState('connecting')
  const [lobby, setLobby] = useState(null)
  const [error, setError] = useState('')

  const clearTimers = useCallback(() => {
    window.clearTimeout(reconnectTimerRef.current)
    window.clearInterval(heartbeatRef.current)
  }, [])

  const send = useCallback((type, payload = {}) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError('You are disconnected. Reconnect before trying that action.')
      return false
    }
    socketRef.current.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  useEffect(() => {
    if (!lobbyCode || !memberToken) return undefined
    shouldReconnectRef.current = true
    let activeSocket = null

    const connect = () => {
      clearTimers()
      setConnection('connecting')
      const socket = new WebSocket(socketUrl(lobbyCode))
      activeSocket = socket
      socketRef.current = socket
      socket.onopen = () => {
        if (socket !== socketRef.current) return
        retryRef.current = 0
        socket.send(JSON.stringify({ type: 'authenticate', payload: { member_token: memberToken } }))
        heartbeatRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping', payload: {} }))
        }, 25000)
      }
      socket.onmessage = (event) => {
        let message
        try { message = JSON.parse(event.data) } catch { setError('Received an invalid message from the server.'); return }
        if (message.type === 'lobby_state') { setLobby(message.payload); setError(''); setConnection('connected') }
        else if (message.type === 'error') {
          setError(message.payload?.message || 'That action could not be completed.')
          if (message.payload?.code === 'LOBBY_NOT_FOUND' || message.payload?.code === 'INVALID_TOKEN') { shouldReconnectRef.current = false; onLobbyExpired?.() }
        }
      }
      socket.onerror = () => setError('Connection interrupted. Trying to reconnect…')
      socket.onclose = (event) => {
        if (socket !== socketRef.current) return
        window.clearInterval(heartbeatRef.current)
        if (event.code === 4404 || event.code === 4401) { shouldReconnectRef.current = false; onLobbyExpired?.(); return }
        if (!shouldReconnectRef.current) return
        setConnection('reconnecting')
        const delay = reconnectDelays[Math.min(retryRef.current, reconnectDelays.length - 1)]
        retryRef.current += 1
        reconnectTimerRef.current = window.setTimeout(connect, delay)
      }
    }
    connect()
    return () => {
      shouldReconnectRef.current = false
      clearTimers()
      if (activeSocket?.readyState === WebSocket.OPEN || activeSocket?.readyState === WebSocket.CONNECTING) activeSocket.close()
    }
  }, [clearTimers, lobbyCode, memberToken, onLobbyExpired])
  const clearError = useCallback(() => setError(''), [])
  return { lobby, connection, error, clearError, send }
}
