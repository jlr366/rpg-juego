import React, { useCallback, useEffect, useRef, useState } from 'react'

export type QuizResult = 'win' | 'loss'

export interface TechQuizEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

interface QuizQuestion {
  text: string
  options: string[]
  correct: string
  level: 1 | 2 | 3
}

const QUESTION_BANK: QuizQuestion[] = [
  // Nivel 1 — Servicios esenciales
  { text: '¿Qué servicio AWS ejecuta código sin administrar servidores?', options: ['Lambda', 'EC2', 'RDS', 'ECS'], correct: 'Lambda', level: 1 },
  { text: '¿Qué servicio de AWS almacena objetos a escala ilimitada?', options: ['S3', 'EBS', 'EFS', 'FSx'], correct: 'S3', level: 1 },
  { text: '¿Qué significa "EC2"?', options: ['Elastic Compute Cloud', 'Enterprise Cloud Computing', 'Extended Container Cloud', 'Edge Control Center'], correct: 'Elastic Compute Cloud', level: 1 },
  { text: '¿Cuál es la base de datos NoSQL totalmente gestionada de AWS?', options: ['DynamoDB', 'RDS', 'Aurora', 'Redshift'], correct: 'DynamoDB', level: 1 },
  { text: '¿Qué servicio gestiona identidades y permisos en AWS?', options: ['IAM', 'Cognito', 'SSO', 'STS'], correct: 'IAM', level: 1 },
  { text: '¿Qué servicio de base de datos relacional ofrece AWS?', options: ['RDS', 'DynamoDB', 'S3', 'ElastiCache'], correct: 'RDS', level: 1 },
  { text: '¿Qué modelo de nube gestiona la infraestructura el proveedor?', options: ['PaaS', 'IaaS', 'SaaS', 'FaaS'], correct: 'PaaS', level: 1 },
  { text: '¿Qué herramienta de línea de comandos se usa para interactuar con AWS?', options: ['AWS CLI', 'AWS SDK', 'AWS CDK', 'AWS SAM'], correct: 'AWS CLI', level: 1 },
  // Nivel 2 — Servicios intermedios
  { text: '¿Qué servicio distribuye contenido globalmente con baja latencia (CDN)?', options: ['CloudFront', 'CloudWatch', 'CloudTrail', 'Route 53'], correct: 'CloudFront', level: 2 },
  { text: '¿Qué servicio gestiona y expone APIs REST e HTTP?', options: ['API Gateway', 'App Runner', 'AppSync', 'ELB'], correct: 'API Gateway', level: 2 },
  { text: '¿Qué servicio de cola desacopla microservicios de forma asíncrona?', options: ['SQS', 'SNS', 'SES', 'MQ'], correct: 'SQS', level: 2 },
  { text: '¿Qué servicio orquesta contenedores con Kubernetes?', options: ['EKS', 'ECS', 'ECR', 'Fargate'], correct: 'EKS', level: 2 },
  { text: '¿Qué servicio ejecuta contenedores sin gestionar instancias EC2?', options: ['Fargate', 'ECS', 'EKS', 'Batch'], correct: 'Fargate', level: 2 },
  { text: '¿Qué servicio envía notificaciones y mensajes a múltiples suscriptores?', options: ['SNS', 'SQS', 'SES', 'EventBridge'], correct: 'SNS', level: 2 },
  { text: '¿Qué servicio enruta el tráfico DNS y permite failover?', options: ['Route 53', 'CloudFront', 'ALB', 'Global Accelerator'], correct: 'Route 53', level: 2 },
  { text: '¿Qué servicio de caché en memoria reduce la carga en bases de datos?', options: ['ElastiCache', 'DAX', 'RDS', 'DynamoDB'], correct: 'ElastiCache', level: 2 },
  { text: '¿Qué componente balancea el tráfico entre instancias EC2?', options: ['ELB', 'NAT Gateway', 'Internet Gateway', 'Route 53'], correct: 'ELB', level: 2 },
  // Nivel 3 — Avanzado
  { text: '¿Qué servicio de AWS da acceso a modelos de IA generativa fundacionales?', options: ['Bedrock', 'SageMaker', 'Rekognition', 'Comprehend'], correct: 'Bedrock', level: 3 },
  { text: '¿Cuántas zonas de disponibilidad mínimas requiere una región AWS?', options: ['3', '1', '2', '4'], correct: '3', level: 3 },
  { text: '¿Qué servicio recoge métricas, logs y alarmas de recursos AWS?', options: ['CloudWatch', 'CloudTrail', 'Config', 'Inspector'], correct: 'CloudWatch', level: 3 },
  { text: '¿Qué servicio permite Infraestructura como Código (IaC) en AWS?', options: ['CloudFormation', 'CodePipeline', 'CodeBuild', 'CodeCommit'], correct: 'CloudFormation', level: 3 },
  { text: '¿Qué servicio procesa streams de datos en tiempo real?', options: ['Kinesis', 'Glue', 'EMR', 'Athena'], correct: 'Kinesis', level: 3 },
  { text: '¿Qué servicio audita y registra todas las llamadas a la API de AWS?', options: ['CloudTrail', 'CloudWatch', 'Config', 'GuardDuty'], correct: 'CloudTrail', level: 3 },
  { text: '¿Qué herramienta detecta amenazas con ML en cuentas AWS?', options: ['GuardDuty', 'Inspector', 'Macie', 'Shield'], correct: 'GuardDuty', level: 3 },
  { text: '¿Qué servicio ejecuta queries SQL sobre datos en S3 sin servidor?', options: ['Athena', 'Redshift', 'Glue', 'EMR'], correct: 'Athena', level: 3 },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

interface ActiveQuestion {
  q: QuizQuestion
  opts: string[]
}

const WIN_SCORE = 100

export function TechQuizGame({
  event,
  onFinish,
}: {
  event: TechQuizEventConfig
  onFinish: (result: QuizResult) => void
}) {
  const onFinishRef = useRef(onFinish)
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  const [score, setScore]     = useState(0)
  const [lives, setLives]     = useState(3)
  const [level, setLevel]     = useState<1|2|3>(1)
  const [timeLeft, setTimeLeft] = useState(100)
  const [message, setMessage] = useState('')
  const [msgOk, setMsgOk]     = useState(true)
  const [started, setStarted] = useState(false)
  const [over, setOver]       = useState(false)
  const [won, setWon]         = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [active, setActive]   = useState<ActiveQuestion | null>(null)

  const scoreRef  = useRef(0)
  const livesRef  = useRef(3)
  const levelRef  = useRef<1|2|3>(1)
  const timerRef  = useRef<number | null>(null)

  const timerDuration = level === 1 ? 8000 : level === 2 ? 6000 : 4000
  const timerStep = 100 / (timerDuration / 100)

  const pickQuestion = useCallback(() => {
    const pool = shuffle(QUESTION_BANK.filter(q => q.level <= levelRef.current))
    const q = pool[0]
    setActive({ q, opts: shuffle(q.options) })
    setTimeLeft(100)
    setMessage('')
  }, [])

  const endTurn = useCallback((correct: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (correct) {
      scoreRef.current += 10
      setScore(scoreRef.current)
      if (scoreRef.current >= 80 && levelRef.current < 3) { levelRef.current = 3; setLevel(3) }
      else if (scoreRef.current >= 40 && levelRef.current < 2) { levelRef.current = 2; setLevel(2) }
      setMsgOk(true)
      setMessage('¡Correcto! ⚡')
    } else {
      livesRef.current -= 1
      setLives(livesRef.current)
      setMsgOk(false)
      setMessage('Incorrecto ❌')
    }
    setBlocked(true)
    setTimeout(() => {
      setBlocked(false)
      const didWin = scoreRef.current >= WIN_SCORE
      const didLose = livesRef.current <= 0
      if (didWin)  { setOver(true); setWon(true);  onFinishRef.current('win') }
      else if (didLose) { setOver(true); setWon(false); onFinishRef.current('loss') }
      else pickQuestion()
    }, correct ? 600 : 1300)
  }, [pickQuestion])

  // Timer countdown
  useEffect(() => {
    if (!started || over || blocked || !active) return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - timerStep
        if (next <= 0) { clearInterval(timerRef.current!); endTurn(false); return 0 }
        return next
      })
    }, 100)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [active, started, over, blocked]) // eslint-disable-line

  const handleStart = () => {
    scoreRef.current = 0; livesRef.current = 3; levelRef.current = 1
    setScore(0); setLives(3); setLevel(1); setOver(false); setWon(false)
    setBlocked(false); setStarted(true)
    pickQuestion()
  }

  const timerColor = timeLeft > 50 ? '#22d3ee' : timeLeft > 25 ? '#fbbf24' : '#f87171'

  return (
    <div className="aspect-video w-full bg-[#060c1a] p-3 font-mono text-white">
      <div className="flex h-full flex-col rounded border-2 border-cyan-600/40 bg-[#0a1428] p-3 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]">

        {/* Header */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1 text-[11px] font-black uppercase tracking-wide">
          <span className="text-cyan-300">⚡ AWS QUIZ</span>
          <span className="text-violet-300">Nivel {level}</span>
          <span className="text-emerald-400">Pts {score}/{WIN_SCORE}</span>
          <span className="text-rose-400">{'❤️'.repeat(Math.max(0, lives)) || '💀'}</span>
        </div>

        {/* Timer */}
        <div className="mb-2 h-2 overflow-hidden rounded bg-slate-800/80">
          <div
            className="h-full transition-all duration-100"
            style={{ width: `${timeLeft}%`, backgroundColor: timerColor, boxShadow: `0 0 6px ${timerColor}` }}
          />
        </div>

        {/* Question */}
        <div className="mb-3 flex min-h-[2.8rem] items-center justify-center rounded border border-cyan-800/30 bg-[#0e1c38] px-3 py-2 text-center text-[12px] font-bold leading-snug text-cyan-100">
          {over
            ? won
              ? '🏆 ¡Eres un experto en AWS Cloud!'
              : '💀 Sin conexión — Vidas agotadas'
            : started && active
              ? active.q.text
              : (event.prompt || '¿Cuánto sabes de AWS? Demuéstralo con preguntas de servicios cloud.')}
        </div>

        {/* Options */}
        <div className="mb-2 grid flex-1 grid-cols-2 gap-1.5">
          {started && active && !over
            ? active.opts.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !blocked && endTurn(opt === active.q.correct)}
                  disabled={blocked}
                  className="flex items-center justify-center rounded border border-cyan-700/30 bg-[#111d3a] px-2 py-1.5 text-[11px] font-bold text-cyan-100 transition-all hover:border-cyan-400/60 hover:bg-[#1a2e55] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {opt}
                </button>
              ))
            : Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="rounded border border-cyan-900/20 bg-[#0c1530]/60 flex items-center justify-center text-[10px] text-cyan-800">
                  {['A', 'B', 'C', 'D'][i]}
                </div>
              ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold min-h-4" style={{ color: msgOk ? '#34d399' : '#f87171' }}>
            {message}
          </div>
          {(!started || over) && (
            <button
              onClick={handleStart}
              className="rounded border border-cyan-400/40 bg-gradient-to-b from-cyan-600 to-cyan-900 px-3 py-1 text-[11px] font-black uppercase text-white shadow hover:brightness-110"
            >
              {over ? 'Reintentar' : 'Iniciar Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
