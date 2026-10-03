# EduVibe School App — PRD

## Problem statement
React Native (Expo) school app for students and admins with 30 modules — attendance,
circulars, homework, live class, fee payment/paid/due, library (search/history/request/new),
exam schedule/report, transport, leaves, messages, profile, SMS history, diary, events,
news, syllabus, timetable, teachers, projects, activity, notifications, help, birthdays.
Role-based: students view data, admin manages data. English / Hindi toggle. Soft peach/orange
"tactile playful" visual design.

## Architecture
- **Frontend**: Expo SDK 57, React Native, Expo Router (file-based routes).
- **Backend**: FastAPI + Motor (MongoDB) at port 8001, prefix `/api`.
- **Storage**: `expo-secure-store` for session token on native, localStorage on web.
- **Auth**: dual — Email/Password (bcrypt + random session token in `user_sessions`) and
  Emergent-managed Google OAuth (`/api/auth/session` → exchange `session_id` once).
- **Content**: generic `content_entries` collection keyed by `module_key` powers all 30 modules.

## Implemented (2026-02-07)
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/session`, `/api/auth/me`,
  `/api/auth/logout`. Sessions expire in 7 days (TTL index). Bearer token on every call.
- **Role-based gating**: root `index.tsx` redirects to `/student` or `/admin` based on `role`.
- **Student**:
  - `/app/student.tsx` — kid-friendly dashboard with hero, stats, categorized module grid
    (Quick tasks · Academics · Library · School updates · My account).
  - `module-detail.tsx` reads live content via `/api/content/{module_key}` for each module.
  - Attendance hero, Fee hero (with demo "Pay" flow), Profile, Leaves (apply + history),
    plus generic list rendering for all other modules.
- **Admin**:
  - `/app/admin.tsx` — stats, leave requests banner, 30 CMS tiles.
  - `/app/admin-module.tsx` — create / edit / delete entries for any module.
  - `/app/admin-leaves.tsx` — list all leave requests, approve/reject.
- **Design**: `src/theme.ts` filled from soft peach/orange tokens; no hex literals in screens.
- **i18n**: `useLanguage()` + persisted toggle for English/Hindi.
- **Seeds**: on startup, demo student (`student@eduvibe.com` / `student123`) and demo admin
  (`admin@eduvibe.com` / `admin123`); 30 modules × realistic sample content.

## Deferred backlog
### P1
- Real payment gateway integration (Stripe / Razorpay) with webhooks/receipts.
- Push notifications (Emergent-managed) once user runs native build.
- Real live-class provider link + attendance sync.
- Real SMS/messages provider integration.
- Transport GPS / live map.

### P2
- File / document uploads for homework and project submissions.
- Offline cache + report-card PDF.
- Parent account linked to student.
- Richer admin role granularity (per-module permissions).

## Known limitations
- Fee "Pay" button is still a demo preview. Admin needs to connect a real gateway.
- Live class, SMS and messages currently render admin-provided content, not real feeds.
- Google auth works only once the deployed URL is reachable; the Expo Go preview may need
  the hosted preview URL as the redirect origin.
