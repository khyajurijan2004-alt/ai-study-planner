import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Subject, StudySession, Exam, QuizResult, UserProfile } from '@/types'

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserProfile) : null
}

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, {
    ...data,
    weakSubjects: [],
    studyGoals: [],
    studyStreak: 0,
    lastStudyDate: null,
    createdAt: serverTimestamp(),
  })
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, { ...data })
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function getSubjects(uid: string): Promise<Subject[]> {
  const ref = collection(db, 'users', uid, 'subjects')
  const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subject))
}

export async function addSubject(uid: string, subject: Omit<Subject, 'id'>) {
  const ref = collection(db, 'users', uid, 'subjects')
  return addDoc(ref, { ...subject, createdAt: serverTimestamp() })
}

export async function updateSubject(uid: string, subjectId: string, data: Partial<Subject>) {
  const ref = doc(db, 'users', uid, 'subjects', subjectId)
  await updateDoc(ref, data)
}

export async function deleteSubject(uid: string, subjectId: string) {
  await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId))
}

// ─── Study Sessions ───────────────────────────────────────────────────────────

export async function getStudySessions(uid: string, limit?: number): Promise<StudySession[]> {
  const ref = collection(db, 'users', uid, 'sessions')
  const q = query(ref, orderBy('date', 'desc'))
  const snap = await getDocs(q)
  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudySession))
  return limit ? sessions.slice(0, limit) : sessions
}

export async function getTodaySessions(uid: string): Promise<StudySession[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const ref = collection(db, 'users', uid, 'sessions')
  const q = query(
    ref,
    where('date', '>=', Timestamp.fromDate(today)),
    where('date', '<', Timestamp.fromDate(tomorrow))
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudySession))
}

export async function addStudySession(uid: string, session: Omit<StudySession, 'id'>) {
  const ref = collection(db, 'users', uid, 'sessions')
  return addDoc(ref, { ...session, createdAt: serverTimestamp() })
}

export async function updateStudySession(
  uid: string,
  sessionId: string,
  data: Partial<StudySession>
) {
  await updateDoc(doc(db, 'users', uid, 'sessions', sessionId), data)
}

export async function deleteStudySession(uid: string, sessionId: string) {
  await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId))
}

// ─── Exams ────────────────────────────────────────────────────────────────────

export async function getExams(uid: string): Promise<Exam[]> {
  const ref = collection(db, 'users', uid, 'exams')
  const snap = await getDocs(query(ref, orderBy('date', 'asc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exam))
}

export async function addExam(uid: string, exam: Omit<Exam, 'id'>) {
  const ref = collection(db, 'users', uid, 'exams')
  return addDoc(ref, { ...exam, createdAt: serverTimestamp() })
}

export async function deleteExam(uid: string, examId: string) {
  await deleteDoc(doc(db, 'users', uid, 'exams', examId))
}

// ─── Quiz Results ─────────────────────────────────────────────────────────────

export async function getQuizResults(uid: string): Promise<QuizResult[]> {
  const ref = collection(db, 'users', uid, 'quizResults')
  const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizResult))
}

export async function saveQuizResult(uid: string, result: Omit<QuizResult, 'id'>) {
  const ref = collection(db, 'users', uid, 'quizResults')
  return addDoc(ref, { ...result, createdAt: serverTimestamp() })
}

// ─── Streak Logic ─────────────────────────────────────────────────────────────

export async function updateStudyStreak(uid: string) {
  const profile = await getUserProfile(uid)
  if (!profile) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastDate = profile.lastStudyDate?.toDate?.()
  if (!lastDate) {
    await updateUserProfile(uid, { studyStreak: 1, lastStudyDate: Timestamp.fromDate(today) })
    return
  }

  const lastDay = new Date(lastDate)
  lastDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    await updateUserProfile(uid, {
      studyStreak: (profile.studyStreak || 0) + 1,
      lastStudyDate: Timestamp.fromDate(today),
    })
  } else if (diffDays > 1) {
    await updateUserProfile(uid, { studyStreak: 1, lastStudyDate: Timestamp.fromDate(today) })
  }
}
