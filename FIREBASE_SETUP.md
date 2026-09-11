# Interview Buddy Firebase Question Framework

This scaffold replaces the prototype's hardcoded interview questions with a server-side API backed by Firebase Cloud Firestore while preserving the updated prototype's React service layer.

## Request flow

`InterviewSessionPage.js -> interviewService.js -> Express API -> Firebase Admin -> Firestore questions collection`

The updated prototype already introduced `src/services/interviewService.js` as the React-facing interview/session facade. Firebase question retrieval is therefore implemented inside that service instead of adding a second `questionApi.js` abstraction.

This keeps database credentials and quiz answer keys off the browser and matches the project's layered client-server design. The UI receives quiz choices, but the quiz `correctAnswer` stays on the server and is checked through a separate API endpoint.

## 1. Create the Firestore database

In the Firebase console for your Interview Buddy project, enable **Cloud Firestore**. The backend expects a collection named `questions`.

Each question document can contain:

- `mode`: `Quiz Style`, `Code Style`, or `Theoretical Style`
- `prompt`: question shown to the user
- `options`: array used by Quiz Style questions
- `correctAnswer`: server-only quiz answer
- `explanation`: server-returned explanation after a quiz submission
- `difficulty`: optional metadata
- `topic`: optional metadata
- `tags`: array used for lightweight matching against practice goals
- `experienceLevels`: array used to rank questions for the setup form
- `jobRoles`: array used to rank questions for the setup form
- `priority`: optional numeric ranking boost
- `active`: set to `false` to hide a question without deleting it

A starter dataset is included in `server/seed/questions.json`.

## 2. Configure Firebase Admin for the backend

Create a Firebase/Google service account that can access Firestore. Keep the JSON credential **outside this repository**.

Copy the backend environment template:

```bash
cd server
cp .env.example .env
```

Set `FIREBASE_PROJECT_ID` in `server/.env`, then point `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON in your shell.

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/service-account.json"
```

Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
```

## 3. Install and seed the backend

```bash
cd server
npm install
npm run seed
npm start
```

The API defaults to `http://localhost:5001` and exposes:

- `GET /api/health`
- `GET /api/questions?mode=Quiz%20Style&jobRole=...&experienceLevel=...&practiceGoals=...`
- `POST /api/questions/:questionId/check` with `{ "answer": "..." }`

## 4. Configure and run the React client

From the repository root, create `.env.local`:

```env
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

Then run the existing React app:

```bash
npm install
npm start
```

Start the React client and the `server` process in separate terminals during development.

## 5. Firestore rules

`firestore.rules` currently denies all direct browser access because the application layer is responsible for database access. Firebase Admin on the backend uses IAM and does not depend on client security rules.

When Firebase Authentication is implemented, add token verification middleware to the Express API before protected routes. Because `InterviewSessionPage.js` calls `interviewService.js`, authentication and backend changes can be added without giving page components direct Firebase knowledge.

## Combined-project files

### Existing updated-prototype service retained and expanded

- `src/services/interviewService.js` — remains the single React-facing interview/session service and now contains database-backed question retrieval and quiz checking.
- `src/services/index.js` — unchanged; it already exports `interviewService`.
- `src/services/aiService.js` — unchanged; AI answer evaluation remains a separate Sprint 2 concern.
- `src/services/authService.js`, `historyService.js`, `leaderboardService.js` — unchanged.

### Interview flow changed

- `src/pages/InterviewSessionPage.js` — removes hardcoded questions, loads Firebase-backed questions through `interviewService`, supports multiple questions, and checks quiz answers through the backend.
- `src/pages/DashboardPage.js` — wording updated from a hardcoded flow to a database-backed flow.

### Backend/Firebase files added

- `server/src/firebaseAdmin.js` — Firebase Admin/Firestore connection.
- `server/src/routes/questions.js` — question retrieval and quiz-answer endpoints.
- `server/seed/questions.json` — starter Firestore data.
- `server/scripts/seedQuestions.js` — seed utility.
- `firestore.rules` — blocks direct client database access.
- `.env.example` and `server/.env.example` — environment templates.

There is intentionally **no `src/services/questionApi.js`** in this merged version. Its responsibilities were folded into the newer prototype's `interviewService.js` so the application has one interview-service abstraction instead of two competing ones.
