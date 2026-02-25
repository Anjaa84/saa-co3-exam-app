import { useState } from 'react'
import type { ExamResult, QuestionResult } from '../types'

interface Props {
  result: ExamResult
  onBack: () => void
}

export default function ReviewScreen({ result, onBack }: Props) {
  const wrongOnly = result.questionResults.filter(r => !r.correct)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const topics = [...new Set(wrongOnly.map(r => r.topic))].sort()

  const filtered = filter === 'all'
    ? wrongOnly
    : wrongOnly.filter(r => r.topic === filter)

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Back
          </button>
          <div className="text-center">
            <h1 className="font-bold text-white text-sm">Review Wrong Answers</h1>
            <p className="text-slate-500 text-xs">{wrongOnly.length} incorrect</p>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4">
        {/* Topic filter */}
        {topics.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              All ({wrongOnly.length})
            </button>
            {topics.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === t ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {t} ({wrongOnly.filter(r => r.topic === t).length})
              </button>
            ))}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {filtered.map((r, idx) => (
            <QuestionReview key={r.questionId} r={r} index={idx + 1} expanded={expanded.has(r.questionId)} onToggle={() => toggleExpand(r.questionId)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function QuestionReview({ r, index, expanded, onToggle }: {
  r: QuestionResult
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Question header — always visible */}
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-slate-750 transition-colors">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold mt-0.5">
            {index}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">{r.subtopic}</span>
            </div>
            <p className="text-sm text-slate-200 line-clamp-2">{r.question}</p>
          </div>
          <span className="flex-shrink-0 text-slate-500 text-lg">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-2">
          {/* Full question text */}
          <p className="text-sm text-slate-200 leading-relaxed mb-4">{r.question}</p>

          {/* Options */}
          {r.options.map(opt => {
            const isCorrect = r.correctAnswers.includes(opt.id)
            const isSelected = r.selectedAnswers.includes(opt.id)
            const isWrongPick = isSelected && !isCorrect
            const isMissed = isCorrect && !isSelected

            let cls = 'bg-slate-700/50 border-slate-600 text-slate-400'
            if (isCorrect) cls = 'bg-green-500/15 border-green-500 text-green-300'
            if (isWrongPick) cls = 'bg-red-500/15 border-red-500 text-red-300'

            return (
              <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cls}`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  isCorrect ? 'bg-green-500 border-green-500 text-white' :
                  isWrongPick ? 'bg-red-500 border-red-500 text-white' :
                  'border-slate-600 text-slate-500'
                }`}>
                  {opt.id}
                </span>
                <span className="text-sm leading-relaxed flex-1">{opt.text}</span>
                <span className="flex-shrink-0 text-xs">
                  {isCorrect && !isSelected && '✓ correct'}
                  {isWrongPick && '✗ your pick'}
                  {isCorrect && isSelected && '✓ correct'}
                  {isMissed && r.selectedAnswers.length > 0 && ' (missed)'}
                </span>
              </div>
            )
          })}

          {/* Your answer summary */}
          {r.selectedAnswers.length === 0 && (
            <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              ⚠ You skipped this question
            </div>
          )}

          {/* Explanation */}
          {r.explanation && (
            <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                Explanation
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{r.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
