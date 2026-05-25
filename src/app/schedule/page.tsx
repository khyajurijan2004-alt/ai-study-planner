'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getStudySessions, addStudySession, deleteStudySession, updateStudySession,
  getExams, addExam, deleteExam, getSubjects,
} from '@/lib/db'
import { generateStudyPlan } from '@/lib/ai'
import { parseAIJson } from '@/lib/utils'
import type { StudySession, Exam, Subject, StudyPlan } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { Plus, Trash2, Brain, Loader2, Calendar, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { daysUntil, formatDate, SUBJECT_COLORS } from '@/lib/utils'

export default function SchedulePage() {
  const { user, profile } = useAuth()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSession, setShowAddSession] = useState(false)
  const [showAddExam, setShowAddExam] = useState(false)
  const [showAIPlanner, setShowAIPlanner] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPlan, setAiPlan] = useState<StudyPlan | null>(null)
  const [activeTab, setActiveTab] = useState<'sessions' | 'exams'>('sessions')

  // Form state
  const [newSession, setNewSession] = useState({
    subjectId: '', topic: '', hours: 1, date: new Date().toISOString().split('T')[0], priority: 'medium' as 'low' | 'medium' | 'high',
  })
  const [newExam, setNewExam] = useState({ subject: '', date: '' })
  const [aiForm, setAiForm] = useState({ examDate: '', hoursPerDay: 4 })

  const load = async () => {
    if (!user) return
    const [s, e, sub] = await Promise.all([
      getStudySessions(user.uid),
      getExams(user.uid),
      getSubjects(user.uid),
    ])
    setSessions(s)
    setExams(e)
    setSubjects(sub)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const addSession = async () => {
    if (!user || !newSession.subjectId) return
    const subject = subjects.find(s => s.id === newSession.subjectId)
    await addStudySession(user.uid, {
      subjectId: newSession.subjectId,
      subjectName: subject?.name || '',
      topic: newSession.topic,
      hours: newSession.hours,
      date: Timestamp.fromDate(new Date(newSession.date)),
      completed: false,
      priority: newSession.priority,
    })
    setShowAddSession(false)
    setNewSession({ subjectId: '', topic: '', hours: 1, date: new Date().toISOString().split('T')[0], priority: 'medium' })
    load()
  }

  const addExamHandler = async () => {
    if (!user || !newExam.subject || !newExam.date) return
    await addExam(user.uid, {
      subject: newExam.subject,
      date: Timestamp.fromDate(new Date(newExam.date)),
    })
    setShowAddExam(false)
    setNewExam({ subject: '', date: '' })
    load()
  }

  const generateAIPlan = async () => {
    if (!user || !aiForm.examDate || subjects.length === 0) return
    setAiLoading(true)
    try {
      const raw = await generateStudyPlan({
        subjects: subjects.map(s => s.name),
        examDate: aiForm.examDate,
        hoursPerDay: aiForm.hoursPerDay,
        weakSubjects: profile?.weakSubjects || [],
      })
      const plan = parseAIJson<StudyPlan>(raw)
      setAiPlan(plan)
    } catch (err) {
      alert('AI plan generation failed. Check your API key.')
    }
    setAiLoading(false)
  }

  const importAIPlan = async () => {
    if (!aiPlan || !user) return
    const today = new Date()
    for (const day of aiPlan.weeklyPlan) {
      const dayIdx = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(day.day)
      const sessionDate = new Date(today)
      const currentDay = sessionDate.getDay() === 0 ? 6 : sessionDate.getDay() - 1
      const diff = (dayIdx - currentDay + 7) % 7
      sessionDate.setDate(sessionDate.getDate() + diff)

      for (const s of day.sessions) {
        const subject = subjects.find(sub => sub.name.toLowerCase() === s.subject.toLowerCase()) || subjects[0]
        if (!subject) continue
        await addStudySession(user.uid, {
          subjectId: subject.id,
          subjectName: s.subject,
          topic: s.topic,
          hours: s.hours,
          date: Timestamp.fromDate(sessionDate),
          completed: false,
          priority: (s.priority as 'low' | 'medium' | 'high') || 'medium',
        })
      }
    }
    setAiPlan(null)
    setShowAIPlanner(false)
    load()
  }

  const groupedSessions = sessions.reduce((acc, s) => {
    const date = s.date instanceof Timestamp ? s.date.toDate() : new Date(s.date as unknown as string)
    const key = date.toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, StudySession[]>)

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-subtitle">Manage study sessions, exams, and AI-generated plans</p>
        </div>
        <button onClick={() => setShowAIPlanner(!showAIPlanner)} className="btn-primary">
          <Brain size={15} />
          AI Generate Plan
        </button>
      </div>

      {/* AI Planner */}
      {showAIPlanner && (
        <div className="card p-5 mb-6 border-primary/20 bg-primary/5 animate-slide-up">
          <h3 className="section-title flex items-center gap-2">
            <Brain size={15} className="text-primary" /> AI Study Plan Generator
          </h3>
          {!aiPlan ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Exam Date</label>
                <input type="date" className="input" value={aiForm.examDate}
                  onChange={e => setAiForm(p => ({ ...p, examDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">Hours/Day Available</label>
                <input type="number" className="input" value={aiForm.hoursPerDay} min={1} max={12}
                  onChange={e => setAiForm(p => ({ ...p, hoursPerDay: +e.target.value }))} />
              </div>
              <div className="flex items-end">
                <button onClick={generateAIPlan} disabled={aiLoading || !aiForm.examDate} className="btn-primary w-full">
                  {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Brain size={15} />}
                  {aiLoading ? 'Generating…' : 'Generate Plan'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Day</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Sessions</th>
                  </tr></thead>
                  <tbody>
                    {aiPlan.weeklyPlan.map(day => (
                      <tr key={day.day} className="border-b border-border/50">
                        <td className="py-2 font-medium pr-4">{day.day}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            {day.sessions.map((s, i) => (
                              <span key={i} className="badge bg-primary/10 text-primary text-xs">
                                {s.subject} · {s.hours}h
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {aiPlan.tips?.length > 0 && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">AI Tips:</p>
                  {aiPlan.tips.map((t, i) => <p key={i} className="text-xs text-muted-foreground">• {t}</p>)}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={importAIPlan} className="btn-primary">
                  <Check size={14} /> Import to Schedule
                </button>
                <button onClick={() => setAiPlan(null)} className="btn-secondary">Regenerate</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg w-fit">
        {(['sessions', 'exams'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'sessions' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{sessions.length} total sessions</p>
            <button onClick={() => setShowAddSession(!showAddSession)} className="btn-secondary">
              <Plus size={14} /> Add Session
            </button>
          </div>

          {showAddSession && (
            <div className="card p-5 mb-4 animate-slide-up">
              <h3 className="section-title">New Study Session</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Subject</label>
                  <select className="input" value={newSession.subjectId}
                    onChange={e => setNewSession(p => ({ ...p, subjectId: e.target.value }))}>
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Topic</label>
                  <input className="input" placeholder="e.g. Binary Trees" value={newSession.topic}
                    onChange={e => setNewSession(p => ({ ...p, topic: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={newSession.date}
                    onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Hours</label>
                  <input type="number" className="input" min={0.5} max={8} step={0.5}
                    value={newSession.hours}
                    onChange={e => setNewSession(p => ({ ...p, hours: +e.target.value }))} />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={newSession.priority}
                    onChange={e => setNewSession(p => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addSession} className="btn-primary" disabled={!newSession.subjectId}>
                  <Plus size={14} /> Add Session
                </button>
                <button onClick={() => setShowAddSession(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {loading ? <div className="flex justify-center py-10"><div className="loading-spinner w-6 h-6" /></div> : (
            Object.keys(groupedSessions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No sessions yet. Add one or use AI to generate a plan.</p>
              </div>
            ) : (
              Object.entries(groupedSessions).sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime()).map(([dateStr, daySessions]) => (
                <div key={dateStr} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="space-y-2">
                    {daySessions.map(session => (
                      <div key={session.id} className={`card px-4 py-3 flex items-center gap-3 ${session.completed ? 'opacity-60' : ''}`}>
                        <button onClick={async () => {
                          await updateStudySession(user!.uid, session.id, { completed: !session.completed })
                          load()
                        }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${session.completed ? 'border-emerald-500 bg-emerald-500' : 'border-border hover:border-primary'}`}>
                          {session.completed && <Check size={10} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${session.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {session.subjectName}
                          </p>
                          <p className="text-xs text-muted-foreground">{session.topic}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{session.hours}h</span>
                        <span className={`badge border text-xs ${
                          session.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                          session.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {session.priority}
                        </span>
                        <button onClick={async () => {
                          await deleteStudySession(user!.uid, session.id); load()
                        }} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}

      {activeTab === 'exams' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{exams.length} exams</p>
            <button onClick={() => setShowAddExam(!showAddExam)} className="btn-secondary">
              <Plus size={14} /> Add Exam
            </button>
          </div>

          {showAddExam && (
            <div className="card p-5 mb-4 animate-slide-up">
              <h3 className="section-title">Add Exam</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Subject</label>
                  <input className="input" placeholder="e.g. Data Structures" value={newExam.subject}
                    onChange={e => setNewExam(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Exam Date</label>
                  <input type="date" className="input" value={newExam.date}
                    onChange={e => setNewExam(p => ({ ...p, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={addExamHandler} className="btn-primary" disabled={!newExam.subject || !newExam.date}>
                  <Plus size={14} /> Add Exam
                </button>
                <button onClick={() => setShowAddExam(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {exams.map(exam => {
              const date = exam.date instanceof Timestamp ? exam.date.toDate() : new Date(exam.date as unknown as string)
              const days = daysUntil(date)
              return (
                <div key={exam.id} className="card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exam.subject}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge border text-xs ${
                      days < 0 ? 'bg-gray-50 text-gray-500 border-gray-200' :
                      days <= 3 ? 'bg-red-50 text-red-600 border-red-200' :
                      days <= 7 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'}`}>
                      {days < 0 ? 'Past' : days === 0 ? 'Today!' : `${days}d left`}
                    </span>
                    <button onClick={async () => { await deleteExam(user!.uid, exam.id); load() }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
            {exams.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No exams added yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
