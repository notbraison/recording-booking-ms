import { sql, getAllWindows } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await getAllWindows();
    return res.status(200).json(rows);
  }

  if (req.method === 'POST') {
    const { date, start, end } = req.body || {};
    if (!date || !start || !end || start >= end) {
      return res.status(400).json({ error: 'date, start, and end are required, and start must be before end' });
    }
    const id = 'w_' + Math.random().toString(36).slice(2, 10);
    await sql.query(
      `INSERT INTO windows (id, date, start_time, end_time) VALUES ($1, $2, $3, $4)`,
      [id, date, start, end]
    );
    return res.status(201).json({ id, date, start, end });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
