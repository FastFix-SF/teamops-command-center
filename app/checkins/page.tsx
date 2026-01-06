'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Checkin {
  id: string
  type: string
  transcription: string
  aiSummary: string
  aiReport: string
  extractedProgress: number
  extractedBlockers: string | null
  extractedNextSteps: string | null
  sentiment: string
  confidence: number
  createdAt: string
  member: { name: string; avatarUrl: string | null }
  task: { title: string } | null
  attachments: Array<{ id: string; type: string; url: string; aiAnalysis: string }>
}

interface Task {
  id: string
  title: string
  status: string
}

interface Member {
  id: string
  name: string
}

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCheckin, setSelectedCheckin] = useState<Checkin | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedTask, setSelectedTask] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [processing, setProcessing] = useState(false)
  const [textCheckin, setTextCheckin] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [checkinsRes, tasksRes, membersRes] = await Promise.all([
        fetch('/api/checkins'),
        fetch('/api/tasks'),
        fetch('/api/members')
      ])

      if (checkinsRes.ok) setCheckins(await checkinsRes.json())
      if (tasksRes.ok) setTasks((await tasksRes.json()).filter((t: Task) => t.status !== 'DONE'))
      if (membersRes.ok) setMembers(await membersRes.json())
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startRecording = useCallback(async (type: 'voice' | 'video') => {
    try {
      const constraints: MediaStreamConstraints = type === 'video'
        ? { audio: true, video: { facingMode: 'user', width: 640, height: 480 } }
        : { audio: true }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: type === 'video' ? 'video/webm;codecs=vp9,opus' : 'audio/webm;codecs=opus'
      })

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingType(type)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('No se pudo acceder al micrófono/cámara')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return null

    return new Promise<Blob>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recordingType === 'video' ? 'video/webm' : 'audio/webm'
        })
        resolve(blob)
      }
      mediaRecorderRef.current!.stop()

      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsRecording(false)
      setRecordingType(null)
    })
  }, [recordingType])

  const handleStopAndProcess = async () => {
    const blob = await stopRecording()
    if (!blob) return

    setProcessing(true)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('type', recordingType === 'video' ? 'VIDEO' : 'VOICE')
      if (selectedMember) formData.append('memberId', selectedMember)
      if (selectedTask) formData.append('taskId', selectedTask)

      const response = await fetch('/api/checkins', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        loadData()
        alert(`Check-in procesado! Progreso: ${data.checkin.progress}%`)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error processing:', error)
      alert('Error procesando la grabación')
    } finally {
      setProcessing(false)
    }
  }

  const handleTextCheckin = async () => {
    if (!textCheckin.trim()) return

    setProcessing(true)

    try {
      const formData = new FormData()
      formData.append('text', textCheckin)
      formData.append('type', 'TEXT')
      if (selectedMember) formData.append('memberId', selectedMember)
      if (selectedTask) formData.append('taskId', selectedTask)

      const response = await fetch('/api/checkins', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setTextCheckin('')
        loadData()
        alert(`Check-in procesado! Progreso: ${data.checkin.progress}%`)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error procesando el check-in')
    } finally {
      setProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSentimentEmoji = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return '😊'
      case 'NEGATIVE': return '😟'
      default: return '😐'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Check-ins con IA</h1>
        <p className="text-gray-500">Reportes de voz/video procesados automáticamente por JARVIS</p>
      </div>

      {/* New Check-in Panel */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">📹 Nuevo Check-in</h2>

        {isRecording ? (
          <div className="bg-black/30 rounded-xl p-6 text-center">
            {recordingType === 'video' && (
              <video
                ref={videoRef}
                className="w-48 h-36 rounded-lg mx-auto mb-4 object-cover"
                muted
                playsInline
              />
            )}
            <div className="w-20 h-20 rounded-full bg-red-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-2xl">{recordingType === 'video' ? '🎥' : '🎤'}</span>
              </div>
            </div>
            <div className="text-3xl font-mono mb-4">{formatTime(recordingTime)}</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleStopAndProcess}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-medium transition-colors"
              >
                ✓ Terminar y Procesar
              </button>
              <button
                onClick={() => {
                  stopRecording()
                  setRecordingType(null)
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                ✕ Cancelar
              </button>
            </div>
          </div>
        ) : processing ? (
          <div className="bg-black/30 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
            <p className="text-lg">JARVIS está procesando tu check-in...</p>
            <p className="text-sm opacity-70 mt-2">Transcribiendo y generando reporte</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selection */}
            <div className="grid grid-cols-2 gap-4">
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50"
              >
                <option value="" className="text-gray-900">Seleccionar empleado...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="text-gray-900">{m.name}</option>
                ))}
              </select>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50"
              >
                <option value="" className="text-gray-900">Seleccionar tarea...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id} className="text-gray-900">{t.title}</option>
                ))}
              </select>
            </div>

            {/* Recording Buttons */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => startRecording('voice')}
                className="py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors flex flex-col items-center gap-2"
              >
                <span className="text-3xl">🎤</span>
                <span>Check-in de Voz</span>
              </button>
              <button
                onClick={() => startRecording('video')}
                className="py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors flex flex-col items-center gap-2"
              >
                <span className="text-3xl">🎥</span>
                <span>Check-in de Video</span>
              </button>
              <button
                onClick={() => document.getElementById('textInput')?.focus()}
                className="py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-colors flex flex-col items-center gap-2"
              >
                <span className="text-3xl">⌨️</span>
                <span>Check-in de Texto</span>
              </button>
            </div>

            {/* Text Check-in */}
            <div className="flex gap-2">
              <textarea
                id="textInput"
                value={textCheckin}
                onChange={(e) => setTextCheckin(e.target.value)}
                placeholder="O escribe tu actualización aquí..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 resize-none"
                rows={2}
              />
              <button
                onClick={handleTextCheckin}
                disabled={!textCheckin.trim()}
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-medium disabled:opacity-50 hover:bg-white/90 transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Check-ins History */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Historial de Check-ins</h2>

        {checkins.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-gray-500">No hay check-ins registrados aún</p>
            <p className="text-gray-400 text-sm mt-1">Usa los botones de arriba para crear el primero</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {checkins.map((checkin) => (
              <div
                key={checkin.id}
                onClick={() => setSelectedCheckin(checkin)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl">
                      {checkin.type === 'VIDEO' ? '🎥' : checkin.type === 'VOICE' ? '🎤' : '⌨️'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{checkin.member.name}</div>
                      <div className="text-sm text-gray-500">
                        {checkin.task?.title || 'Actualización general'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {new Date(checkin.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="text-lg">{getSentimentEmoji(checkin.sentiment)}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {checkin.extractedProgress}%
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-gray-600 line-clamp-2">{checkin.aiSummary}</p>

                {checkin.extractedBlockers && (
                  <div className="mt-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                    🚫 {checkin.extractedBlockers}
                  </div>
                )}

                {checkin.attachments.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {checkin.attachments.map((att) => (
                      <div key={att.id} className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                        📷
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCheckin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                  {selectedCheckin.type === 'VIDEO' ? '🎥' : selectedCheckin.type === 'VOICE' ? '🎤' : '⌨️'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCheckin.member.name}</h3>
                  <p className="text-sm text-gray-500">{selectedCheckin.task?.title || 'Actualización general'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCheckin(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{selectedCheckin.extractedProgress}%</div>
                  <div className="text-sm text-gray-500">Progreso</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-3xl">{getSentimentEmoji(selectedCheckin.sentiment)}</div>
                  <div className="text-sm text-gray-500">Sentimiento</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{Math.round(selectedCheckin.confidence * 100)}%</div>
                  <div className="text-sm text-gray-500">Confianza IA</div>
                </div>
              </div>

              {/* Transcription */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📝 Transcripción</h4>
                <p className="bg-gray-50 p-4 rounded-lg text-gray-600 italic">"{selectedCheckin.transcription}"</p>
              </div>

              {/* AI Summary */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🤖 Resumen IA</h4>
                <p className="text-gray-700">{selectedCheckin.aiSummary}</p>
              </div>

              {/* AI Report */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">📋 Reporte Completo</h4>
                <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg">
                  {selectedCheckin.aiReport.split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('##') ? 'font-bold text-gray-800 mt-4' : 'text-gray-600'}>
                      {line.replace('##', '').trim()}
                    </p>
                  ))}
                </div>
              </div>

              {/* Blockers */}
              {selectedCheckin.extractedBlockers && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-semibold text-red-700 mb-2">🚫 Bloqueos Detectados</h4>
                  <p className="text-red-600">{selectedCheckin.extractedBlockers}</p>
                </div>
              )}

              {/* Next Steps */}
              {selectedCheckin.extractedNextSteps && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-semibold text-green-700 mb-2">➡️ Próximos Pasos</h4>
                  <p className="text-green-600">{selectedCheckin.extractedNextSteps}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedCheckin.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">📎 Adjuntos ({selectedCheckin.attachments.length})</h4>
                  <div className="space-y-2">
                    {selectedCheckin.attachments.map((att) => (
                      <div key={att.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span>📷</span>
                          <span className="text-sm text-gray-500">{att.type}</span>
                        </div>
                        <p className="text-sm text-gray-600">{att.aiAnalysis}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
