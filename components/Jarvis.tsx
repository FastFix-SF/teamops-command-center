'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AgentAction {
  id: string
  type: 'thinking' | 'reading' | 'creating' | 'updating' | 'deleting' | 'searching' | 'analyzing' | 'success' | 'error'
  entity?: string
  description: string
  data?: unknown
  timestamp: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: AgentAction[]
  isStreaming?: boolean
}

interface VoiceState {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  isSpeaking: boolean
}

// Action type icons and colors
const ACTION_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  thinking: { icon: '🧠', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  reading: { icon: '📖', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  searching: { icon: '🔍', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  creating: { icon: '✨', color: 'text-green-400', bg: 'bg-green-500/20' },
  updating: { icon: '📝', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  deleting: { icon: '🗑️', color: 'text-red-400', bg: 'bg-red-500/20' },
  analyzing: { icon: '📊', color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  success: { icon: '✅', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  error: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/20' }
}

export default function Jarvis() {
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentActions, setCurrentActions] = useState<AgentAction[]>([])
  const [voice, setVoice] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    isSpeaking: false
  })
  const [showVoiceWave, setShowVoiceWave] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'es-ES'

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        setVoice(prev => ({
          ...prev,
          transcript: finalTranscript || interimTranscript
        }))

        if (finalTranscript) {
          handleVoiceCommand(finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setVoice(prev => ({ ...prev, isListening: false }))
        setShowVoiceWave(false)
      }

      recognitionRef.current.onend = () => {
        if (voice.isListening) {
          recognitionRef.current?.start()
        }
      }
    }

    return () => {
      recognitionRef.current?.stop()
      speechSynthesis?.cancel()
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentActions])

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const hour = new Date().getHours()
      const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

      setMessages([{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${greeting}. Soy **JARVIS**, tu asistente de TeamOps. Puedo:\n\n• **Crear, editar y eliminar** tareas, miembros, tiempo\n• **Consultar** información del sistema\n• **Analizar** rendimiento del equipo\n\nEscribe o usa el micrófono para comandos de voz.`,
        timestamp: new Date()
      }])
    }
  }, [isOpen, messages.length])

  // Handle voice command
  const handleVoiceCommand = useCallback(async (transcript: string) => {
    setVoice(prev => ({ ...prev, isListening: false, isProcessing: true }))
    setShowVoiceWave(false)
    recognitionRef.current?.stop()

    // Send command
    await sendCommand(transcript)

    setVoice(prev => ({ ...prev, isProcessing: false, transcript: '' }))
  }, [])

  // Toggle voice listening
  const toggleVoice = useCallback(() => {
    if (voice.isListening) {
      recognitionRef.current?.stop()
      setVoice(prev => ({ ...prev, isListening: false, transcript: '' }))
      setShowVoiceWave(false)
    } else {
      setVoice(prev => ({ ...prev, isListening: true, transcript: '' }))
      setShowVoiceWave(true)
      recognitionRef.current?.start()
    }
  }, [voice.isListening])

  // Speak response
  const speakResponse = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()

      // Clean markdown and get plain text
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/•/g, '')
        .replace(/\n/g, '. ')
        .substring(0, 500)

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'es-ES'
      utterance.rate = 1.1
      utterance.pitch = 1

      // Find Spanish voice
      const voices = speechSynthesis.getVoices()
      const spanishVoice = voices.find(v => v.lang.startsWith('es'))
      if (spanishVoice) utterance.voice = spanishVoice

      utterance.onstart = () => setVoice(prev => ({ ...prev, isSpeaking: true }))
      utterance.onend = () => setVoice(prev => ({ ...prev, isSpeaking: false }))

      synthRef.current = utterance
      speechSynthesis.speak(utterance)
    }
  }, [])

  // Send command to agent API
  const sendCommand = async (command: string) => {
    if (!command.trim() || isProcessing) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: command,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)
    setCurrentActions([])

    // Create streaming assistant message
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      actions: []
    }])

    try {
      const response = await fetch('/api/jarvis/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      })

      const data = await response.json()

      // Simulate streaming actions
      if (data.actions && data.actions.length > 0) {
        for (let i = 0; i < data.actions.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200))

          const actionsToShow = data.actions.slice(0, i + 1)
          setCurrentActions(actionsToShow)

          // Update the assistant message with current actions
          setMessages(prev => prev.map(m =>
            m.id === assistantId
              ? { ...m, actions: actionsToShow }
              : m
          ))
        }
      }

      // Final message update
      await new Promise(resolve => setTimeout(resolve, 200))
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: data.message, isStreaming: false, actions: data.actions }
          : m
      ))

      // Speak response if it was a voice command
      if (voice.transcript) {
        speakResponse(data.message)
      }

      setCurrentActions([])

    } catch (error) {
      console.error('JARVIS error:', error)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Error de conexión. Intenta de nuevo.', isStreaming: false }
          : m
      ))
    } finally {
      setIsProcessing(false)
    }
  }

  // Quick action buttons
  const quickActions = [
    { icon: '📊', label: 'Resumen', command: 'Dame un resumen del sistema' },
    { icon: '📋', label: 'Tareas', command: 'Mostrar todas las tareas' },
    { icon: '👥', label: 'Equipo', command: 'Mostrar miembros del equipo' },
    { icon: '⚠️', label: 'Alertas', command: 'Mostrar tareas vencidas' }
  ]

  // Closed state - floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 group z-50"
        aria-label="Abrir JARVIS"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse" />

          {/* Main button */}
          <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>

            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
          </div>

          {/* Online indicator */}
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-lg" />
        </div>
      </button>
    )
  }

  return (
    <div className={`fixed z-50 transition-all duration-500 ease-out ${
      isExpanded
        ? 'inset-4 md:inset-8'
        : 'bottom-8 right-8 w-[440px] max-h-[85vh]'
    }`}>
      <div
        className={`bg-[#0a0a1a] rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col h-full ${
          isExpanded ? '' : 'max-h-[85vh]'
        }`}
        style={{ boxShadow: '0 25px 100px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/20">
          <div className="flex items-center gap-4">
            {/* JARVIS Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              {voice.isSpeaking && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-[8px]">🔊</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-white text-lg tracking-tight">JARVIS</h3>
              <p className="text-xs text-white/50">
                {isProcessing ? 'Ejecutando...' : voice.isListening ? 'Escuchando...' : 'Agente TeamOps'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              {isExpanded ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              )}
            </button>

            {/* Close button */}
            <button
              onClick={() => { setIsOpen(false); setIsExpanded(false) }}
              className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => sendCommand(action.command)}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-all flex flex-col items-center gap-1.5 border border-white/5 hover:border-white/10"
              >
                <span className="text-lg">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${isExpanded ? 'max-h-none' : ''}`}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                {/* User message */}
                {msg.role === 'user' && (
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl rounded-br-md px-4 py-3">
                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                  </div>
                )}

                {/* Assistant message with actions */}
                {msg.role === 'assistant' && (
                  <div className="space-y-3">
                    {/* Actions stream */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="space-y-2 animate-fade-in">
                        {msg.actions.map((action, i) => {
                          const style = ACTION_STYLES[action.type] || ACTION_STYLES.thinking
                          return (
                            <div
                              key={action.id}
                              className={`flex items-center gap-3 px-3 py-2 rounded-xl ${style.bg} border border-white/5 animate-slide-in`}
                              style={{ animationDelay: `${i * 50}ms` }}
                            >
                              <span className="text-lg">{style.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${style.color}`}>{action.description}</p>
                                {action.entity && (
                                  <p className="text-xs text-white/30 mt-0.5">{action.entity}</p>
                                )}
                              </div>
                              {action.type !== 'success' && action.type !== 'error' && msg.isStreaming && i === msg.actions.length - 1 && (
                                <div className="flex gap-1">
                                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" />
                                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Response message */}
                    {msg.content && (
                      <div className="bg-white/5 backdrop-blur rounded-2xl rounded-bl-md px-4 py-3 border border-white/5">
                        <div className="text-[14px] leading-relaxed text-white/90 whitespace-pre-wrap">
                          {msg.content.split('**').map((part, i) =>
                            i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                          )}
                        </div>
                      </div>
                    )}

                    {/* Loading state */}
                    {msg.isStreaming && !msg.content && msg.actions?.length === 0 && (
                      <div className="flex items-center gap-2 px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-white/40 text-sm">Procesando...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Voice listening indicator */}
          {showVoiceWave && (
            <div className="flex items-center justify-center py-8 animate-fade-in">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                  <span className="text-4xl">🎤</span>
                </div>
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <div className="absolute inset-[-8px] rounded-full border-2 border-red-400/50 animate-pulse" />
                <div className="absolute inset-[-16px] rounded-full border border-red-300/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          )}

          {voice.transcript && (
            <div className="text-center animate-fade-in">
              <p className="text-white/60 text-sm italic">"{voice.transcript}"</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <form onSubmit={(e) => { e.preventDefault(); sendCommand(input) }} className="flex gap-3">
            {/* Voice button */}
            <button
              type="button"
              onClick={toggleVoice}
              disabled={isProcessing}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                voice.isListening
                  ? 'bg-gradient-to-br from-red-500 to-pink-500 scale-110 shadow-lg shadow-red-500/30'
                  : 'bg-white/10 hover:bg-white/15 hover:scale-105'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={voice.isListening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={voice.isListening ? 'Escuchando...' : 'Escribe un comando o pregunta...'}
                disabled={isProcessing || voice.isListening}
                className="w-full h-12 px-5 bg-white/10 rounded-2xl text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          {/* Keyboard hint */}
          <p className="text-center text-white/20 text-xs mt-3">
            Presiona Enter para enviar o usa el micrófono para voz
          </p>
        </div>
      </div>
    </div>
  )
}
