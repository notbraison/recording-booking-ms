# Rundown — studio booking (prototype)

Replaces phone-call scheduling between lecturers and media staff with a
calendar-based intake system. Plain static frontend (no build step) +
Vercel serverless functions + Postgres. Deliberately minimal — this is
meant to be easy to read and change, not a framework showcase.

## How it's organized

```
index.html          the whole frontend (React via CDN, no build step)
api/windows.js       GET/POST recording windows
api/bookings.js      GET/POST booking requests (validates buffers server-side)
api/bookings/[id].js PATCH a booking: approve / decline / reschedule
lib/scheduling.js    buffer + availability logic shared by every API route
lib/db.js            thin Postgres query wrapper
db/schema.sql         table definitions
db/seed.sql            sample data matching the studio's real time blocks
```

The frontend duplicates a small copy of the buffer-math functions from
`lib/scheduling.js` for instant UI feedback (e.g. filtering which start
times to offer). The API re-checks everything itself before writing to the
database, so the duplication is a UX nicety, not a trust boundary — if you
change a rule (say, the base buffer), update it in both places, or wire the
frontend up to a bundler later and import the one copy.

## Business rules encoded here

- Standard session length is **2 hours**; 1 hour is the common exception
  (durations offered: 60 / 90 / 120 min).
- The studio's usual recurring blocks — **9–11, 11–1, 2–4, 2:30–4:30** —
  are offered as one-click presets when staff define a window, though any
  custom range works too.
- A flat **10-minute buffer** is reserved before and after every booking.
  Lightboard and teleprompter add **+15 min** setup, green screen **+10
  min** — see `EQUIPMENT` in `lib/scheduling.js` to change these.
- Every request needs a manual Approve / Decline / Reschedule from media
  staff — nothing auto-confirms, even into an apparently open slot.
- A **script link** field replaces emailing the script separately — add a
  Google Doc/Drive link when booking. (No email notifications are wired up
  yet; see "Next steps" below.)

## Local setup

1. **Install the Vercel CLI** if you don't have it: `npm i -g vercel`
2. **Install dependencies**: `npm install`
3. **Link the project**: `vercel link` (creates a new Vercel project, or
   links to an existing one)
4. **Create a Postgres database**: in the Vercel dashboard, open this
   project → **Storage** tab → **Create Database** → **Postgres**. This
   automatically wires the connection env vars into the project.
5. **Pull env vars locally**: `vercel env pull .env.development.local`
   (populates `POSTGRES_URL`, matching `.env.example`)
6. **Run the schema and seed data** against that database. Easiest path:
   open the **Storage → Query** tab in the Vercel dashboard and paste in
   `db/schema.sql`, then `db/seed.sql`. (Or, if you have `psql` installed:
   `psql "$POSTGRES_URL" -f db/schema.sql && psql "$POSTGRES_URL" -f db/seed.sql`)
7. **Run it locally**: `vercel dev` — serves the frontend and `/api`
   functions together on one origin (needed so `fetch('/api/...')` works
   without CORS setup). Open the printed localhost URL.

## Deploying

```
vercel deploy --prod
```

Vercel builds nothing (there's no bundler) — it just uploads `index.html`
as a static file and each file under `api/` as its own serverless
function. As long as the linked project has the same Postgres database
connected, production uses the same schema you set up locally.

## Next steps, roughly in the order I'd tackle them

1. **Re-seed protection** — `db/seed.sql` deletes all rows first, so don't
   run it against real data once staff start using this for real.
2. **Notifications** — right now status changes only show up if someone's
   looking at the page. The natural next step is emailing lecturers when
   their request is approved/declined/rescheduled (e.g. via Resend or
   Nodemailer) and notifying media staff when a new request lands. Add a
   `notify()` call at the point each `api/bookings*.js` route changes
   status.
3. **Auth** — "who you are" is just a text field right now. Swap in
   whatever your institution already uses (Google Workspace SSO is a
   natural fit if lecturers already have institutional Google accounts).
4. **Multi-room / multi-equipment inventory** — the data model assumes one
   shared resource pool. If you outgrow that, `windows` would gain a
   `resource_id`, and equipment would need its own table with quantities,
   so two lecturers can't both book the one teleprompter at once.
5. **Google/Outlook + Moodle sync** — once the core workflow is validated,
   an approved booking is a natural trigger to push a calendar event, and
   a Moodle course ID would slot into `bookings` alongside `course_or_topic`.
