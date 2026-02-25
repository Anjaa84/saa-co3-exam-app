import { useState, useEffect, useCallback, useRef } from 'react'
import type { Question, ExamResult, QuestionResult } from '../types'
import { isCorrect, formatTime, saveResult } from '../utils'

const TOTAL_SECONDS = 130 * 60 // 7800

interface Props {
  questions: Question[]
  examSetId: string
  setNumber: number
  onFinish: (result: ExamResult) => void
  onAbandon: () => void
}

export default function ExamScreen({ questions, examSetId, setNumber, onFinish, onAbandon }: Props) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [flagged, setFlagged] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const startTimeRef = useRef(Date.now())
  const submittedRef = useRef(false)

  const q = questions[current]
  const selected = answers[q.id] ?? []

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!submittedRef.current) handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return
    submittedRef.current = true

    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000)
    const questionResults: QuestionResult[] = questions.map(q => {
      const sel = answers[q.id] ?? []
      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        selectedAnswers: sel,
        correctAnswers: q.correctAnswers,
        correct: isCorrect(sel, q.correctAnswers),
        explanation: q.explanation,
        topic: q.topic,
        subtopic: q.subtopic,
      }
    })

    const score = questionResults.filter(r => r.correct).length
    const result: ExamResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score,
      total: questions.length,
      timeTaken,
      examSetId,
      questionResults,
    }

    saveResult(result).catch(console.error)
    onFinish(result)
  }, [answers, questions, onFinish])

  function toggleOption(optId: string) {
    const prev = answers[q.id] ?? []
    let next: string[]

    if (q.type === 'single') {
      next = [optId]
    } else {
      if (prev.includes(optId)) {
        next = prev.filter(x => x !== optId)
      } else if (prev.length < q.numCorrect) {
        next = [...prev, optId]
      } else {
        // replace oldest selection
        next = [...prev.slice(1), optId]
      }
    }

    setAnswers(prev => ({ ...prev, [q.id]: next }))
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev)
      next.has(q.id) ? next.delete(q.id) : next.add(q.id)
      return next
    })
  }

  const answeredCount = Object.keys(answers).length
  const unanswered = questions.length - answeredCount
  const isTimeLow = timeLeft <= 300 // 5 min warning
  const isTimeUrgent = timeLeft <= 60

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setShowAbandonConfirm(true)}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Exit
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-1 rounded-md bg-slate-700 text-orange-400 font-semibold">
            Practice Exam {setNumber}
          </span>
          <span className="text-slate-400 text-sm">
            <span className="text-white font-semibold">{current + 1}</span>
            <span> / {questions.length}</span>
          </span>
          <span className="text-slate-500 text-xs">{answeredCount} answered</span>
        </div>

        <div className={`font-mono font-bold text-lg tabular-nums ${isTimeUrgent ? 'text-red-400 animate-pulse' : isTimeLow ? 'text-yellow-400' : 'text-white'}`}>
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div className="h-1 bg-slate-700">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* ── Question ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {/* Topic badge + flag */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-md bg-slate-700 text-slate-300">
              {q.subtopic}
            </span>
            {q.type === 'multiple' && (
              <span className="text-xs px-2 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Choose {q.numCorrect}
              </span>
            )}
          </div>
          <button
            onClick={toggleFlag}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              flagged.has(q.id)
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {flagged.has(q.id) ? '🚩 Flagged' : '⚑ Flag'}
          </button>
        </div>

        {/* Question text */}
        <p className="text-slate-100 text-base leading-relaxed mb-6">
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map(opt => {
            const isSelected = selected.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 text-slate-400'
                  }`}>
                    {opt.id}
                  </span>
                  <span className="text-sm leading-relaxed pt-0.5">{opt.text}</span>
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* ── Footer navigation ── */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            ← Prev
          </button>

          {/* Question grid toggle */}
          <button
            onClick={() => setShowNav(v => !v)}
            className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-xs"
          >
            {answeredCount}/{questions.length} ≡
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(c => c + 1)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors text-sm font-semibold"
            >
              Submit
            </button>
          )}
        </div>

        {/* Inline submit button always visible on last+ */}
        <div className="max-w-3xl mx-auto mt-2 flex justify-center">
          {current !== questions.length - 1 && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="text-xs text-slate-500 hover:text-orange-400 transition-colors"
            >
              Submit exam early
            </button>
          )}
        </div>
      </footer>

      {/* ── Question navigator overlay ── */}
      {showNav && (
        <div className="fixed inset-0 bg-black/60 z-20 flex items-end justify-center" onClick={() => setShowNav(false)}>
          <div
            className="bg-slate-800 rounded-t-2xl w-full max-w-3xl p-5 border-t border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Question Navigator</h3>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span><span className="inline-block w-3 h-3 rounded-sm bg-orange-500 mr-1" />Answered</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-yellow-500/40 border border-yellow-500 mr-1" />Flagged</span>
                <span><span className="inline-block w-3 h-3 rounded-sm bg-slate-700 mr-1" />Unanswered</span>
              </div>
            </div>
            <div className="grid grid-cols-13 gap-1.5 max-h-48 overflow-y-auto">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id]?.length
                const isFlagged = flagged.has(q.id)
                const isCurrent = i === current
                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrent(i); setShowNav(false) }}
                    className={`aspect-square rounded-md text-xs font-medium transition-all ${
                      isCurrent
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-800'
                        : ''
                    } ${
                      isFlagged
                        ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                        : isAnswered
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-slate-400">
                {unanswered > 0 ? `${unanswered} unanswered` : 'All answered ✓'}
              </span>
              <button
                onClick={() => { setShowNav(false); setShowSubmitConfirm(true) }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit confirmation ── */}
      {showSubmitConfirm && (
        <Modal onClose={() => setShowSubmitConfirm(false)}>
          <h2 className="text-lg font-bold text-white mb-2">Submit Exam?</h2>
          <p className="text-slate-400 text-sm mb-1">
            You have answered <span className="text-white font-semibold">{answeredCount}</span> of{' '}
            <span className="text-white font-semibold">{questions.length}</span> questions.
          </p>
          {unanswered > 0 && (
            <p className="text-yellow-400 text-sm mb-4">
              ⚠ {unanswered} question{unanswered > 1 ? 's' : ''} left unanswered.
            </p>
          )}
          {flagged.size > 0 && (
            <p className="text-yellow-400 text-sm mb-4">
              🚩 {flagged.size} question{flagged.size > 1 ? 's' : ''} flagged for review.
            </p>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm transition-colors">
              Continue Exam
            </button>
            <button onClick={handleSubmit} className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm transition-colors">
              Submit
            </button>
          </div>
        </Modal>
      )}

      {/* ── Abandon confirmation ── */}
      {showAbandonConfirm && (
        <Modal onClose={() => setShowAbandonConfirm(false)}>
          <h2 className="text-lg font-bold text-white mb-2">Exit Exam?</h2>
          <p className="text-slate-400 text-sm mb-5">Your progress will be lost.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowAbandonConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:text-white text-sm transition-colors">
              Stay
            </button>
            <button onClick={onAbandon} className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors">
              Exit
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
