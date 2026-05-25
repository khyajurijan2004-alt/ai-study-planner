'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSubjects, addSubject, deleteSubject, updateSubject, saveQuizResult } from '@/lib/db'
import { generateSummary, generateQuiz, detectWeakTopics } from '@/lib/ai'
import { parseAIJson } from '@/lib/utils'
import type { Subject } from '@/types'
import { Plus, Trash2, Brain, Loader2, BookOpen, AlertTriangle, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { SUBJECT_COLORS } from '@/lib/utils'

export default function SubjectsPage() {
  const { user, profile } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newSubject, setNewSubject] = useState({ name: '', color: SUBJECT_COLORS[0], targetHours: 20 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeAI, setActiveAI] = useState<{ id: string; mode: 'summary' | 'quiz' | 'weak' } | null>(null)
  const [aiInput, setAiInput] = useState('')
  const [aiResult, setAiResult] = useState<Record<string, unknown> | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  const load = async () => {
    if (!user) return
    const s = await getSubjects(user.uid)
    setSubjects(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleAdd = async () => {
    if (!user || !newSubject.name) return
    await addSubject(user.uid, {
      name: newSubject.name,
      color: newSubject.color,
      totalHours: 0,
      targetHours: newSubject.targetHours,
      weakTopics: [],
      quizScores: [],
    })
    setNewSubject({ name: '', color: SUBJECT_COLORS[0], targetHours: 20 })
    setShowAdd(false)
    load()
  }

  const runAI = async (subjectId: string, mode: 'summary' | 'quiz' | 'weak') => {
    if (!user) return
    const subject = subjects.find(s => s.id === subjectId)
    if (!subject) return
    setAiLoading(true)
    setAiResult(null)
    setQuizAnswers({})
    setQuizSubmitted(false)
    try {
      if (mode === 'summary') {
        const raw = await generateSummary(aiInput || `${subject.name} overview`)
        const parsed = parseAIJson<Record<string, unknown>>(raw)
        setAiResult(parsed)
      } else if (mode === 'quiz') {
        const raw = await generateQuiz(subject.name, aiInput || subject.name, aiInput || `Study material for ${subject.name}`)
        const parsed = parseAIJson<Record<string, unknown>>(raw)
        setAiResult(parsed)
      } else if (mode === 'weak') {
        const raw = await detectWeakTopics({
          subject: subject.name,
          quizScores: subject.quizScores || [],
          skippedSessions: [],
        })
        const parsed = parseAIJson<Record<string, unknown>>(raw)
        setAiResult(parsed)
        if (parsed?.weakTopics && Array.isArray(parsed.weakTopics)) {
          const weakNames = (parsed.weakTopics as { topic: string }[]).map(t => t.topic)
          await updateSubject(user.uid, subjectId, { weakTopics: weakNames })
          load()
        }
      }
    } catch {
      setAiResult({ error: 'AI request failed. Check your API key in .env.local' })
    }
    setAiLoading(false)
  }

  const submitQuiz = async (subject: Subject) => {
    if (!user || !aiResult) return
    const mcqs = (aiResult as { mcqs?: { question: string; answer: string; options: string[] }[] }).mcqs || []
    let correct = 0
    const answers = mcqs.map((q, i) => {
      const isCorrect = quizAnswers[i] === q.answer
      if (isCorrect) correct++
      return { question: q.question, correct: isCorrect }
    })
    await saveQuizResult(user.uid, {
      subject: subject.name,
      topic: aiInput || subject.name,
      score: correct,
      total: mcqs.length,
      answers,
    })
    const updatedScores = [
      ...(subject.quizScores || []),
      { topic: aiInput || subject.name, score: correct, total: mcqs.length },
    ]
    await updateSubject(user.uid, subject.id, { quizScores: updatedScores })
    setQuizSubmitted(true)
    load()
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">Manage subjects and use AI for quizzes, summaries, and weak topic detection</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary">
          <Plus size={14} /> Add Subject
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="section-title">New Subject</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Subject Name</label>
              <input className="input" placeholder="e.g. Data Structures" value={newSubject.name}
                onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Target Hours</label>
              <input type="number" className="input" min={1} value={newSubject.targetHours}
                onChange={e => setNewSubject(p => ({ ...p, targetHours: +e.target.value }))} />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {SUBJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewSubject(p => ({ ...p, color: c }))}
                    className={`w-6 h-6 rounded-full transition-all ${newSubject.color === c ? 'ring-2 ring-offset-1 ring-foreground scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} className="btn-primary" disabled={!newSubject.name}>
              <Plus size={14} /> Add
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="loading-spinner w-6 h-6" /></div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No subjects yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(subject => {
            const progress = subject.targetHours > 0 ? Math.min((subject.totalHours / subject.targetHours) * 100, 100) : 0
            const isExpanded = expanded === subject.id
            const isAIActive = activeAI?.id === subject.id
            return (
              <div key={subject.id} className="card overflow-hidden">
                <div className="p-4 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{subject.name}</h3>
                      {subject.weakTopics?.length > 0 && (
                        <span className="badge bg-red-50 text-red-600 border border-red-200 text-xs">
                          {subject.weakTopics.length} weak
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: subject.color }} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{subject.totalHours}/{subject.targetHours}h</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpanded(isExpanded ? null : subject.id)} className="btn-ghost p-1.5">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={async () => { await deleteSubject(user!.uid, subject.id); load() }}
                      className="btn-ghost p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/30 animate-slide-up">
                    {/* Weak Topics */}
                    {subject.weakTopics?.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> Weak Topics
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.weakTopics.map(t => (
                            <span key={t} className="badge bg-white border border-red-200 text-red-600 text-xs">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quiz Scores */}
                    {subject.quizScores?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-foreground mb-2">Recent Quiz Scores</p>
                        <div className="space-y-1">
                          {subject.quizScores.slice(-3).map((score, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground flex-1">{score.topic}</span>
                              <span className={`text-xs font-medium ${(score.score / score.total) >= 0.7 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {score.score}/{score.total} ({Math.round((score.score / score.total) * 100)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Tools */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {([
                        { mode: 'summary', icon: FileText, label: 'AI Summary' },
                        { mode: 'quiz', icon: HelpCircle, label: 'AI Quiz' },
                        { mode: 'weak', icon: AlertTriangle, label: 'Weak Topics' },
                      ] as const).map(({ mode, icon: Icon, label }) => (
                        <button key={mode}
                          onClick={() => { setActiveAI(isAIActive && activeAI?.mode === mode ? null : { id: subject.id, mode }); setAiResult(null); setAiInput('') }}
                          className={`btn-secondary text-xs ${isAIActive && activeAI?.mode === mode ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}>
                          <Icon size={12} /> {label}
                        </button>
                      ))}
                    </div>

                    {/* AI Panel */}
                    {isAIActive && (
                      <div className="p-3 rounded-lg border border-border bg-card animate-slide-up">
                        {activeAI?.mode !== 'weak' && (
                          <div className="mb-3">
                            <label className="label text-xs">
                              {activeAI?.mode === 'summary' ? 'Paste your notes or topic:' : 'Topic to quiz on:'}
                            </label>
                            <textarea className="input text-xs resize-none" rows={3}
                              placeholder={activeAI?.mode === 'summary' ? 'Paste study notes here…' : 'e.g. Binary Search Trees'}
                              value={aiInput} onChange={e => setAiInput(e.target.value)} />
                          </div>
                        )}

                        {!aiResult && (
                          <button onClick={() => runAI(subject.id, activeAI!.mode)} className="btn-primary text-xs" disabled={aiLoading}>
                            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                            {aiLoading ? 'Processing…' : 'Run AI'}
                          </button>
                        )}

                        {/* Results */}
                        {aiResult && activeAI?.mode === 'summary' && (
                          <div className="space-y-3">
                            {(aiResult as { summary?: string }).summary && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Summary</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{(aiResult as { summary: string }).summary}</p>
                              </div>
                            )}
                            {(aiResult as { keyPoints?: string[] }).keyPoints && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Key Points</p>
                                {(aiResult as { keyPoints: string[] }).keyPoints.map((p, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">• {p}</p>
                                ))}
                              </div>
                            )}
                            <button onClick={() => { setAiResult(null); setAiInput('') }} className="btn-secondary text-xs">Clear</button>
                          </div>
                        )}

                        {aiResult && activeAI?.mode === 'quiz' && (
                          <div className="space-y-4">
                            {(aiResult as { mcqs?: { question: string; options: string[]; answer: string; explanation?: string }[] }).mcqs?.map((q, i) => (
                              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs font-medium mb-2">{i + 1}. {q.question}</p>
                                <div className="space-y-1.5">
                                  {q.options.map(opt => {
                                    const selected = quizAnswers[i] === opt
                                    const isCorrect = opt === q.answer
                                    return (
                                      <button key={opt} disabled={quizSubmitted}
                                        onClick={() => setQuizAnswers(p => ({ ...p, [i]: opt }))}
                                        className={`w-full text-left text-xs px-3 py-1.5 rounded border transition-all ${
                                          quizSubmitted ? (isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : selected ? 'bg-red-50 border-red-300 text-red-600' : 'border-border') :
                                          selected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border hover:border-primary/30'}`}>
                                        {opt}
                                      </button>
                                    )
                                  })}
                                </div>
                                {quizSubmitted && q.explanation && (
                                  <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                                )}
                              </div>
                            ))}
                            {!quizSubmitted ? (
                              <button onClick={() => submitQuiz(subject)} className="btn-primary text-xs">Submit Quiz</button>
                            ) : (
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium">
                                Score: {Object.values(quizAnswers).filter((ans, i) => {
                                  const mcqs = (aiResult as { mcqs?: { answer: string }[] }).mcqs || []
                                  return ans === mcqs[i]?.answer
                                }).length} / {(aiResult as { mcqs?: unknown[] }).mcqs?.length || 0} — Saved to your profile!
                              </div>
                            )}
                          </div>
                        )}

                        {aiResult && activeAI?.mode === 'weak' && (
                          <div className="space-y-2">
                            {(aiResult as { weakTopics?: { topic: string; reason: string; priority: string }[] }).weakTopics?.map((t, i) => (
                              <div key={i} className={`p-2.5 rounded-lg border text-xs ${t.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                <p className="font-medium">{t.topic}</p>
                                <p className="text-muted-foreground">{t.reason}</p>
                              </div>
                            ))}
                            {(aiResult as { recommendations?: string[] }).recommendations?.map((r, i) => (
                              <p key={i} className="text-xs text-muted-foreground">💡 {r}</p>
                            ))}
                          </div>
                        )}

                        {(aiResult as { error?: string })?.error && (
                          <p className="text-xs text-destructive">{(aiResult as { error: string }).error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
