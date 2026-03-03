import { useState, useEffect, useCallback } from 'react'
import type { Question, ExamSetSummary, ActiveExam } from '../types'
import { getExamSets, getExamSet, seedExams } from '../utils'
import rawQuestions from '../data/questions.json'

const allQuestions = rawQuestions as Question[]
const qMap = new Map(allQuestions.map(q => [q.id, q]))

interface Props {
  onStartExam: (exam: ActiveExam) => void
  onViewHistory: () => void
  onSettings: () => void
}

export default function HomeScreen({ onStartExam, onViewHistory, onSettings }: Props) {
  const [sets, setSets] = useState<ExamSetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data = await getExamSets()
      if (data.length === 0) {
        await seedExams()
        data = await getExamSets()
      }
      setSets(data)
    } catch {
      setError('Cannot connect to server. Run: npm run dev')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function handleStart(setId: string) {
    setStartingId(setId)
    setError(null)
    try {
      const data = await getExamSet(setId)
      const questions = (data.questionIds as number[]).map(id => qMap.get(id)!).filter(Boolean)
      onStartExam({ questions, examSetId: data.id, setNumber: data.setNumber })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exam')
      setStartingId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Practice Exams
            </h2>
            {sets.map(s => {
              const pass = s.bestScore !== null && s.bestScore >= 72
              const never = s.attemptCount === 0
              const isStarting = startingId === s.id
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
                      onClick={() => handleStart(s.id)}
                      disabled={isStarting}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isStarting ? '…' : never ? 'Start →' : 'Retry →'}
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

          <button
            onClick={onViewHistory}
            className="w-full py-2.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white text-sm transition-colors"
          >
            History
          </button>
        </>
      )}
    </div>
  )
}
