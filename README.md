# AI Meeting Recorder + Action Tracker

AI-powered meeting tool that auto-transcribes, summarizes, and extracts action items from your meetings. Integrates with Slack, Notion, and Asana.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express.js, TypeScript, Mongoose, Passport.js
- **Database:** MongoDB
- **Auth:** JWT + Google OAuth 2.0

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials (for Google sign-in)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/pankajcr7/AI-Meeting.git
cd AI-Meeting
```

### 2. Install dependencies

```bash
# Install all dependencies
npm run install:all
```

### 3. Configure environment variables

```bash
# Copy the example env file
cp .env.example backend/.env

# Create frontend env
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
```

Edit `backend/.env` with your actual values:
- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET` — a strong random secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

### 4. Start MongoDB

```bash
# If using local MongoDB
mongod
```

### 5. Run both servers

```bash
# From the root directory — starts both frontend and backend
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Backend (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend in dev mode |
| `npm run dev:backend` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run build` | Build both projects for production |
| `npm run install:all` | Install dependencies for both projects |

## Project Structure

```
AI-Meeting/
├── frontend/          # Next.js 14 app (port 3000)
├── backend/           # Express API server (port 5000)
├── .env.example       # Environment variable template
├── package.json       # Root workspace config
└── README.md
```

## Features

- Email/password and Google OAuth authentication
- Team workspaces with invite codes
- Meeting audio upload and recording
- AI-powered transcription and summarization
- Action item extraction and tracking
- Slack, Notion, and Asana integrations
- Deadline reminders
