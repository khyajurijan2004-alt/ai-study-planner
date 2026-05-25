'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getTodaySessions, getExams, getSubjects } from '@/lib/db'
import { getAIRecommendations } from '@/lib/ai'
import { parseAIJson as parseJson } from '@/lib/utils'
import { daysUntil, formatDate } from '@/lib/utils'
import type { StudySession, Exam, Subject, AIRecommendation } from '@/types'
import { Flame, Target, CheckCircle2, Clock, Brain, AlertTriangle, Loader2, Trophy } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { updateStudySession } from '@/lib/db'
import { updateStudyStreak } from '@/lib/db'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [todaySessions, setTodaySessions] = useState<StudySession[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [motivationalMsg, setMotivationalMsg] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [sessions, examList, subjectList] = await Promise.all([
        getTodaySessions(user.uid),
        getExams(user.uid),
        getSubjects(user.uid),
      ])
      setTodaySessions(sessions)
      setExams(examList.filter(e => {
        const d = e.date instanceof Timestamp ? e.date.toDate() : new Date(e.date as unknown as string)
        return daysUntil(d) >= 0
      }).slice(0, 3))
      setSubjects(subjectList)
      setLoading(false)

      // Load AI recommendations
      if (subjectList.length > 0 || sessions.length > 0) {
        setAiLoading(true)
        try {
          const upcomingExams = examList.slice(0, 3).map(e => ({
            subject: e.subject,
            date: e.date instanceof Timestamp ? e.date.toDate().toISOString() : '',
          }))
          const raw = await getAIRecommendations({
            studyStreak: profile?.studyStreak || 0,
            weakSubjects: profile?.weakSubjects || [],
            upcomingExams,
            completedToday: sessions.filter(s => s.completed).length,
            totalToday: sessions.length,
          })
          const parsed = parseJson<{ recommendations: AIRecommendation[], motivationalMessage: string }>(raw)
          if (parsed) {
            setRecommendations(parsed.recommendations || [])
            setMotivationalMsg(parsed.motivationalMessage || '')
          }
        } catch {}
        setAiLoading(false)
      }
    }
    load()
  }, [user, profile])

  const toggleSession = async (session: StudySession) => {
    if (!user) return
    const updated = { ...session, completed: !session.completed }
    setTodaySessions(prev => prev.map(s => s.id === session.id ? updated : s))
    await updateStudySession(user.uid, session.id, { completed: !session.completed })
    if (!session.completed) await updateStudyStreak(user.uid)
  }

  const completedCount = todaySessions.filter(s => s.completed).length
  const totalHoursToday = todaySessions.reduce((sum, s) => sum + s.hours, 0)

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {profile?.name?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Flame size={13} className="text-amber-500" /> Study Streak
          </div>
          <p className="text-2xl font-bold text-foreground">{profile?.studyStreak || 0}</p>
          <p className="text-xs text-muted-foreground">days in a row</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <CheckCircle2 size={13} className="text-emerald-500" /> Today's Progress
          </div>
          <p className="text-2xl font-bold text-foreground">{completedCount}/{todaySessions.length}</p>
          <p className="text-xs text-muted-foreground">sessions done</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Clock size={13} className="text-blue-500" /> Hours Today
          </div>
          <p className="text-2xl font-bold text-foreground">{totalHoursToday}</p>
          <p className="text-xs text-muted-foreground">hours planned</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Trophy size={13} className="text-violet-500" /> Subjects
          </div>
          <p className="text-2xl font-bold text-foreground">{subjects.length}</p>
          <p className="text-xs text-muted-foreground">active subjects</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="section-title flex items-center gap-2">
              <Target size={15} className="text-primary" />
              Today's Study Sessions
            </h2>
            {loading ? (
              <div className="flex justify-center py-8"><div className="loading-spinner w-6 h-6" /></div>
            ) : todaySessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sessions scheduled for today.</p>
                <p className="text-xs mt-1">Go to Schedule to add sessions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map(session => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      session.completed ? 'bg-muted/50 border-border opacity-60' : 'bg-card border-border hover:border-primary/30'
                    }`}
                  >
                    <button
                      onClick={() => toggleSession(session)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        session.completed ? 'border-emerald-500 bg-emerald-500' : 'border-border hover:border-primary'
                      }`}
                    >
                      {session.completed && <CheckCircle2 size={12} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${session.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {session.subjectName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{session.topic}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{session.hours}h</span>
                    <span className={`badge text-xs border ${
                      session.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                      session.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>{session.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Exams */}
          <div className="card p-5">
            <h2 className="section-title flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              Upcoming Exams
            </h2>
            {exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming exams. Add them in Schedule.</p>
            ) : (
              <div className="space-y-2">
                {exams.map(exam => {
                  const date = exam.date instanceof Timestamp ? exam.date.toDate() : new Date(exam.date as unknown as string)
                  const days = daysUntil(date)
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">{exam.subject}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
                      </div>
                      <span className={`badge border text-xs ${
                        days <= 3 ? 'bg-red-50 text-red-600 border-red-200' :
                        days <= 7 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {days === 0 ? 'Today!' : `${days}d left`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="card p-5 h-fit">
          <h2 className="section-title flex items-center gap-2">
            <Brain size={15} className="text-primary" />
            AI Coach
          </h2>
          {aiLoading ? (
            <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin text-primary" />
              <p className="text-xs">Analyzing your progress…</p>
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add subjects and study sessions to get personalized AI recommendations.
            </p>
          ) : (
            <div className="space-y-3">
              {motivationalMsg && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-primary/80 leading-relaxed">{motivationalMsg}</p>
                </div>
              )}
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border border-l-4 ${
                    rec.urgency === 'high' ? 'border-l-red-500 bg-red-50/50' :
                    rec.urgency === 'medium' ? 'border-l-amber-500 bg-amber-50/50' :
                    'border-l-emerald-500 bg-emerald-50/50'
                  } border-border`}
                >
                  <p className="text-xs font-semibold text-foreground mb-0.5">{rec.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
