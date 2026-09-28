// Shared scheduling logic — the single source of truth for buffer and
// availability rules. Used by every API route so the DB never accepts a
// booking the UI wouldn't have allowed, and vice versa.

export const BASE_BUFFER = 10; // minutes, always reserved before AND after every session

export const EQUIPMENT = [
  { name: 'Camera only', extraSetup: 0 },
  { name: 'Lightboard', extraSetup: 15 },
  { name: 'Teleprompter', extraSetup: 15 },
  { name: 'Green screen', extraSetup: 10 },
];
export const EQUIPMENT_MAP = Object.fromEntries(EQUIPMENT.map(e => [e.name, e]));

// Standard session length is 2 hours; 1 hour is the common exception.
export const DURATIONS = [60, 90, 120];
export const STANDARD_DURATION = 120;

// The studio's usual recurring blocks, offered as quick-add presets.
export const WINDOW_PRESETS = [
  { label: '9:00–11:00', start: '09:00', end: '11:00' },
  { label: '11:00–13:00', start: '11:00', end: '13:00' },
  { label: '14:00–16:00', start: '14:00', end: '16:00' },
  { label: '14:30–16:30', start: '14:30', end: '16:30' },
];

export const ACTIVE_STATUSES = ['pending', 'approved', 'rescheduled'];

export const timeToMin = t => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const minToTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const setupBufferFor = equipmentNames => {
  const extras = (equipmentNames || []).map(n => (EQUIPMENT_MAP[n] ? EQUIPMENT_MAP[n].extraSetup : 0));
  return BASE_BUFFER + (extras.length ? Math.max(...extras) : 0);
};

// A booking's "effective" time is its proposed time once staff has
// rescheduled it, otherwise whatever the lecturer originally requested.
export const occupiedInterval = booking => {
  const coreStart = timeToMin(
    booking.status === 'rescheduled' && booking.proposedTime ? booking.proposedTime : booking.requestedStart
  );
  const coreEnd = coreStart + booking.durationMinutes;
  const setup = setupBufferFor(booking.equipment);
  return { blockStart: coreStart - setup, blockEnd: coreEnd + BASE_BUFFER, coreStart, coreEnd, setup, teardown: BASE_BUFFER };
};

/**
 * Splits a window into free / buffer / booking segments.
 * `excludeId` lets callers ask "what's free if this one booking weren't here"
 * (used for reschedule).
 */
export function buildSegments(win, bookings, excludeId) {
  const wStart = timeToMin(win.start);
  const wEnd = timeToMin(win.end);
  const active = (bookings || [])
    .filter(b => b.windowId === win.id && ACTIVE_STATUSES.includes(b.status) && b.id !== excludeId)
    .map(b => ({ ...occupiedInterval(b), booking: b }))
    .sort((a, b) => a.blockStart - b.blockStart);

  const segments = [];
  let cursor = wStart;
  for (const iv of active) {
    const setupStart = Math.max(iv.blockStart, wStart);
    const setupEnd = Math.min(iv.coreStart, wEnd);
    const coreStart = Math.max(iv.coreStart, wStart);
    const coreEnd = Math.min(iv.coreEnd, wEnd);
    const teardownStart = Math.max(iv.coreEnd, wStart);
    const teardownEnd = Math.min(iv.blockEnd, wEnd);
    if (setupStart > cursor) segments.push({ type: 'free', start: cursor, end: setupStart });
    if (setupEnd > setupStart) segments.push({ type: 'buffer', start: setupStart, end: setupEnd, booking: iv.booking });
    if (coreEnd > coreStart) segments.push({ type: 'booking', start: coreStart, end: coreEnd, booking: iv.booking });
    if (teardownEnd > teardownStart) segments.push({ type: 'buffer', start: teardownStart, end: teardownEnd, booking: iv.booking });
    cursor = Math.max(cursor, teardownEnd, coreEnd);
  }
  if (cursor < wEnd) segments.push({ type: 'free', start: cursor, end: wEnd });
  return segments;
}

export function validStartsInSegment(segment, durationMinutes, equipment) {
  const setup = setupBufferFor(equipment);
  const starts = [];
  for (let s = segment.start; s + durationMinutes <= segment.end; s += 15) {
    if (s - setup >= segment.start && s + durationMinutes + BASE_BUFFER <= segment.end) starts.push(s);
  }
  return starts;
}

export function possibleStartsInWindow(win, bookings, excludeId, durationMinutes, equipment) {
  const free = buildSegments(win, bookings, excludeId).filter(s => s.type === 'free');
  let starts = [];
  free.forEach(seg => {
    starts = starts.concat(validStartsInSegment(seg, durationMinutes, equipment));
  });
  return starts;
}
