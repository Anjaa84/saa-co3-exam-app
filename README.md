# AWS SAA-C03 Exam Practice App

A full-stack practice exam app for the AWS Solutions Architect Associate (SAA-C03) certification. Features timed 65-question exam sets, unique questions per set, score tracking, wrong-answer review, and subtopic-level study suggestions.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Express 5, Prisma ORM, SQLite
- **Data**: 625 exam questions parsed from the official question bank

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

Create the `.env` file in the project root:

```bash
echo 'DATABASE_URL="file:./prisma/dev.db"' > .env
```

Then run the Prisma migrations to create the SQLite database:

```bash
npx prisma migrate deploy
```

### 3. Start the app

```bash
npm run dev
```

This starts both servers concurrently:

| Server | URL |
|--------|-----|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:3003 |

Open **http://localhost:5173** in your browser.

---

## How It Works

### Exam Sets
- Click **Create New Exam Set** on the home screen to generate a new set of 65 questions.
- Each set draws only from questions not used in any previous set — no repeats across sets.
- You can retry the same set as many times as you want.
- Up to **9 exam sets** can be created from the question pool (625 questions / 65).

### Taking an Exam
- 130-minute countdown timer
- Single-answer and multiple-answer questions (multi-answer shows "Choose N" badge)
- Flag questions to revisit later
- Question navigator grid to jump between questions
- Submit early or let the timer run out

### Results
- Pass/fail at 72% threshold (same as the real exam)
- Breakdown of correct, wrong, and skipped answers
- **Study Suggestions**: top weakest subtopics ranked by error rate
- Retry the same set or create the next one

### History
- All past attempts saved with date, score, and time taken
- Click **Review** on any attempt to see which questions were wrong and read explanations

### Settings
Access via the gear icon on the home screen. Contains the **Reset Question Pool** option, which permanently deletes all exam sets and results so you can start completely fresh.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend in watch mode |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run dev:server` | Start only the Express API |
| `npm run build` | Build for production |
| `npm run db:studio` | Open Prisma Studio (visual database browser) |

---

## Regenerating Questions (Optional)

The question data (`src/data/questions.json`) is already included. If you need to re-parse it from the source files:

1. Install poppler (macOS):
   ```bash
   brew install poppler
   ```

2. Extract the PDF to text:
   ```bash
   pdftotext -layout "AWS Certified Solutions Architect Associate SAA-C03.pdf" questions_raw.txt
   ```

3. Run the parser:
   ```bash
   python3 parse_questions.py
   ```

   This produces `questions.json` in the project root. Copy it to `src/data/questions.json`.

---

## Project Structure

```
saa-co3-exam-app/
├── server/
│   └── index.ts              # Express API (port 3003)
├── src/
│   ├── data/
│   │   └── questions.json    # 625 parsed exam questions
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── ExamScreen.tsx
│   │   ├── ResultsScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── App.tsx
│   ├── types.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma         # ExamSet + ExamResult models
│   └── migrations/
├── parse_questions.py        # PDF + TXT to questions.json parser
├── .env                      # DATABASE_URL (create this yourself)
└── vite.config.ts            # Proxies /api requests to port 3003
```
