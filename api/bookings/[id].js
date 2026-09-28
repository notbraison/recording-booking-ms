import { sql, getBookingById, getWindow, getBookingsForWindow } from '../../lib/db.js';
import { possibleStartsInWindow, timeToMin } from '../../lib/scheduling.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const booking = await getBookingById(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { action, proposedTime, note } = req.body || {};

  if (action === 'approve') {
    await sql.query(`UPDATE bookings SET status = 'approved', updated_at = now() WHERE id = $1`, [id]);
    return res.status(200).json({ status: 'approved' });
  }

  if (action === 'decline') {
    await sql.query(`UPDATE bookings SET status = 'declined', note = $2, updated_at = now() WHERE id = $1`, [id, note || null]);
    return res.status(200).json({ status: 'declined' });
  }

  if (action === 'reschedule') {
    if (!proposedTime) return res.status(400).json({ error: 'proposedTime is required' });

    const win = await getWindow(booking.windowId);
    if (!win) return res.status(404).json({ error: 'Window not found' });

    const siblings = (await getBookingsForWindow(booking.windowId)).filter(b => b.id !== id);
    const valid = possibleStartsInWindow(win, siblings, null, booking.durationMinutes, booking.equipment);
    if (!valid.includes(timeToMin(proposedTime))) {
      return res.status(409).json({ error: 'That time no longer fits in the window once buffers are counted. Pick another.' });
    }

    await sql.query(
      `UPDATE bookings SET status = 'rescheduled', proposed_time = $2, updated_at = now() WHERE id = $1`,
      [id, proposedTime]
    );
    return res.status(200).json({ status: 'rescheduled', proposedTime });
  }

  return res.status(400).json({ error: 'action must be "approve", "decline", or "reschedule"' });
}
