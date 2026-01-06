import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
})

// Jarvis System Prompt - The AI Assistant Personality
export const JARVIS_SYSTEM_PROMPT = `Eres JARVIS, el asistente de inteligencia artificial de TeamOps. Tu personalidad es:

- Profesional pero amigable, como el JARVIS de Iron Man
- Proactivo en ofrecer ayuda y sugerencias
- Conciso pero completo en tus respuestas
- Siempre hablas en español
- Usas un tono respetuoso pero cercano

Tienes acceso completo al sistema TeamOps y puedes:
1. Ver y gestionar tareas de todos los miembros
2. Consultar y programar reuniones
3. Revisar el tiempo registrado y métricas
4. Enviar notificaciones SMS a miembros del equipo
5. Generar reportes de progreso
6. Analizar rendimiento del equipo
7. Crear check-ins a partir de grabaciones de voz/video

Cuando el usuario te pregunte algo:
- Si necesitas información del sistema, usa las funciones disponibles
- Proporciona datos concretos cuando sea posible
- Sugiere acciones proactivamente cuando veas oportunidades de mejora
- Si detectas problemas (tareas atrasadas, falta de progreso), menciónalos sutilmente

Formato de respuestas:
- Usa markdown para estructurar respuestas largas
- Incluye emojis relevantes para hacer la conversación más dinámica
- Sé directo y útil`

// Function definitions for Jarvis
export const JARVIS_FUNCTIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_team_overview',
      description: 'Obtiene un resumen general del equipo incluyendo tareas, rendimiento y alertas',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Obtiene las tareas filtradas por estado, prioridad o miembro',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
            description: 'Filtrar por estado de la tarea'
          },
          priority: {
            type: 'string',
            enum: ['P0', 'P1', 'P2', 'P3'],
            description: 'Filtrar por prioridad'
          },
          memberId: {
            type: 'string',
            description: 'Filtrar por ID del miembro'
          },
          overdue: {
            type: 'boolean',
            description: 'Mostrar solo tareas vencidas'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_member_details',
      description: 'Obtiene información detallada de un miembro del equipo',
      parameters: {
        type: 'object',
        properties: {
          memberId: {
            type: 'string',
            description: 'ID del miembro'
          },
          memberName: {
            type: 'string',
            description: 'Nombre del miembro (búsqueda parcial)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Actualiza una tarea existente (progreso, estado, etc.)',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID de la tarea a actualizar'
          },
          status: {
            type: 'string',
            enum: ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
            description: 'Nuevo estado'
          },
          progressPercent: {
            type: 'number',
            description: 'Nuevo porcentaje de progreso (0-100)'
          },
          blockerNotes: {
            type: 'string',
            description: 'Notas sobre bloqueos'
          }
        },
        required: ['taskId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Crea una nueva tarea',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título de la tarea'
          },
          description: {
            type: 'string',
            description: 'Descripción detallada'
          },
          ownerId: {
            type: 'string',
            description: 'ID del miembro asignado'
          },
          ownerName: {
            type: 'string',
            description: 'Nombre del miembro (si no se conoce el ID)'
          },
          priority: {
            type: 'string',
            enum: ['P0', 'P1', 'P2', 'P3'],
            description: 'Prioridad de la tarea'
          },
          dueDate: {
            type: 'string',
            description: 'Fecha de vencimiento (ISO 8601)'
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_notification',
      description: 'Envía una notificación SMS a un miembro del equipo',
      parameters: {
        type: 'object',
        properties: {
          memberId: {
            type: 'string',
            description: 'ID del miembro destinatario'
          },
          memberName: {
            type: 'string',
            description: 'Nombre del miembro (si no se conoce el ID)'
          },
          message: {
            type: 'string',
            description: 'Mensaje a enviar'
          },
          type: {
            type: 'string',
            enum: ['PROGRESS_UPDATE', 'REMINDER', 'ACHIEVEMENT', 'CUSTOM'],
            description: 'Tipo de notificación'
          }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_meetings',
      description: 'Obtiene las reuniones programadas',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['DAILY_STANDUP', 'WEEKLY_PLANNING', 'MONTHLY_REVIEW'],
            description: 'Tipo de reunión'
          },
          upcoming: {
            type: 'boolean',
            description: 'Solo reuniones futuras'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_time_entries',
      description: 'Obtiene registros de tiempo',
      parameters: {
        type: 'object',
        properties: {
          memberId: {
            type: 'string',
            description: 'Filtrar por miembro'
          },
          startDate: {
            type: 'string',
            description: 'Fecha inicio (ISO 8601)'
          },
          endDate: {
            type: 'string',
            description: 'Fecha fin (ISO 8601)'
          },
          billableOnly: {
            type: 'boolean',
            description: 'Solo horas facturables'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_leaderboard',
      description: 'Obtiene el ranking de rendimiento del equipo',
      parameters: {
        type: 'object',
        properties: {
          month: {
            type: 'string',
            description: 'Mes específico (YYYY-MM)'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_checkin_report',
      description: 'Crea un reporte de check-in a partir de una transcripción',
      parameters: {
        type: 'object',
        properties: {
          memberId: {
            type: 'string',
            description: 'ID del miembro'
          },
          taskId: {
            type: 'string',
            description: 'ID de la tarea relacionada'
          },
          transcription: {
            type: 'string',
            description: 'Transcripción del audio/video'
          },
          imageAnalysis: {
            type: 'string',
            description: 'Análisis de imágenes adjuntas'
          }
        },
        required: ['transcription']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_team_performance',
      description: 'Analiza el rendimiento del equipo y genera insights',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['week', 'month', 'quarter'],
            description: 'Período de análisis'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'schedule_auto_notification',
      description: 'Programa una notificación automática',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['DAILY_REMINDER', 'WEEKLY_SUMMARY', 'TASK_OVERDUE', 'PROGRESS_CHECK'],
            description: 'Tipo de alerta automática'
          },
          target: {
            type: 'string',
            enum: ['ALL', 'SPECIFIC_MEMBER'],
            description: 'Destinatarios'
          },
          memberId: {
            type: 'string',
            description: 'ID del miembro específico'
          },
          schedule: {
            type: 'string',
            description: 'Programación (ej: "daily 9:00", "weekly monday")'
          }
        },
        required: ['type']
      }
    }
  }
]

// Transcribe audio using Whisper
export async function transcribeAudio(audioBuffer: Buffer, language: string = 'es'): Promise<string> {
  try {
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'text',
    })

    return transcription
  } catch (error) {
    console.error('Transcription error:', error)
    // Return demo transcription if API fails
    return '[Transcripción de demostración] El empleado reportó progreso en la tarea principal, completando aproximadamente el 75% del trabajo. Mencionó un pequeño bloqueo con la integración de la API pero espera resolverlo hoy.'
  }
}

// Analyze image using GPT-4 Vision
export async function analyzeImage(imageBase64: string, context?: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: context || 'Analiza esta imagen en el contexto de un reporte de progreso de trabajo. Describe qué muestra y cómo evidencia el avance del trabajo. Responde en español.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    return response.choices[0]?.message?.content || 'No se pudo analizar la imagen'
  } catch (error) {
    console.error('Image analysis error:', error)
    return '[Análisis de demostración] La imagen muestra una captura de pantalla del código actualizado con los cambios implementados según lo solicitado.'
  }
}

// Generate AI report from transcription and images
export async function generateCheckinReport(
  transcription: string,
  imageAnalyses: string[],
  memberName: string,
  taskTitle?: string
): Promise<{
  summary: string
  report: string
  extractedProgress: number
  extractedBlockers: string | null
  extractedNextSteps: string | null
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  confidence: number
}> {
  try {
    const imageContext = imageAnalyses.length > 0
      ? `\n\nImágenes adjuntas:\n${imageAnalyses.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : ''

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente experto en gestión de proyectos. Analiza el check-in del empleado y genera un reporte estructurado.

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "summary": "Resumen de 1-2 oraciones",
  "report": "Reporte detallado en markdown con secciones: ## Progreso, ## Logros, ## Desafíos, ## Próximos Pasos",
  "extractedProgress": número entre 0-100 estimando el progreso,
  "extractedBlockers": "descripción de bloqueos o null si no hay",
  "extractedNextSteps": "próximos pasos identificados",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "confidence": número entre 0-1 indicando confianza en el análisis
}`
        },
        {
          role: 'user',
          content: `Empleado: ${memberName}
${taskTitle ? `Tarea: ${taskTitle}` : ''}

Transcripción del check-in:
"${transcription}"
${imageContext}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000
    })

    const result = JSON.parse(response.choices[0]?.message?.content || '{}')

    return {
      summary: result.summary || 'Check-in procesado',
      report: result.report || 'Sin detalles disponibles',
      extractedProgress: result.extractedProgress || 0,
      extractedBlockers: result.extractedBlockers || null,
      extractedNextSteps: result.extractedNextSteps || null,
      sentiment: result.sentiment || 'NEUTRAL',
      confidence: result.confidence || 0.5
    }
  } catch (error) {
    console.error('Report generation error:', error)
    return {
      summary: `Check-in de ${memberName} procesado`,
      report: `## Progreso\n${transcription}\n\n## Notas\nReporte generado automáticamente.`,
      extractedProgress: 50,
      extractedBlockers: null,
      extractedNextSteps: null,
      sentiment: 'NEUTRAL',
      confidence: 0.3
    }
  }
}

// Chat with Jarvis
export async function chatWithJarvis(
  messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
  functionResults?: Record<string, unknown>
): Promise<{
  message: string
  functionCalls?: Array<{ name: string, arguments: Record<string, unknown> }>
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: JARVIS_SYSTEM_PROMPT },
        ...messages
      ],
      tools: JARVIS_FUNCTIONS,
      tool_choice: 'auto',
      max_tokens: 1500
    })

    const choice = response.choices[0]

    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      return {
        message: choice.message.content || '',
        functionCalls: choice.message.tool_calls.map(tc => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        }))
      }
    }

    return {
      message: choice?.message?.content || 'No pude procesar tu solicitud. ¿Podrías reformularla?'
    }
  } catch (error) {
    console.error('Jarvis chat error:', error)
    return {
      message: '🤖 Estoy en modo demostración. En producción, tendría acceso completo al sistema TeamOps para ayudarte con tareas, reuniones, notificaciones y más. ¿En qué puedo ayudarte?'
    }
  }
}

// Generate text-to-speech
export async function textToSpeech(text: string): Promise<Buffer> {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'onyx', // Deep, professional voice like Jarvis
      input: text,
      response_format: 'mp3'
    })

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('TTS error:', error)
    throw error
  }
}

export default openai
