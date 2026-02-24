import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const PORT = 3003
const EXAM_SIZE = 65
const TOTAL_VALID_QUESTIONS = 625 // questions where needsReview=false

app.use(cors())
app.use(express.json())

// ── GET /api/pool-status ─────────────────────────────────────────────────────
// Returns how many questions have been assigned to exam sets so far.
app.get('/api/pool-status', async (_req, res) => {
  const sets = await prisma.examSet.findMany({ select: { questionIds: true } })
  const usedIds = new Set(sets.flatMap(s => JSON.parse(s.questionIds) as number[]))
  const used = usedIds.size
  const remaining = TOTAL_VALID_QUESTIONS - used
  const setsRemaining = Math.floor(remaining / EXAM_SIZE)

  res.json({
    used,
    total: TOTAL_VALID_QUESTIONS,
    remaining,
    setsRemaining,
    canCreate: remaining >= EXAM_SIZE,
  })
})

// ── GET /api/exam-sets ───────────────────────────────────────────────────────
// Returns all exam sets with attempt stats (best score, attempt count).
app.get('/api/exam-sets', async (_req, res) => {
  const sets = await prisma.examSet.findMany({
    orderBy: { setNumber: 'asc' },
    include: {
      attempts: {
        select: { id: true, score: true, total: true, date: true },
        orderBy: { date: 'desc' },
      },
    },
  })

  const result = sets.map(s => {
    const best = s.attempts.reduce<number | null>((max, a) => {
      const pct = Math.round((a.score / a.total) * 100)
      return max === null || pct > max ? pct : max
    }, null)
    return {
      id: s.id,
      setNumber: s.setNumber,
      createdAt: s.createdAt,
      attemptCount: s.attempts.length,
      lastAttempt: s.attempts[0]?.date ?? null,
      bestScore: best,
    }
  })

  res.json(result)
})

// ── GET /api/exam-sets/:id ───────────────────────────────────────────────────
// Returns a single set with its locked question IDs and all attempts.
app.get('/api/exam-sets/:id', async (req, res) => {
  const set = await prisma.examSet.findUnique({
    where: { id: req.params.id },
    include: {
      attempts: {
        select: { id: true, score: true, total: true, date: true, timeTaken: true },
        orderBy: { date: 'desc' },
      },
    },
  })
  if (!set) { res.status(404).json({ error: 'Not found' }); return }

  res.json({
    id: set.id,
    setNumber: set.setNumber,
    createdAt: set.createdAt,
    questionIds: JSON.parse(set.questionIds) as number[],
    attempts: set.attempts,
  })
})

// ── POST /api/exam-sets ──────────────────────────────────────────────────────
// Creates a new exam set by drawing 65 questions not used in any previous set.
// The client sends the full pool of valid question IDs so the server can pick.
app.post('/api/exam-sets', async (req, res) => {
  const { allValidIds } = req.body as { allValidIds: number[] }

  if (!Array.isArray(allValidIds) || allValidIds.length < EXAM_SIZE) {
    res.status(400).json({ error: 'Need at least 65 valid question IDs' })
    return
  }

  // Collect all question IDs already assigned to existing sets
  const existingSets = await prisma.examSet.findMany({ select: { questionIds: true } })
  const usedIds = new Set(existingSets.flatMap(s => JSON.parse(s.questionIds) as number[]))

  // Unseen questions = allValidIds minus usedIds
  const unseenIds = allValidIds.filter(id => !usedIds.has(id))

  if (unseenIds.length < EXAM_SIZE) {
    res.status(409).json({
      error: 'Not enough unseen questions',
      unseenCount: unseenIds.length,
      needed: EXAM_SIZE,
    })
    return
  }

  // Shuffle and take 65
  const shuffled = shuffleArray(unseenIds)
  const picked = shuffled.slice(0, EXAM_SIZE)

  // Get next set number
  const last = await prisma.examSet.findFirst({ orderBy: { setNumber: 'desc' } })
  const setNumber = (last?.setNumber ?? 0) + 1

  const created = await prisma.examSet.create({
    data: {
      setNumber,
      createdAt: new Date(),
      questionIds: JSON.stringify(picked),
    },
  })

  res.status(201).json({ id: created.id, setNumber: created.setNumber, questionIds: picked })
})

// ── POST /api/pool-reset ─────────────────────────────────────────────────────
// Deletes all ExamSets (and cascades to their results) so the question pool
// is considered fully unused again. This is the nuclear option in Settings.
app.post('/api/pool-reset', async (_req, res) => {
  await prisma.examResult.deleteMany()
  await prisma.examSet.deleteMany()
  res.json({ ok: true })
})

// ── GET /api/results ─────────────────────────────────────────────────────────
app.get('/api/results', async (_req, res) => {
  const rows = await prisma.examResult.findMany({
    orderBy: { date: 'desc' },
    select: { id: true, date: true, score: true, total: true, timeTaken: true, examSetId: true },
  })
  res.json(rows)
})

// ── GET /api/results/:id ─────────────────────────────────────────────────────
app.get('/api/results/:id', async (req, res) => {
  const row = await prisma.examResult.findUnique({
    where: { id: req.params.id },
    include: { examSet: { select: { setNumber: true } } },
  })
  if (!row) { res.status(404).json({ error: 'Not found' }); return }

  res.json({
    id: row.id,
    date: row.date,
    score: row.score,
    total: row.total,
    timeTaken: row.timeTaken,
    examSetId: row.examSetId,
    setNumber: row.examSet.setNumber,
    results: JSON.parse(row.results),
  })
})

// ── POST /api/results ────────────────────────────────────────────────────────
app.post('/api/results', async (req, res) => {
  const { id, date, score, total, timeTaken, questionResults, examSetId } = req.body

  if (!id || !date || score == null || !total || !timeTaken || !questionResults || !examSetId) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }

  const row = await prisma.examResult.create({
    data: {
      id,
      date: new Date(date),
      score,
      total,
      timeTaken,
      results: JSON.stringify(questionResults),
      examSetId,
    },
  })

  res.status(201).json({ id: row.id })
})

// ── DELETE /api/results/:id ──────────────────────────────────────────────────
app.delete('/api/results/:id', async (req, res) => {
  try {
    await prisma.examResult.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

app.listen(PORT, () => console.log(`API server → http://localhost:${PORT}`))
