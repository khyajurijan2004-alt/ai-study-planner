'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { updateUserProfile } from '@/lib/db'
import { Settings, User, Target, AlertTriangle, Save, Loader2, Plus, X } from 'lucide-react'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [studyGoal, setStudyGoal] = useState('')
  const [weakSubject, setWeakSubject] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [weakSubjects, setWeakSubjects] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setGoals(profile.studyGoals || [])
      setWeakSubjects(profile.weakSubjects || [])
    }
  }, [profile])

  const save = async () => {
    if (!user) return
    setSaving(true)
    await updateUserProfile(user.uid, { name, studyGoals: goals, weakSubjects })
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile and study preferences</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2">
            <User size={15} /> Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Display Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
            </div>
          </div>
        </div>

        {/* Study Goals */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2">
            <Target size={15} /> Study Goals
          </h3>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="e.g. Crack FAANG interviews" value={studyGoal}
              onChange={e => setStudyGoal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && studyGoal.trim()) { setGoals(p => [...p, studyGoal.trim()]); setStudyGoal('') }}} />
            <button onClick={() => { if (studyGoal.trim()) { setGoals(p => [...p, studyGoal.trim()]); setStudyGoal('') }}}
              className="btn-secondary shrink-0">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {goals.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5 badge bg-primary/10 text-primary border border-primary/20 text-xs">
                {g}
                <button onClick={() => setGoals(p => p.filter((_, idx) => idx !== i))} className="hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
            {goals.length === 0 && <p className="text-xs text-muted-foreground">No goals set yet</p>}
          </div>
        </div>

        {/* Weak Subjects */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" /> Known Weak Areas
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            AI will prioritize these subjects in generated study plans.
          </p>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="e.g. Database Normalization" value={weakSubject}
              onChange={e => setWeakSubject(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && weakSubject.trim()) { setWeakSubjects(p => [...p, weakSubject.trim()]); setWeakSubject('') }}} />
            <button onClick={() => { if (weakSubject.trim()) { setWeakSubjects(p => [...p, weakSubject.trim()]); setWeakSubject('') }}}
              className="btn-secondary shrink-0">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakSubjects.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 badge bg-red-50 text-red-600 border border-red-200 text-xs">
                {s}
                <button onClick={() => setWeakSubjects(p => p.filter((_, idx) => idx !== i))} className="hover:text-red-800 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
            {weakSubjects.length === 0 && <p className="text-xs text-muted-foreground">No weak areas flagged</p>}
          </div>
        </div>

        {/* API Keys Info */}
        <div className="card p-5 bg-amber-50/50 border-amber-100">
          <h3 className="section-title flex items-center gap-2 text-amber-800">
            <Settings size={15} /> API Configuration
          </h3>
          <p className="text-xs text-amber-700 leading-relaxed">
            AI features require API keys configured in your <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code> file.
            See <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local.example</code> for setup instructions.
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-amber-700">• <strong>Gemini (Free):</strong> Get key at aistudio.google.com</p>
            <p className="text-xs text-amber-700">• <strong>OpenAI:</strong> Get key at platform.openai.com</p>
            <p className="text-xs text-amber-700">• <strong>Firebase:</strong> Create project at console.firebase.google.com</p>
          </div>
        </div>

        <button onClick={save} className="btn-primary" disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
