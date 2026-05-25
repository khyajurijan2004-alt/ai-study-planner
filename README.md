# 🎓 StudyAI — Smart AI Study Planner

A full-stack AI-powered study planning application built with Next.js 14, Firebase, Tailwind CSS, and Google Gemini / OpenAI.

## ✨ Features

- **🔐 Authentication** — Sign up / login / logout via Firebase Auth
- **📅 Study Scheduler** — Add study sessions, set priorities, track completion
- **🤖 AI Study Plan Generator** — Input exam date + hours/day → AI builds a weekly schedule
- **📝 AI Summary Generator** — Paste notes → get structured summaries and key points
- **🧠 AI Quiz Generator** — AI creates MCQ quizzes with explanations, scores saved to Firestore
- **⚠️ Weak Topic Detection** — AI analyzes quiz scores and flags topics needing revision
- **📊 Analytics Dashboard** — Charts for daily hours, subject distribution, quiz performance
- **🔥 Study Streak** — Tracks consecutive days studied
- **📱 Responsive** — Works on desktop, tablet, and mobile

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Styling | Tailwind CSS |
| AI | Google Gemini 1.5 Flash (free) or OpenAI GPT-3.5 |
| Charts | Recharts |
| Icons | Lucide React |

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd ai-study-planner
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password sign-in
4. Create a **Firestore Database** (start in test mode)
5. Go to Project Settings → Your Apps → Web App → Copy config

### 3. AI API Key (Choose One)

**Option A: Google Gemini (Free — Recommended for students)**
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Free tier: 15 RPM, 1M tokens/day

**Option B: OpenAI**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create an API key (paid)

### 4. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Gemini (OR OpenAI — pick one)
NEXT_PUBLIC_GEMINI_API_KEY=AIza...
# NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing + Auth
│   ├── dashboard/            # Main dashboard
│   ├── schedule/             # Sessions + Exams + AI Planner
│   ├── subjects/             # Subject management + AI tools
│   ├── analytics/            # Charts and stats
│   └── settings/             # Profile + preferences
├── components/
│   └── ui/
│       ├── AuthForm.tsx      # Login/Signup form
│       └── Sidebar.tsx       # Navigation sidebar
├── hooks/
│   └── useAuth.tsx           # Auth context & hooks
├── lib/
│   ├── firebase.ts           # Firebase initialization
│   ├── db.ts                 # Firestore operations
│   ├── ai.ts                 # AI service (Gemini/OpenAI)
│   └── utils.ts              # Helper utilities
└── types/
    └── index.ts              # TypeScript types
```

## 🗄 Firestore Data Structure

```
users/
  {uid}/
    name, email, weakSubjects, studyGoals, studyStreak, lastStudyDate
    
    subjects/
      {subjectId}/
        name, color, totalHours, targetHours, weakTopics, quizScores
    
    sessions/
      {sessionId}/
        subjectId, subjectName, topic, hours, date, completed, priority
    
    exams/
      {examId}/
        subject, date, notes
    
    quizResults/
      {resultId}/
        subject, topic, score, total, answers
```

## 🔒 Firestore Security Rules

Add these rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🚢 Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

## 📸 Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page + Auth |
| `/dashboard` | Overview, today's tasks, AI coach |
| `/schedule` | Sessions, exams, AI plan generator |
| `/subjects` | Subjects with AI quiz/summary/weak detection |
| `/analytics` | Charts: hours, distribution, quiz scores |
| `/settings` | Profile, goals, weak areas |

## 🤝 Contributing

Feel free to fork and extend! Ideas:
- Pomodoro timer
- Push notifications
- Collaborative study groups
- Note-taking with AI
- Spaced repetition flashcards
