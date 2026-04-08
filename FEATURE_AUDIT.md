# Feature Audit (Assignment Matrix)

Date: 2026-04-08

## Requirement Coverage

### Authentication

- Register and login with email/password: implemented
- JWT-protected API routes: implemented
- Protected frontend route: implemented
- Stay logged in after refresh: implemented via token persistence

### Kanban Board

- Five columns (Applied, Phone Screen, Interview, Offer, Rejected): implemented
- Draggable cards across stages: implemented
- Card summary fields (company, role, date applied, status): implemented
- Click card for detail view: implemented

### AI Job Description Parser

- Paste JD and parse button: implemented
- Backend AI call returns structured JSON: implemented via Groq
- Extract company/role/required skills/nice-to-have/seniority/location: implemented
- Loading and error handling during parse: implemented

### AI Resume Suggestions

- Generate 3 to 5 role-specific bullet suggestions: implemented
- Copy button per suggestion: implemented

### Application Management

- Create application: implemented
- Edit application: implemented
- Delete application: implemented
- Fields coverage:
	- company: implemented
	- role: implemented
	- jd link: implemented
	- notes: implemented
	- date applied: implemented
	- status: implemented
	- salary range (optional): implemented

### Stack Alignment

- React + TypeScript + Tailwind: implemented
- Node + Express + TypeScript backend: implemented
- MongoDB + Mongoose: implemented
- JWT + bcrypt: implemented
- React Query state layer: implemented
- Groq AI integration (OpenAI-compatible API style): implemented

## Bonus Features Implemented

- Search and filter on the board
- Dashboard counters

## Quality Notes

- AI logic is isolated in a service layer.
- API keys are loaded from env files.
- Build and test workflows are passing.
- Lint has warnings only from pre-generated UI component patterns.

## Remaining Gaps (Minor)

- No CSV export yet
- No streaming AI output yet
- No reminder scheduler yet
- No dark mode switch yet
