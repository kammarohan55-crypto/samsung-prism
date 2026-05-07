/**
 * Mock Google Calendar Connector
 * Generates realistic meeting events with duration and attendee counts.
 */

const MEETING_TYPES = [
  { title: 'Daily Standup', duration: 15, recurring: true, freq: 5 },
  { title: 'Sprint Planning', duration: 60, recurring: true, freq: 0.5 },
  { title: 'Sprint Retrospective', duration: 45, recurring: true, freq: 0.5 },
  { title: 'Team Sync', duration: 30, recurring: true, freq: 2 },
  { title: '1:1 with Manager', duration: 30, recurring: true, freq: 1 },
  { title: 'Design Review', duration: 45, recurring: false },
  { title: 'Code Review Session', duration: 30, recurring: false },
  { title: 'Architecture Discussion', duration: 60, recurring: false },
  { title: 'All-Hands Meeting', duration: 60, recurring: true, freq: 0.25 },
  { title: 'Onboarding Session', duration: 45, recurring: false },
  { title: 'Training Workshop', duration: 90, recurring: false },
  { title: 'Interview Panel', duration: 60, recurring: false },
  { title: 'Project Kickoff', duration: 60, recurring: false },
  { title: 'Bug Triage', duration: 30, recurring: true, freq: 1 },
];

/**
 * Generate mock Calendar events for a time range.
 * @param {Object} opts
 * @param {Object[]} opts.actors - [{id, name, role}]
 * @param {Date} opts.startDate
 * @param {Date} opts.endDate
 * @param {number} opts.meetingsPerDay - Average meetings per person per day
 * @returns {Array} Normalized events
 */
export function generateCalendarEvents({ actors, startDate, endDate, meetingsPerDay = 3 }) {
  const events = [];
  const dayMs = 86400000;
  const days = Math.ceil((endDate - startDate) / dayMs);

  for (const actor of actors) {
    // Managers get more meetings
    const multiplier = ['manager', 'team_lead', 'hr'].includes(actor.role) ? 1.5 : 1;
    const dailyMeetings = Math.round(meetingsPerDay * multiplier);

    for (let d = 0; d < days; d++) {
      const dayStart = new Date(startDate.getTime() + d * dayMs);
      const dow = dayStart.getDay();
      if (dow === 0 || dow === 6) continue;

      const todayCount = Math.max(1, Math.round(dailyMeetings + (Math.random() - 0.5) * 2));

      for (let i = 0; i < todayCount; i++) {
        const meeting = MEETING_TYPES[Math.floor(Math.random() * MEETING_TYPES.length)];
        const hour = 9 + Math.floor(Math.random() * 8);
        const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        const timestamp = new Date(dayStart);
        timestamp.setHours(hour, minute, 0, 0);

        const attendeeCount = Math.floor(Math.random() * 8) + 2;

        events.push({
          source: 'calendar',
          event_type: 'meeting',
          actor_id: actor.id,
          actor_name: actor.name,
          timestamp: timestamp.toISOString(),
          metadata: {
            title: meeting.title,
            duration_min: meeting.duration,
            attendee_count: attendeeCount,
            is_recurring: meeting.recurring || false,
            is_focus_time: false,
          },
        });
      }
    }

    // Add some focus time blocks
    for (let d = 0; d < days; d++) {
      const dayStart = new Date(startDate.getTime() + d * dayMs);
      if (dayStart.getDay() === 0 || dayStart.getDay() === 6) continue;

      if (Math.random() < 0.3) {
        const timestamp = new Date(dayStart);
        timestamp.setHours(14, 0, 0, 0);
        events.push({
          source: 'calendar',
          event_type: 'focus_time',
          actor_id: actor.id,
          actor_name: actor.name,
          timestamp: timestamp.toISOString(),
          metadata: { title: 'Focus Time', duration_min: 120, is_focus_time: true },
        });
      }
    }
  }

  return events;
}
