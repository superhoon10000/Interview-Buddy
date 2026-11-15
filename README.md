# Interview Buddy

**Interview Buddy** is a full-stack web application for practicing technical interviews, receiving feedback, and tracking progress over time. Users can complete interviews in multiple formats, review saved results, connect with friends, and compare their performance on ELO-based leaderboards.

Built with **React**, **Node.js/Express**, **Firebase Authentication**, **Cloud Firestore**, and an **Anthropic-powered AI evaluation service**.

---

## Features

- **Accounts and profiles:** Email/password and Google sign-in, email verification, password recovery, profile and settings management, and account deletion.
- **Three interview modes:**
  - **Quiz Style:** Multiple-choice questions checked against server-side answer keys.
  - **Code Style:** Programming responses entered in a code editor and evaluated against private grading rubrics.
  - **Theoretical Style:** Written explanations evaluated against private grading rubrics.
- **Personalized practice:** Interview setup options include job roles, experience levels, and question topics/tags.
- **Saved interviews:** Persistent session progress, completed interview results, feedback, and interview history.
- **Performance tracking:** Analytics based on saved completed sessions, including average scores, progress over time, and performance by interview mode.
- **Rankings and friends:** ELO-based global and friends leaderboards, personal ranking, friend requests, and friendship management.
- **Security and quality checks:** Authenticated API routes, server-side data access, API rate limiting, automated tests, linting, and CI/CD validation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router, Create React App, CodeMirror |
| Backend | Node.js 24, Express 4 |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore, accessed through backend repository adapters |
| AI evaluation | Anthropic SDK through a provider abstraction |
| Hosting | Firebase Hosting (frontend), Google Cloud Run (API) |
| Automation | GitHub Actions, Jest, React Testing Library, ESLint |

## Project Structure

```text
Interview-Buddy/
├── .github/workflows/     # CI, production deployment, PR previews
├── docs/                  # Architecture and deployment documentation
├── functions/             # Firebase Cloud Functions
├── public/                # Static assets
├── scripts/               # Metadata, validation, and smoke-test scripts
├── server/
│   ├── scripts/           # Backend maintenance and question seeding
│   ├── seed/              # Interview question seed data
│   └── src/
│       ├── middleware/    # Authentication and rate limiting
│       ├── repositories/  # Firestore adapters and contracts
│       ├── routes/        # Express API endpoints
│       └── services/      # Business logic and AI integration
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # Authentication and theme context
│   ├── pages/             # Application screens
│   ├── services/          # Frontend API/service layer
│   └── utils/             # Routing, metrics, and helpers
├── .env.example           # Frontend environment template
└── package.json           # Frontend scripts and dependencies
```

## Firebase-backed interview questions

Interview Buddy uses a backend question API that reads from Firebase Cloud Firestore instead of hardcoding interview prompts in `InterviewSessionPage.js`.

See [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) for Firebase credentials, seeding, and local run instructions. The React page calls the existing `src/services/interviewService.js` facade, which talks to the Express application layer; the browser does not access Firestore or quiz answer keys directly.

Code Style and Theoretical Style use the provider-independent AI evaluation service and repository layers for weighted evaluation. See [`AI_GRADING_SETUP.md`](AI_GRADING_SETUP.md) for the request flow, private rubric schema, and provider configuration.

## Repository/data-access layer

The Firebase backend now uses explicit repository contracts and concrete Firestore adapters. Express routes do not call Firestore directly.

See [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) for configuration instructions.

---

## Getting Started

### Prerequisites

- **Node.js 24** and npm (the GitHub Actions pipeline uses npm 11).
- A **Firebase project** with Firebase Authentication and Cloud Firestore configured.
- Access to a **Firebase service account** or other supported Google Application Default Credentials for the local backend.
- An **Anthropic API key** if you want to run AI-graded Code Style or Theoretical Style evaluations.

### 1. Clone and install dependencies

```bash
git clone https://github.com/superhoon10000/Interview-Buddy.git
cd Interview-Buddy
npm ci
cd server
npm ci
cd ..
```

The frontend and backend have separate `package.json` and `package-lock.json` files, so both need dependencies installed.

### 2. Set up the frontend environment

Copy the example environment file into `.env.local` from the project root:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead.

Fill in the Firebase Web SDK values from your Firebase project settings:

```dotenv
REACT_APP_API_BASE_URL=http://localhost:5001/api
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Set up the backend environment

Copy the server environment template:

```bash
cp server/.env.example server/.env
```

On Windows PowerShell, use `Copy-Item server/.env.example server/.env` instead.

At minimum, configure the local API and Firebase project:

```dotenv
PORT=5001
FIREBASE_PROJECT_ID=your_project_id
CLIENT_ORIGIN=http://localhost:3000
```

For AI-graded interview modes, also configure:

```dotenv
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-6
```

The backend uses Firebase Admin credentials. Point `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON file **stored outside the repository**:

**macOS / Linux:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/service-account.json"
```

**Windows PowerShell:**

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
```

Set this in the terminal that runs the backend. Do not commit service-account files, API keys, or environment files containing secrets.

For more configuration options, see [`server/.env.example`](server/.env.example), [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md), and [`AI_GRADING_SETUP.md`](AI_GRADING_SETUP.md).

### 4. Prepare interview questions (if needed)

If your chosen Firestore project does not already contain the question dataset, you can seed it from the backend directory:

```bash
cd server
npm run seed
cd ..
```

**Important:** Seeding writes to the Firebase project configured by your credentials. Confirm the project before running it, especially when using a shared or production database.

### 5. Run the application

Start the backend in one terminal:

```bash
cd server
npm start
```

Start the frontend in a second terminal, from the repository root:

```bash
npm start
```

| Service | Local address |
| --- | --- |
| React frontend | http://localhost:3000 |
| Express API | http://localhost:5001 |
| API health endpoint | http://localhost:5001/api/health |

The React app calls the Express backend through `REACT_APP_API_BASE_URL`. API requests that require an account use a Firebase ID token; Firestore and private grading data remain on the server.

## Testing and Development Commands

**Frontend** — run from the repository root:

```bash
npm start                           # Run React locally
npm test -- --watchAll=false        # Run frontend tests once
npm run lint                        # Lint frontend source
npm run build                       # Create production build in build/
npm run generate:metadata           # Regenerate question setup metadata
```

**Backend** — run from `server/`:

```bash
npm start                           # Start the Express API
npm run dev                         # Start with nodemon
npm test -- --runInBand             # Run backend Jest tests
npm run lint                        # Lint backend source
npm run seed                        # Seed interview questions in Firestore
```

Additional Firestore Emulator, security assessment, session integration, and deployment smoke-test commands are available in the repository scripts and documentation. Some require Java, Firebase emulators, credentials, or a deployed environment.

## Architecture

```text
React client
    |
    | Firebase Authentication ID token
    v
Express API (/api/*)
    |
    +-- Authentication, authorization, and rate limits
    +-- Interview/session and grading services
    +-- Repository contracts and Firestore adapters --> Cloud Firestore
    +-- AI provider adapter --> Anthropic API
```

The application uses backend repository adapters for database access. Quiz answer keys, AI reference answers, and grading criteria are not intended to be exposed by client-facing question retrieval endpoints.

Key API areas include `/api/users`, `/api/questions`, `/api/sessions`, `/api/evaluate`, `/api/leaderboard`, and `/api/friends`.

## CI/CD and Deployment

GitHub Actions workflows are located in [`.github/workflows/`](.github/workflows/):

- **`ci.yml`:** Runs on pull requests to and pushes on `main`. Checks frontend and backend lint/tests, question data and metadata validation, security tests, production builds, and dependency audit reports. Dependency audit findings are reported but do not, by themselves, fail this workflow.
- **`cd.yml`:** Deploys after a successful `main` CI run, using the tested frontend build artifact, then validates the deployed backend and frontend.
- **`firebase-hosting-pull-request.yml`:** Provides Firebase Hosting pull-request preview deployments.

Production uses **Firebase Hosting** for the React app and **Google Cloud Run** for the Express API. Firebase Hosting rewrites `/api/**` requests to the Cloud Run service, keeping frontend and API calls under the same hosting origin.

CI builds use an identifier in the form `IB-build-<run>.<attempt>-<short-sha>` for release traceability.

Deployment setup and verification details are documented in:

- [Hosting and architecture decision](docs/DEPLOYMENT_HOSTING_DECISION.md)
- [Deployment workflow](docs/DEPLOYMENT_WORKFLOW.md)
- [Post-deployment validation](docs/POST_DEPLOYMENT_VALIDATION.md)

The production pipeline publishes the frontend artifact produced by passing main-branch CI, deploys the Cloud Run API from the same commit, and verifies matching build metadata after deployment. Run `node scripts/smoke-test.mjs` with the environment variables described in the validation document when checking a live deployment.

## Additional Documentation

- [Running the project](RUN_PROJECT.md)
- [Firebase and repository setup](FIREBASE_SETUP.md)
- [AI grading integration](AI_GRADING_SETUP.md)
- [Code Style evaluation](CODE_STYLE_EVALUATION.md)
- [Grading consistency](GRADING_CONSISTENCY.md)
- [Session scoring](SESSION_SCORING.md)
- [Firestore indexes and data integrity](docs/FIRESTORE_INDEXES_AND_INTEGRITY.md)

## Troubleshooting

- **Firebase configuration error:** Confirm that the client `.env.local` contains the `REACT_APP_FIREBASE_*` values and restart the frontend dev server after changes.
- **Authentication or Firestore errors:** Verify the Firebase project, enabled sign-in providers, and backend service-account credentials.
- **API connection error:** Confirm the backend is running on port `5001` and `REACT_APP_API_BASE_URL` points to `http://localhost:5001/api`.
- **AI evaluation unavailable:** Confirm that `ANTHROPIC_API_KEY`, `AI_PROVIDER`, and the selected model are configured in `server/.env`.
- **No interview questions available:** Verify that the selected Firebase project contains the question data and that the signed-in account can access the application.
