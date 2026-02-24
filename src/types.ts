export interface Question {
  id: number
  question: string
  type: 'single' | 'multiple'
  numCorrect: number
  options: { id: string; text: string }[]
  correctAnswers: string[]
  explanation: string
  topic: string
  subtopic: string
  needsReview: boolean
}

export interface QuestionResult {
  questionId: number
  question: string
  options: { id: string; text: string }[]
  selectedAnswers: string[]
  correctAnswers: string[]
  correct: boolean
  explanation: string
  topic: string
  subtopic: string
}

export interface ExamResult {
  id: string
  date: string
  score: number
  total: number
  timeTaken: number
  examSetId: string
  setNumber?: number       // populated when fetching full detail
  questionResults: QuestionResult[]
}

// Summary of a single exam set (no question detail)
export interface ExamSetSummary {
  id: string
  setNumber: number
  createdAt: string
  attemptCount: number
  lastAttempt: string | null
  bestScore: number | null   // percentage 0-100, null if never attempted
}

export interface PoolStatus {
  used: number
  total: number
  remaining: number
  setsRemaining: number
  canCreate: boolean
}

export interface StudySuggestion {
  subtopic: string
  topic: string
  wrongCount: number
  totalSeen: number
  errorRate: number
}

export type Screen = 'home' | 'exam' | 'results' | 'review' | 'history' | 'settings'

export interface ActiveExam {
  questions: Question[]
  examSetId: string
  setNumber: number
}
