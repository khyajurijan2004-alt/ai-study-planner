// AI Service - supports both Gemini (free) and OpenAI
// Set your preferred API key in .env.local

export type AIProvider = 'gemini' | 'openai'

const getProvider = (): AIProvider => {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return 'gemini'
  if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) return 'openai'
  return 'gemini' // default
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  )
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${err}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error: ${err}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function callAI(prompt: string): Promise<string> {
  const provider = getProvider()
  try {
    if (provider === 'gemini') return await callGemini(prompt)
    return await callOpenAI(prompt)
  } catch (err) {
    console.error('AI call failed:', err)
    throw err
  }
}

// ─── Specific AI Functions ──────────────────────────────────────────────────

export async function generateStudyPlan(params: {
  subjects: string[]
  examDate: string
  hoursPerDay: number
  weakSubjects: string[]
}): Promise<string> {
  const daysUntilExam = Math.ceil(
    (new Date(params.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const prompt = `You are a smart study planner AI. Create a detailed day-by-day study schedule.

Context:
- Subjects: ${params.subjects.join(', ')}
- Days until exam: ${daysUntilExam}
- Study hours per day: ${params.hoursPerDay}
- Weak subjects (need more time): ${params.weakSubjects.join(', ') || 'none'}

Generate a structured weekly study plan. Format it as JSON with this structure:
{
  "weeklyPlan": [
    {
      "day": "Monday",
      "sessions": [
        { "subject": "Math", "hours": 2, "topic": "Calculus Chapter 3", "priority": "high" }
      ]
    }
  ],
  "tips": ["tip1", "tip2"],
  "totalHours": 20
}

Only respond with valid JSON, no markdown.`
  return callAI(prompt)
}

export async function generateSummary(text: string): Promise<string> {
  const prompt = `Analyze the following study notes and create a structured summary.

Notes:
${text}

Respond with JSON:
{
  "summary": "2-3 paragraph summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "importantTerms": [{"term": "term1", "definition": "def1"}],
  "studyTips": ["tip1", "tip2"]
}

Only respond with valid JSON, no markdown.`
  return callAI(prompt)
}

export async function generateQuiz(
  subject: string,
  topic: string,
  notes: string
): Promise<string> {
  const prompt = `Generate a quiz for a student studying ${subject} - ${topic}.

Study material:
${notes}

Create 5 multiple choice questions and 3 short answer questions.
Respond with JSON:
{
  "mcqs": [
    {
      "question": "What is...?",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "Because..."
    }
  ],
  "shortAnswer": [
    {
      "question": "Explain...",
      "sampleAnswer": "..."
    }
  ]
}

Only respond with valid JSON, no markdown.`
  return callAI(prompt)
}

export async function detectWeakTopics(params: {
  subject: string
  quizScores: { topic: string; score: number; total: number }[]
  skippedSessions: string[]
}): Promise<string> {
  const prompt = `Analyze a student's performance and identify weak topics.

Subject: ${params.subject}
Quiz Scores: ${JSON.stringify(params.quizScores)}
Skipped Sessions: ${params.skippedSessions.join(', ')}

Respond with JSON:
{
  "weakTopics": [
    { "topic": "Database Normalization", "reason": "Low quiz score (40%)", "priority": "high" }
  ],
  "recommendations": ["Spend 2 extra hours on...", "Review..."],
  "overallScore": 65
}

Only respond with valid JSON, no markdown.`
  return callAI(prompt)
}

export async function getAIRecommendations(params: {
  studyStreak: number
  weakSubjects: string[]
  upcomingExams: { subject: string; date: string }[]
  completedToday: number
  totalToday: number
}): Promise<string> {
  const prompt = `You are a personal study coach. Give personalized recommendations.

Student Stats:
- Study streak: ${params.studyStreak} days
- Weak subjects: ${params.weakSubjects.join(', ') || 'none identified yet'}
- Upcoming exams: ${JSON.stringify(params.upcomingExams)}
- Today's progress: ${params.completedToday}/${params.totalToday} sessions completed

Give 3 specific, actionable recommendations.
Respond with JSON:
{
  "recommendations": [
    { "title": "Focus on Weak Areas", "description": "Detailed advice...", "urgency": "high" }
  ],
  "motivationalMessage": "You're doing great because..."
}

Only respond with valid JSON, no markdown.`
  return callAI(prompt)
}
