import { useState } from 'react'
import type { Screen, ExamResult, ActiveExam } from './types'
import HomeScreen from './screens/HomeScreen'
import ExamScreen from './screens/ExamScreen'
import ResultsScreen from './screens/ResultsScreen'
import ReviewScreen from './screens/ReviewScreen'
import HistoryScreen from './screens/HistoryScreen'
import SettingsScreen from './screens/SettingsScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null)
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
          onCreateNext={(exam) => startExam(exam)}
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
