# SkillPath

SkillPath compares a student's current skills against real hiring demand across 14 career fields (pan-India), highlights the skill gap, and uses Google's Gemini AI to generate personalized advice on what to learn next. It also includes a policymaker-facing dashboard showing aggregate demand trends across fields.

**Live demo:** https://skillpath-v.vercel.app/
**Backend API:** https://skillpath-backend-8swv.onrender.com/api/fields

> Note: the hiring-demand dataset is seeded/illustrative data for demo purposes, not live-scraped labor market data. Core matching and AI advice are fully functional and live.

## Features

- Skill-gap analysis: enter your skills, get matched to the best-fit career field
- Real-time AI advice via Gemini API on what to learn next and why
- Policymaker view: aggregate demand distribution and biggest cross-field skill gaps
- Free-resource course recommendations per field

## Tech stack

- **Frontend:** Next.js (React), deployed on Vercel
- **Backend:** Spring Boot (Java 21), deployed on Render via Docker
- **AI:** Google Gemini API (gemini-3.8-flash)

## Running locally

### Backend

```bash
cd backend
./mvnw clean install
```

Add your Gemini key to `src/main/resources/application-secrets.properties`:

```properties
gemini.api.key=YOUR_KEY
```

Then run:

```bash
./mvnw spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

- `backend/` — Spring Boot REST API: skill-matching logic, Gemini integration, aggregate analytics
- `frontend/` — Next.js app: landing page, skill input form, results dashboard, policymaker dashboard