'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getStudySessions, getSubjects, getQuizResults } from '@/lib/db'
import type { StudySession, Subject, QuizResult } from '@/types'
import { Timestamp } from 'firebase/firestore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { BarChart3, TrendingUp, Target, Award } from 'lucide-react'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [s, sub, q] = await Promise.all([
        getStudySessions(user.uid),
        getSubjects(user.uid),
        getQuizResults(user.uid),
      ])
      setSessions(s)
      setSubjects(sub)
      setQuizResults(q)
      setLoading(false)
    }
    load()
  }, [user])

  // Daily hours for last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d
  })

  const dailyData = last14.map(date => {
    const dateStr = date.toDateString()
    const daySessions = sessions.filter(s => {
      const sd = s.date instanceof Timestamp ? s.date.toDate() : new Date(s.date as unknown as string)
      return sd.toDateString() === dateStr
    })
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: daySessions.reduce((sum, s) => sum + (s.completed ? s.hours : 0), 0),
      planned: daySessions.reduce((sum, s) => sum + s.hours, 0),
    }
  })

  // Subject distribution
  const subjectData = subjects.map(sub => {
    const subSessions = sessions.filter(s => s.subjectId === sub.id && s.completed)
    const hours = subSessions.reduce((sum, s) => sum + s.hours, 0)
    return { name: sub.name, hours, color: sub.color }
  }).filter(s => s.hours > 0)

  // Quiz performance
  const quizData = quizResults.slice(-10).map((q, i) => ({
    name: `Quiz ${i + 1}`,
    score: Math.round((q.score / q.total) * 100),
    subject: q.subject,
  }))

  // Stats
  const totalHours = sessions.filter(s => s.completed).reduce((sum, s) => sum + s.hours, 0)
  const completionRate = sessions.length > 0 ? Math.round((sessions.filter(s => s.completed).length / sessions.length) * 100) : 0
  const avgQuizScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / quizResults.length)
    : 0
  const weekHours = dailyData.slice(-7).reduce((sum, d) => sum + d.hours, 0)

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Track your study progress and performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BarChart3, label: 'Total Hours', value: `${totalHours}h`, sub: 'all time', color: 'text-blue-500' },
          { icon: TrendingUp, label: 'This Week', value: `${weekHours}h`, sub: 'last 7 days', color: 'text-emerald-500' },
          { icon: Target, label: 'Completion', value: `${completionRate}%`, sub: 'session rate', color: 'text-violet-500' },
          { icon: Award, label: 'Avg Quiz', value: `${avgQuizScore}%`, sub: `${quizResults.length} quizzes`, color: 'text-amber-500' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <div className={`text-xs font-medium flex items-center gap-1.5 ${color} mb-1`}>
              <Icon size={13} /> {label}
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="loading-spinner w-6 h-6" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily Study Hours */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="section-title">Daily Study Hours (14 days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="planned" name="Planned" fill="#e0e7ff" radius={[3, 3, 0, 0]} />
                <Bar dataKey="hours" name="Completed" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Distribution */}
          <div className="card p-5">
            <h3 className="section-title">Subject Distribution</h3>
            {subjectData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={subjectData} dataKey="hours" cx="50%" cy="50%" outerRadius={60} paddingAngle={2}>
                      {subjectData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val}h`, 'Hours']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {subjectData.map(s => (
                    <div key={s.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 text-muted-foreground">{s.name}</span>
                      <span className="font-medium text-foreground">{s.hours}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quiz Performance */}
          {quizData.length > 0 && (
            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title">Quiz Performance</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={quizData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Score']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Progress */}
          <div className={`card p-5 ${quizData.length > 0 ? '' : 'lg:col-span-3'}`}>
            <h3 className="section-title">Subject Goals</h3>
            <div className="space-y-3">
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects yet.</p>
              ) : subjects.map(sub => {
                const progress = sub.targetHours > 0 ? Math.min((sub.totalHours / sub.targetHours) * 100, 100) : 0
                return (
                  <div key={sub.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                        <span className="text-xs font-medium text-foreground">{sub.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{sub.totalHours}/{sub.targetHours}h</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: sub.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
