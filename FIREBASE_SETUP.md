# Interview Buddy Firebase Repository Setup

This version of the prototype keeps Firebase/Firestore behind a server-side repository (data-access) layer.

## Updated request flow

```text
React page
  -> src/services/interviewService.js
  -> Express route
  -> repository contract
  -> Firestore repository implementation
  -> Firebase Admin / Firestore
```

The important change is that the Express routes no longer import `firebaseAdmin.js` or call Firestore APIs directly. Firestore-specific calls such as `collection()`, `where()`, `doc()`, `get()`, and `set()` are isolated under `server/src/repositories/firestore/`.

This matches the acceptance criteria for:

- a repository/data-access layer that isolates Firestore specifics;
- interfaces/contracts used by the application layer;
- at least one concrete implementation and a real usage example.

## Repository files

```text
server/src/repositories/
├── index.js
├── contracts/
│   ├── QuestionRepository.js
│   └── EvaluationRepository.js
└── firestore/
    ├── FirestoreQuestionRepository.js
    └── FirestoreEvaluationRepository.js
```

### Contracts

`QuestionRepository.js` defines the operations used by question-related application code:

- `findByMode(mode)`
- `findById(questionId)`
- `upsertMany(questions)`

`EvaluationRepository.js` defines:

- `saveEvaluation(...)`

These files contain no Firebase imports and no Firestore-specific APIs.

### Concrete Firestore implementations

`FirestoreQuestionRepository.js` and `FirestoreEvaluationRepository.js` implement the contracts using Firestore.

`server/src/repositories/index.js` is the composition root. It creates the concrete Firestore repositories and exports them for application use.

### Usage example

`server/src/app.js` injects repositories into the router factories:

```js
app.use(
  "/api/questions",
  createQuestionRouter({ questionRepository })
);
```

The question route then uses only the repository interface:

```js
const questions = await questionRepository.findByMode(mode);
```

The route does not know that the data came from Firestore.

## 1. Create the Firestore database

In the Firebase console for the Interview Buddy project, enable **Cloud Firestore**. The backend currently expects a `questions` collection.

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

AI evaluations are currently stored under:

```text
sessions/{sessionId}/responses/{questionId}
```

That document layout is intentionally contained inside `FirestoreEvaluationRepository.js` so route code does not depend on it.

## 2. Configure Firebase Admin

Create a Firebase/Google service account that can access Firestore. Keep the JSON credential **outside this repository**.

Copy the backend environment template:

```bash
cd server
cp .env.example .env
```

Set your project ID in `server/.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
```

Then point `GOOGLE_APPLICATION_CREDENTIALS` to the service-account JSON in your shell.

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/service-account.json"
```

Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\service-account.json"
```

A hosted environment can instead provide `FIREBASE_SERVICE_ACCOUNT_JSON` as a secret environment variable. Do not put the service-account JSON in a committed `.env` file.

## 3. Configure AI evaluation (optional for Firebase question retrieval)

The current `evaluate.js` route uses the Anthropic SDK. To use that route, add this to `server/.env`:

```env
ANTHROPIC_API_KEY=your-api-key
```

Firebase-backed question retrieval and quiz checking do not require the Anthropic key.

## 4. Install, test, seed, and run the backend

```bash
cd server
npm install
npm test
npm run seed
npm start
```

The seed script now uses `QuestionRepository.upsertMany()` rather than calling Firestore directly. This keeps Firestore write behavior in the data-access layer as well.

The API defaults to `http://localhost:5001` and exposes:

- `GET /api/health`
- `GET /api/questions?mode=Quiz%20Style&jobRole=...&experienceLevel=...&practiceGoals=...`
- `POST /api/questions/:questionId/check` with `{ "answer": "..." }`
- `POST /api/evaluate`

## 5. Configure and run the React client

From the repository root, copy the React environment template:

```bash
cp .env.example .env.local
```

It should contain:

```env
REACT_APP_API_BASE_URL=http://localhost:5001/api
```

Then run:

```bash
npm install
npm start
```

Run the React client and the `server` process in separate terminals during development.

## 6. Firestore security rules

`firestore.rules` denies direct browser access because the application layer is responsible for database access. Firebase Admin on the backend uses IAM and does not depend on browser Firestore rules.

When Firebase Authentication is implemented, token verification middleware can be placed in the Express application before protected routes. The React pages will still use the same service/API boundary and will not need direct Firestore knowledge.

## Why this structure matters

Before this update, `questions.js` and `evaluate.js` directly imported Firebase Admin and performed Firestore reads/writes. That coupled application logic to Firestore.

After this update:

```text
questions.js  -> QuestionRepository -> FirestoreQuestionRepository -> Firestore
evaluate.js   -> EvaluationRepository -> FirestoreEvaluationRepository -> Firestore
```

A future database adapter could implement the same contracts without requiring changes to the route logic or React pages.
