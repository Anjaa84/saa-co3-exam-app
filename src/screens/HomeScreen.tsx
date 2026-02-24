import { useState, useEffect, useCallback } from 'react'
import type { Question, ExamSetSummary, PoolStatus, ActiveExam } from '../types'
import { getExamSets, getPoolStatus, getExamSet, createExamSet } from '../utils'
import rawQuestions from '../data/questions.json'

const allQuestions = rawQuestions as Question[]
const validQuestions = allQuestions.filter(q => !q.needsReview)
const validIds = validQuestions.map(q => q.id)

interface Props {
  onStartExam: (exam: ActiveExam) => void
  onViewHistory: () => void
  onSettings: () => void
}

export default function HomeScreen({ onStartExam, onViewHistory, onSettings }: Props) {
  const [sets, setSets] = useState<ExamSetSummary[]>([])
  const [pool, setPool] = useState<PoolStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([getExamSets(), getPoolStatus()])
      .then(([s, p]) => { setSets(s); setPool(p) })
      .catch(() => setError('Cannot connect to server. Run: npm run dev'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleStart() {
    setStarting(true)
    setError(null)
    try {
      const created = await createExamSet(validIds)
      const qMap = new Map(validQuestions.map(q => [q.id, q]))
      const questions = (created.questionIds as number[]).map(id => qMap.get(id)!)
      onStartExam({ questions, examSetId: created.id, setNumber: created.setNumber })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start exam')
      setStarting(false)
    }
  }

  async function handleRetry(setId: string) {
    setRetryingId(setId)
    setError(null)
    try {
      const data = await getExamSet(setId)
      const qMap = new Map(validQuestions.map(q => [q.id, q]))
      const questions = (data.questionIds as number[]).map(id => qMap.get(id)!)
      onStartExam({ questions, examSetId: data.id, setNumber: data.setNumber })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exam')
      setRetryingId(null)
    }
  }

  const poolExhausted = pool !== null && !pool.canCreate

  return (
    <div className="min-h-screen flex flex-col max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">AWS SAA-C03</h1>
          <p className="text-slate-400 text-sm">Solutions Architect Practice</p>
        </div>
        <button
          onClick={onSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Start exam button */}
      <button
        onClick={handleStart}
        disabled={starting || loading || poolExhausted}
        className="w-full py-4 rounded-xl font-semibold text-base transition-all mb-3
          bg-orange-500 hover:bg-orange-400 text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          shadow-lg shadow-orange-500/20"
      >
        {starting
          ? 'Preparing exam…'
          : poolExhausted
          ? 'All questions used — reset in Settings'
          : 'Start Practice Exam →'}
      </button>

      {/* History */}
      <button
        onClick={onViewHistory}
        className="w-full py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-sm transition-colors mb-8"
      >
        History
      </button>

      {/* Previous exams */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : sets.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Previous Exams
          </h2>
          {sets.map(s => {
            const pass = s.bestScore !== null && s.bestScore >= 72
            const never = s.attemptCount === 0
            return (
              <div key={s.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">Practice Exam {s.setNumber}</span>
                      {never ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
                          Not started
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {pass ? 'PASS' : 'FAIL'}
                        </span>
                      )}
                    </div>
                    {!never && s.bestScore !== null && (
                      <div className="text-xs text-slate-500">
                        {s.attemptCount} attempt{s.attemptCount !== 1 ? 's' : ''} · Best:{' '}
                        <span className={pass ? 'text-green-400' : 'text-red-400'}>{s.bestScore}%</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRetry(s.id)}
                    disabled={retryingId === s.id}
                    className="flex-shrink-0 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {retryingId === s.id ? '…' : never ? 'Start →' : 'Retry →'}
                  </button>
                </div>
                {s.bestScore !== null && (
                  <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pass ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${s.bestScore}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
