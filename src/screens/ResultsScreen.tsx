import type { ExamResult } from '../types'
import { getStudySuggestions, formatTime } from '../utils'

interface Props {
  result: ExamResult
  onReviewWrong: () => void
  onRetakeSet: () => void
  onHome: () => void
}

export default function ResultsScreen({ result, onReviewWrong, onRetakeSet, onHome }: Props) {
  const { score, total, timeTaken, questionResults } = result
  const pct = Math.round((score / total) * 100)
  const pass = pct >= 72
  const wrong = total - score
  const skipped = questionResults.filter(r => r.selectedAnswers.length === 0).length
  const suggestions = getStudySuggestions(questionResults)
  const setNumber = result.setNumber ?? '?'

  return (
    <div className="min-h-screen p-4 pb-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="pt-8 pb-6 text-center">
        <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Practice Exam {setNumber}</div>
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-8 mb-4 ${
          pass ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'
        }`}>
          <div>
            <div className="text-4xl font-bold">{pct}%</div>
            <div className="text-sm font-medium">{pass ? 'PASS' : 'FAIL'}</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Exam Complete</h1>
        <p className="text-slate-400 text-sm mt-1">
          {pass ? '🎉 You passed! Great work.' : "Keep studying — you'll get there!"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Correct', value: score, color: 'text-green-400' },
          { label: 'Wrong', value: wrong, color: 'text-red-400' },
          { label: 'Skipped', value: skipped, color: 'text-yellow-400' },
          { label: 'Time', value: formatTime(timeTaken), color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800 rounded-xl p-3 text-center border border-slate-700">
            <div className={`text-xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mb-8">
        {wrong > 0 && (
          <button
            onClick={onReviewWrong}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Review {wrong} Wrong Answer{wrong > 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={onRetakeSet}
          className="w-full py-3.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors"
        >
          Retry This Exam
        </button>
        <button
          onClick={onHome}
          className="w-full py-3 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white transition-colors"
        >
          All Practice Exams
        </button>
      </div>

      {/* Study Suggestions */}
      {suggestions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📚</span>
            <h2 className="font-bold text-white">Study Suggestions</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Focus on these specific areas before your next attempt:
          </p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={s.subtopic} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-red-500/20 text-red-400' :
                      i === 1 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{s.subtopic}</div>
                      <div className="text-xs text-slate-500">{s.topic}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">{s.wrongCount}/{s.totalSeen}</div>
                    <div className="text-xs text-slate-500">{Math.round(s.errorRate * 100)}% miss</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${s.errorRate * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
