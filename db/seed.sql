-- Sample data — safe to run repeatedly against a fresh/dev database.
-- Uses the studio's real recurring blocks: 9-11, 11-1, 2-4, 2:30-4:30.

delete from bookings;
delete from windows;

insert into windows (id, date, start_time, end_time) values
  ('w1', current_date,     '09:00', '11:00'),
  ('w2', current_date,     '14:00', '16:00'),
  ('w3', current_date + 1, '11:00', '13:00'),
  ('w4', current_date + 2, '09:00', '11:00'),
  ('w5', current_date + 2, '14:30', '16:30'),
  ('w6', current_date + 4, '09:00', '11:00');

-- w1 (09:00-11:00, 120 min standard): one approved session fills almost
-- the whole block once its buffer is counted.
insert into bookings (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start, script_url)
values ('b1', 'w1', 'Dr. Amara Osei', 'ECON 301: Market Failures', 120, '{Lightboard}', 'approved', '09:05',
        'https://docs.google.com/document/d/example-econ301');

-- w2 (14:00-16:00): a pending request for the standard 2hr block.
insert into bookings (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start, note, script_url)
values ('b2', 'w2', 'Dr. Wanjiru Kamau', 'BIO 110: Cell Structure', 120, '{Teleprompter}', 'pending', '14:00',
        'Two presenters, will need two lav mics.', 'https://docs.google.com/document/d/example-bio110');

-- w3 (11:00-13:00): a shorter 60min exception, pending.
insert into bookings (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start)
values ('b3', 'w3', 'Prof. James Muriuki', 'CS 220, Lecture 4 (short recap)', 60, '{"Camera only"}', 'pending', '11:00');

-- w4 (09:00-11:00): declined — frees the whole block back up.
insert into bookings (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start, note)
values ('b4', 'w4', 'Dr. Amara Osei', 'ECON 302: Recap Session', 60, '{"Camera only"}', 'declined', '09:00',
        'Room booked for maintenance that morning — please pick another slot.');

-- w5 (14:30-16:30): rescheduled by staff to fit alongside a later request.
insert into bookings (id, window_id, lecturer_name, course_or_topic, duration_minutes, equipment, status, requested_start, proposed_time, script_url)
values ('b5', 'w5', 'Prof. Samuel Otieno', 'PHYS 210: Optics Demo', 90, '{"Green screen"}', 'rescheduled', '14:30', '15:00',
        'https://docs.google.com/document/d/example-phys210');

-- w6: left fully open to demo booking a fresh 2hr standard slot end-to-end.
