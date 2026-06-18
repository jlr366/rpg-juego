import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type QuizResult = 'win' | 'loss'

export interface TechQuizEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  rewardItemName?: string
  rewardItemType?: string
  rewardItemSlot?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
  questionIds?: string[]
}

export interface QuizQuestion {
  id: string
  text: string
  options: string[]
  correct: string
  level: 1 | 2 | 3
}

export const QUESTION_BANK: QuizQuestion[] = [
  // Nivel 1 — Servicios esenciales
  { id: 'l1-01', text: '¿Qué servicio AWS ejecuta código sin administrar servidores?', options: ['Lambda', 'EC2', 'RDS', 'ECS'], correct: 'Lambda', level: 1 },
  { id: 'l1-02', text: '¿Qué servicio de AWS almacena objetos a escala ilimitada?', options: ['S3', 'EBS', 'EFS', 'FSx'], correct: 'S3', level: 1 },
  { id: 'l1-03', text: '¿Qué significa "EC2"?', options: ['Elastic Compute Cloud', 'Enterprise Cloud Computing', 'Extended Container Cloud', 'Edge Control Center'], correct: 'Elastic Compute Cloud', level: 1 },
  { id: 'l1-04', text: '¿Cuál es la base de datos NoSQL totalmente gestionada de AWS?', options: ['DynamoDB', 'RDS', 'Aurora', 'Redshift'], correct: 'DynamoDB', level: 1 },
  { id: 'l1-05', text: '¿Qué servicio gestiona identidades y permisos en AWS?', options: ['IAM', 'Cognito', 'SSO', 'STS'], correct: 'IAM', level: 1 },
  { id: 'l1-06', text: '¿Qué servicio de base de datos relacional ofrece AWS?', options: ['RDS', 'DynamoDB', 'S3', 'ElastiCache'], correct: 'RDS', level: 1 },
  { id: 'l1-07', text: '¿Qué modelo de nube gestiona la infraestructura el proveedor?', options: ['PaaS', 'IaaS', 'SaaS', 'FaaS'], correct: 'PaaS', level: 1 },
  { id: 'l1-08', text: '¿Qué herramienta de línea de comandos se usa para interactuar con AWS?', options: ['AWS CLI', 'AWS SDK', 'AWS CDK', 'AWS SAM'], correct: 'AWS CLI', level: 1 },
  { id: 'l1-09', text: '¿Qué servicio envía correos transaccionales y masivos?', options: ['SES', 'SQS', 'SNS', 'WorkMail'], correct: 'SES', level: 1 },
  { id: 'l1-10', text: '¿Cómo se llama la consola web de administración de AWS?', options: ['AWS Management Console', 'AWS Portal', 'AWS Dashboard', 'AWS Hub'], correct: 'AWS Management Console', level: 1 },
  { id: 'l1-11', text: '¿Qué servicio permite crear redes virtuales aisladas?', options: ['VPC', 'Subnet', 'IGW', 'NAT'], correct: 'VPC', level: 1 },
  { id: 'l1-12', text: '¿Qué servicio de AWS gestiona contenedores Docker de forma simple?', options: ['ECS', 'EKS', 'Lambda', 'Batch'], correct: 'ECS', level: 1 },
  { id: 'l1-13', text: '¿Qué unidad de almacenamiento usa S3 para guardar datos?', options: ['Objeto', 'Bloque', 'Archivo', 'Sector'], correct: 'Objeto', level: 1 },
  { id: 'l1-14', text: '¿Qué servicio ofrece DNS administrado en AWS?', options: ['Route 53', 'CloudFront', 'VPC', 'Direct Connect'], correct: 'Route 53', level: 1 },
  // Nivel 2 — Servicios intermedios
  { id: 'l2-01', text: '¿Qué servicio distribuye contenido globalmente con baja latencia (CDN)?', options: ['CloudFront', 'CloudWatch', 'CloudTrail', 'Route 53'], correct: 'CloudFront', level: 2 },
  { id: 'l2-02', text: '¿Qué servicio gestiona y expone APIs REST e HTTP?', options: ['API Gateway', 'App Runner', 'AppSync', 'ELB'], correct: 'API Gateway', level: 2 },
  { id: 'l2-03', text: '¿Qué servicio de cola desacopla microservicios de forma asíncrona?', options: ['SQS', 'SNS', 'SES', 'MQ'], correct: 'SQS', level: 2 },
  { id: 'l2-04', text: '¿Qué servicio orquesta contenedores con Kubernetes?', options: ['EKS', 'ECS', 'ECR', 'Fargate'], correct: 'EKS', level: 2 },
  { id: 'l2-05', text: '¿Qué servicio ejecuta contenedores sin gestionar instancias EC2?', options: ['Fargate', 'ECS', 'EKS', 'Batch'], correct: 'Fargate', level: 2 },
  { id: 'l2-06', text: '¿Qué servicio envía notificaciones y mensajes a múltiples suscriptores?', options: ['SNS', 'SQS', 'SES', 'EventBridge'], correct: 'SNS', level: 2 },
  { id: 'l2-07', text: '¿Qué servicio enruta el tráfico DNS y permite failover?', options: ['Route 53', 'CloudFront', 'ALB', 'Global Accelerator'], correct: 'Route 53', level: 2 },
  { id: 'l2-08', text: '¿Qué servicio de caché en memoria reduce la carga en bases de datos?', options: ['ElastiCache', 'DAX', 'RDS', 'DynamoDB'], correct: 'ElastiCache', level: 2 },
  { id: 'l2-09', text: '¿Qué componente balancea el tráfico entre instancias EC2?', options: ['ELB', 'NAT Gateway', 'Internet Gateway', 'Route 53'], correct: 'ELB', level: 2 },
  { id: 'l2-10', text: '¿Qué servicio construye flujos de trabajo serverless con estados?', options: ['Step Functions', 'EventBridge', 'SWF', 'Batch'], correct: 'Step Functions', level: 2 },
  { id: 'l2-11', text: '¿Qué servicio centraliza el inicio de sesión en varias cuentas AWS?', options: ['IAM Identity Center', 'IAM', 'Cognito', 'Organizations'], correct: 'IAM Identity Center', level: 2 },
  { id: 'l2-12', text: '¿Qué base de datos relacional escala como MySQL/PostgreSQL en AWS?', options: ['Aurora', 'RDS', 'DynamoDB', 'Redshift'], correct: 'Aurora', level: 2 },
  { id: 'l2-13', text: '¿Qué servicio conecta tu centro de datos a AWS de forma privada y dedicada?', options: ['Direct Connect', 'VPN', 'Transit Gateway', 'PrivateLink'], correct: 'Direct Connect', level: 2 },
  { id: 'l2-14', text: '¿Qué servicio gestiona múltiples cuentas bajo una organización?', options: ['Organizations', 'Control Tower', 'IAM', 'Service Catalog'], correct: 'Organizations', level: 2 },
  { id: 'l2-15', text: '¿Qué servicio de archivos compartidos es compatible con NFS?', options: ['EFS', 'EBS', 'S3', 'FSx'], correct: 'EFS', level: 2 },
  // Nivel 3 — Avanzado
  { id: 'l3-01', text: '¿Qué servicio de AWS da acceso a modelos de IA generativa fundacionales?', options: ['Bedrock', 'SageMaker', 'Rekognition', 'Comprehend'], correct: 'Bedrock', level: 3 },
  { id: 'l3-02', text: '¿Cuántas zonas de disponibilidad mínimas requiere una región AWS?', options: ['3', '1', '2', '4'], correct: '3', level: 3 },
  { id: 'l3-03', text: '¿Qué servicio recoge métricas, logs y alarmas de recursos AWS?', options: ['CloudWatch', 'CloudTrail', 'Config', 'Inspector'], correct: 'CloudWatch', level: 3 },
  { id: 'l3-04', text: '¿Qué servicio permite Infraestructura como Código (IaC) en AWS?', options: ['CloudFormation', 'CodePipeline', 'CodeBuild', 'CodeCommit'], correct: 'CloudFormation', level: 3 },
  { id: 'l3-05', text: '¿Qué servicio procesa streams de datos en tiempo real?', options: ['Kinesis', 'Glue', 'EMR', 'Athena'], correct: 'Kinesis', level: 3 },
  { id: 'l3-06', text: '¿Qué servicio audita y registra todas las llamadas a la API de AWS?', options: ['CloudTrail', 'CloudWatch', 'Config', 'GuardDuty'], correct: 'CloudTrail', level: 3 },
  { id: 'l3-07', text: '¿Qué herramienta detecta amenazas con ML en cuentas AWS?', options: ['GuardDuty', 'Inspector', 'Macie', 'Shield'], correct: 'GuardDuty', level: 3 },
  { id: 'l3-08', text: '¿Qué servicio ejecuta queries SQL sobre datos en S3 sin servidor?', options: ['Athena', 'Redshift', 'Glue', 'EMR'], correct: 'Athena', level: 3 },
  { id: 'l3-09', text: '¿Qué servicio cifra datos administrando llaves criptográficas?', options: ['KMS', 'Secrets Manager', 'ACM', 'CloudHSM'], correct: 'KMS', level: 3 },
  { id: 'l3-10', text: '¿Qué servicio detecta vulnerabilidades en cargas de trabajo EC2?', options: ['Inspector', 'GuardDuty', 'Macie', 'Shield'], correct: 'Inspector', level: 3 },
  { id: 'l3-11', text: '¿Qué servicio conecta muchas VPCs y redes on-premises a gran escala?', options: ['Transit Gateway', 'VPC Peering', 'Direct Connect', 'PrivateLink'], correct: 'Transit Gateway', level: 3 },
  { id: 'l3-12', text: '¿Qué servicio identifica datos sensibles (PII) almacenados en S3?', options: ['Macie', 'Inspector', 'GuardDuty', 'Config'], correct: 'Macie', level: 3 },
  { id: 'l3-13', text: '¿Qué servicio prepara y transforma datos para analítica (ETL)?', options: ['Glue', 'Athena', 'EMR', 'Kinesis'], correct: 'Glue', level: 3 },
  { id: 'l3-14', text: '¿Qué servicio gestiona certificados SSL/TLS de forma administrada?', options: ['ACM', 'KMS', 'Secrets Manager', 'IAM'], correct: 'ACM', level: 3 },
]

function getEventPool(event: TechQuizEventConfig): QuizQuestion[] {
  if (event.questionIds && event.questionIds.length > 0) {
    const ids = new Set(event.questionIds)
    const filtered = QUESTION_BANK.filter(q => ids.has(q.id))
    if (filtered.length > 0) return filtered
  }
  return QUESTION_BANK
}

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

  const pool = useMemo(() => getEventPool(event), [event.questionIds])
  const correctNeeded = Math.ceil(WIN_SCORE / 10)

  const pickQuestion = useCallback(() => {
    let levelPool = pool.filter(q => q.level <= levelRef.current)
    if (levelPool.length === 0) levelPool = pool
    const list = shuffle(levelPool)
    const q = list[0]
    setActive({ q, opts: shuffle(q.options) })
    setTimeLeft(100)
    setMessage('')
  }, [pool])

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

        {/* Question / Instructions */}
        <div className="mb-3 flex min-h-[2.8rem] flex-col items-center justify-center gap-1 rounded border border-cyan-800/30 bg-[#0e1c38] px-3 py-2 text-center leading-snug text-cyan-100">
          {over ? (
            <span className="text-[12px] font-bold">{won ? '🏆 ¡Eres un experto en AWS Cloud!' : '💀 Sin conexión — Vidas agotadas'}</span>
          ) : started && active ? (
            <span className="text-[12px] font-bold">{active.q.text}</span>
          ) : (
            <>
              <span className="text-[12px] font-bold">{event.prompt || '¿Cuánto sabes de AWS? Demuéstralo con preguntas de servicios cloud.'}</span>
              <span className="text-[10px] font-normal text-cyan-300/80">
                📋 {pool.length} preguntas disponibles · ✅ {correctNeeded} correctas para ganar · ❤️ 3 vidas (cada error resta una) · la dificultad sube según tu puntaje
              </span>
            </>
          )}
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
