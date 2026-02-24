import type { QuestionResult, StudySuggestion, ExamResult, ExamSetSummary, PoolStatus } from './types'

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isCorrect(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) return false
  const a = [...selected].sort()
  const b = [...correct].sort()
  return a.every((v, i) => v === b[i])
}

export function getStudySuggestions(results: QuestionResult[]): StudySuggestion[] {
  const map = new Map<string, { topic: string; wrong: number; total: number }>()
  for (const r of results) {
    if (!map.has(r.subtopic)) map.set(r.subtopic, { topic: r.topic, wrong: 0, total: 0 })
    const entry = map.get(r.subtopic)!
    entry.total++
    if (!r.correct) entry.wrong++
  }
  return [...map.entries()]
    .filter(([, v]) => v.wrong > 0)
    .map(([subtopic, v]) => ({
      subtopic,
      topic: v.topic,
      wrongCount: v.wrong,
      totalSeen: v.total,
      errorRate: v.wrong / v.total,
    }))
    .sort((a, b) => b.errorRate - a.errorRate || b.wrongCount - a.wrongCount)
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// Pool -------------------------------------------------------------------------

export function getPoolStatus(): Promise<PoolStatus> {
  return apiFetch('/api/pool-status')
}

// Exam Sets -------------------------------------------------------------------

export function getExamSets(): Promise<ExamSetSummary[]> {
  return apiFetch('/api/exam-sets')
}

export function getExamSet(id: string): Promise<{ id: string; setNumber: number; createdAt: string; questionIds: number[] }> {
  return apiFetch(`/api/exam-sets/${id}`)
}

/** Creates a new exam set. Sends all valid question IDs so server can pick unseen ones. */
export function createExamSet(allValidIds: number[]): Promise<{ id: string; setNumber: number; questionIds: number[] }> {
  return apiFetch('/api/exam-sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allValidIds }),
  })
}

export function resetPool(): Promise<{ ok: boolean }> {
  return apiFetch('/api/pool-reset', { method: 'POST' })
}

// Results ---------------------------------------------------------------------

export function saveResult(result: ExamResult): Promise<void> {
  return apiFetch('/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: result.id,
      date: result.date,
      score: result.score,
      total: result.total,
      timeTaken: result.timeTaken,
      questionResults: result.questionResults,
      examSetId: result.examSetId,
    }),
  }).then(() => undefined)
}

export function loadResults(): Promise<ExamResult[]> {
  return apiFetch<(ExamResult & { questionResults: never[] })[]>('/api/results').then(rows =>
    rows.map(r => ({ ...r, questionResults: [] }))
  )
}

export function loadResult(id: string): Promise<ExamResult> {
  return apiFetch<{ id: string; date: string; score: number; total: number; timeTaken: number; examSetId: string; setNumber: number; results: QuestionResult[] }>(`/api/results/${id}`)
    .then(row => ({
      id: row.id,
      date: row.date,
      score: row.score,
      total: row.total,
      timeTaken: row.timeTaken,
      examSetId: row.examSetId,
      setNumber: row.setNumber,
      questionResults: row.results,
    }))
}

export function deleteResult(id: string): Promise<void> {
  return apiFetch(`/api/results/${id}`, { method: 'DELETE' }).then(() => undefined)
}
