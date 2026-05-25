import { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  uid: string
  name: string
  email: string
  weakSubjects: string[]
  studyGoals: string[]
  studyStreak: number
  lastStudyDate: Timestamp | null
  createdAt?: Timestamp
}

export interface Subject {
  id: string
  name: string
  color: string
  icon?: string
  totalHours: number
  targetHours: number
  weakTopics: string[]
  quizScores: { topic: string; score: number; total: number }[]
  createdAt?: Timestamp
}

export interface StudySession {
  id: string
  subjectId: string
  subjectName: string
  topic: string
  hours: number
  date: Timestamp
  completed: boolean
  notes?: string
  priority: 'low' | 'medium' | 'high'
  createdAt?: Timestamp
}

export interface Exam {
  id: string
  subject: string
  date: Timestamp
  notes?: string
  createdAt?: Timestamp
}

export interface QuizResult {
  id: string
  subject: string
  topic: string
  score: number
  total: number
  answers: { question: string; correct: boolean }[]
  createdAt?: Timestamp
}

export interface StudyPlan {
  weeklyPlan: {
    day: string
    sessions: { subject: string; hours: number; topic: string; priority: string }[]
  }[]
  tips: string[]
  totalHours: number
}

export interface AIRecommendation {
  title: string
  description: string
  urgency: 'low' | 'medium' | 'high'
}

export interface AnalyticsData {
  date: string
  hours: number
  subject: string
}
