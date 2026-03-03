import { useState } from 'react'
import type { Screen, ExamResult, ActiveExam, Question } from './types'
import HomeScreen from './screens/HomeScreen'
import ExamScreen from './screens/ExamScreen'
import ResultsScreen from './screens/ResultsScreen'
import ReviewScreen from './screens/ReviewScreen'
import HistoryScreen from './screens/HistoryScreen'
import SettingsScreen from './screens/SettingsScreen'
import rawQuestions from './data/questions.json'

const allQuestions = rawQuestions as Question[]
const validQuestions = allQuestions.filter(q => !q.needsReview)
const qMap = new Map(validQuestions.map(q => [q.id, q]))

function restoreSession(): { exam: ActiveExam; screen: Screen } | null {
  try {
    const raw = localStorage.getItem('exam_session')
    if (!raw) return null
    const s = JSON.parse(raw) as { examSetId: string; setNumber: number; questionIds: number[] }
    const questions = (s.questionIds ?? []).map(id => qMap.get(id)).filter(Boolean) as Question[]
    if (!questions.length) return null
    return { exam: { questions, examSetId: s.examSetId, setNumber: s.setNumber }, screen: 'exam' }
  } catch {
    localStorage.removeItem('exam_session')
    return null
  }
}

const initial = restoreSession()

export default function App() {
  const [screen, setScreen] = useState<Screen>(initial?.screen ?? 'home')
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(initial?.exam ?? null)
  const [lastResult, setLastResult] = useState<ExamResult | null>(null)
  const [reviewResult, setReviewResult] = useState<ExamResult | null>(null)

  function startExam(exam: ActiveExam) {
    setActiveExam(exam)
    setScreen('exam')
  }

  function finishExam(result: ExamResult) {
    setLastResult(result)
    setScreen('results')
  }

  function openReview(result: ExamResult) {
    setReviewResult(result)
    setScreen('review')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {screen === 'home' && (
        <HomeScreen
          onStartExam={startExam}
          onViewHistory={() => setScreen('history')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'exam' && activeExam && (
        <ExamScreen
          questions={activeExam.questions}
          examSetId={activeExam.examSetId}
          setNumber={activeExam.setNumber}
          onFinish={finishExam}
          onAbandon={() => setScreen('home')}
        />
      )}
      {screen === 'results' && lastResult && (
        <ResultsScreen
          result={lastResult}
          onReviewWrong={() => openReview(lastResult)}
          onRetakeSet={() => {
            if (activeExam) startExam(activeExam)
          }}
          onHome={() => setScreen('home')}
        />
      )}
      {screen === 'review' && reviewResult && (
        <ReviewScreen
          result={reviewResult}
          onBack={() => setScreen(lastResult?.id === reviewResult.id ? 'results' : 'history')}
        />
      )}
      {screen === 'history' && (
        <HistoryScreen
          onBack={() => setScreen('home')}
          onReview={openReview}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen onBack={() => setScreen('home')} />
      )}
    </div>
  )
}
