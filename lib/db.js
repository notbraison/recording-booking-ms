// Wraps @vercel/postgres so routes import from one place. If you outgrow
// Vercel Postgres later, this is the only file that needs to change.
import { sql } from '@vercel/postgres';

export { sql };

const WINDOW_COLUMNS = `
  id,
  to_char(date, 'YYYY-MM-DD') as date,
  to_char(start_time, 'HH24:MI') as start,
  to_char(end_time, 'HH24:MI') as "end"
`;

const BOOKING_COLUMNS = `
  id,
  window_id as "windowId",
  lecturer_name as "lecturerName",
  course_or_topic as "courseOrTopic",
  duration_minutes as "durationMinutes",
  equipment,
  status,
  to_char(requested_start, 'HH24:MI') as "requestedStart",
  to_char(proposed_time, 'HH24:MI') as "proposedTime",
  note,
  script_url as "scriptUrl",
  created_at as "createdAt"
`;

export async function getWindow(windowId) {
  const { rows } = await sql.query(`SELECT ${WINDOW_COLUMNS} FROM windows WHERE id = $1`, [windowId]);
  return rows[0];
}

export async function getAllWindows() {
  const { rows } = await sql.query(`SELECT ${WINDOW_COLUMNS} FROM windows ORDER BY date, start_time`);
  return rows;
}

export async function getBookingsForWindow(windowId) {
  const { rows } = await sql.query(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE window_id = $1`, [windowId]);
  return rows;
}

export async function getAllBookings() {
  const { rows } = await sql.query(`SELECT ${BOOKING_COLUMNS} FROM bookings ORDER BY created_at DESC`);
  return rows;
}

export async function getBookingById(id) {
  const { rows } = await sql.query(`SELECT ${BOOKING_COLUMNS} FROM bookings WHERE id = $1`, [id]);
  return rows[0];
}
