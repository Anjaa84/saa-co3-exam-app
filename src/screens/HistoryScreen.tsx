import { useState, useEffect } from 'react'
import type { ExamResult } from '../types'
import { loadResults, loadResult, deleteResult, formatDate, formatTime, getStudySuggestions } from '../utils'

interface Props {
  onBack: () => void
  onReview: (result: ExamResult) => void
}

export default function HistoryScreen({ onBack, onReview }: Props) {
  const [history, setHistory] = useState<ExamResult[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReview, setLoadingReview] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadResults()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleReview(id: string) {
    setLoadingReview(id)
    try {
      const full = await loadResult(id)
      onReview(full)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReview(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exam record?')) return
    setDeletingId(id)
    try {
      await deleteResult(id)
      setHistory(h => h.filter(r => r.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading history…</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <span className="text-5xl mb-4">📋</span>
        <h1 className="text-xl font-bold text-white mb-2">No Exams Yet</h1>
        <p className="text-slate-400 text-sm mb-6">Complete an exam to see your history here.</p>
        <button onClick={onBack} className="px-6 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white transition-colors">
          ← Back to Home
        </button>
      </div>
    )
  }

  const bestScore = Math.max(...history.map(r => Math.round((r.score / r.total) * 100)))
  const avgScore = Math.round(history.reduce((s, r) => s + (r.score / r.total) * 100, 0) / history.length)

  // Aggregate suggestions across all exams that have full data loaded
  const allQuestionResults = history.flatMap(r => r.questionResults)
  const suggestions = allQuestionResults.length > 0
    ? getStudySuggestions(allQuestionResults).slice(0, 5)
    : []

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Home
          </button>
          <h1 className="font-bold text-white">Exam History</h1>
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Exams', value: history.length },
            { label: 'Best Score', value: `${bestScore}%` },
            { label: 'Average', value: `${avgScore}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
              <div className="text-2xl font-bold text-orange-400">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Overall study suggestions — only when full data available */}
        {suggestions.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              📚 Overall Weak Areas
            </h2>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={s.subtopic} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-red-500/20 text-red-400' :
                      i <= 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{s.subtopic}</div>
                      <div className="text-xs text-slate-500">{s.topic}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-red-400">{Math.round(s.errorRate * 100)}%</span>
                    <div className="text-xs text-slate-500">miss rate</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Exam list */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">All Attempts</h2>
        <div className="space-y-3">
          {history.map((r, idx) => {
            const pct = Math.round((r.score / r.total) * 100)
            const pass = pct >= 72
            const wrong = r.total - r.score
            return (
              <div key={r.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {r.setNumber != null ? `Practice Exam ${r.setNumber}` : 'Practice Exam'}
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(r.date)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${pass ? 'text-green-400' : 'text-red-400'}`}>{pct}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pass ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                  <span>✓ {r.score} correct</span>
                  <span>✗ {wrong} wrong</span>
                  <span>⏱ {formatTime(r.timeTaken)}</span>
                </div>

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${pass ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  {wrong > 0 ? (
                    <button
                      onClick={() => handleReview(r.id)}
                      disabled={loadingReview === r.id}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                    >
                      {loadingReview === r.id ? 'Loading…' : `Review ${wrong} wrong answer${wrong > 1 ? 's' : ''} →`}
                    </button>
                  ) : (
                    <span className="text-xs text-green-400">Perfect score! ✓</span>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="text-xs text-slate-600 hover:text-red-400 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
