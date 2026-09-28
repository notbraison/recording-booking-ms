-- Rundown — studio booking schema
-- Run this once against your Vercel Postgres database before first use.

create table if not exists windows (
  id text primary key,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint window_time_order check (start_time < end_time)
);

create table if not exists bookings (
  id text primary key,
  window_id text not null references windows(id) on delete cascade,
  lecturer_name text not null,
  course_or_topic text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  equipment text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'rescheduled')),
  requested_start time not null,
  proposed_time time,        -- set only when status = 'rescheduled'
  note text,                 -- lecturer's note, or staff's decline reason
  script_url text,           -- link to the recording script (replaces emailing it separately)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_window on bookings(window_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_lecturer on bookings(lecturer_name);
