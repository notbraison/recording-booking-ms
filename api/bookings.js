import { sql, getAllBookings, getWindow, getBookingsForWindow } from '../lib/db.js';
import { buildSegments, validStartsInSegment, timeToMin } from '../lib/scheduling.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await getAllBookings();
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const {
      windowId, lecturerName, courseOrTopic, durationMinutes,
      equipment = [], requestedStart, note, scriptUrl,
    } = req.body || {};

    if (!windowId || !lecturerName || !courseOrTopic || !durationMinutes || !requestedStart) {
      return res.status(400).json({
        error: 'windowId, lecturerName, courseOrTopic, durationMinutes, and requestedStart are required',
      });
    }

    const win = await getWindow(windowId);
    if (!win) return res.status(404).json({ error: 'That window no longer exists' });

    // Re-derive availability server-side — never trust the client's math.
    const existing = await getBookingsForWindow(windowId);
    const segments = buildSegments(win, existing);
    const startMin = timeToMin(requestedStart);
    const fits = segments.some(
      seg => seg.type === 'free' && validStartsInSegment(seg, durationMinutes, equipment).includes(startMin)
    );
    if (!fits) {
      return res.status(409).json({
        error: 'That time is no longer free once setup/teardown buffers are counted. Pick another slot.',
      });
    }

    const id = 'b_' + Math.random().toString(36).slice(2, 10);
    await sql.query(
      `INSERT INTO bookings
         (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start, note, script_url)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)`,
      [id, windowId, lecturerName, courseOrTopic, durationMinutes, equipment, requestedStart, note || null, scriptUrl || null]
    );
    return res.status(201).json({ id, status: 'pending' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
