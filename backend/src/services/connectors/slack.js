/**
 * Mock Slack Metadata Connector
 * Generates channel activity metadata only — no message content (privacy first).
 */

const CHANNELS = [
  { name: '#general', activity: 'high' },
  { name: '#engineering', activity: 'high' },
  { name: '#onboarding', activity: 'medium' },
  { name: '#random', activity: 'medium' },
  { name: '#dev-ops', activity: 'low' },
  { name: '#design', activity: 'low' },
  { name: '#announcements', activity: 'low' },
  { name: '#help-desk', activity: 'medium' },
];

/**
 * Generate mock Slack metadata events for a time range.
 * Privacy first: only channel activity counts, no message content.
 */
export function generateSlackEvents({ actors, startDate, endDate }) {
  const events = [];
  const dayMs = 86400000;
  const days = Math.ceil((endDate - startDate) / dayMs);

  for (let d = 0; d < days; d++) {
    const dayStart = new Date(startDate.getTime() + d * dayMs);
    const dow = dayStart.getDay();
    if (dow === 0 || dow === 6) continue;

    for (const actor of actors) {
      // Each person is active in 2-4 channels per day
      const activeChannels = Math.floor(Math.random() * 3) + 2;
      const shuffled = [...CHANNELS].sort(() => Math.random() - 0.5).slice(0, activeChannels);

      // New hires are more active in #onboarding
      if (actor.role === 'new_hire') {
        const onboarding = CHANNELS.find(c => c.name === '#onboarding');
        if (onboarding && !shuffled.includes(onboarding)) shuffled[0] = onboarding;
      }

      for (const channel of shuffled) {
        const baseMsgs = channel.activity === 'high' ? 8 : channel.activity === 'medium' ? 4 : 2;
        const msgCount = Math.max(1, Math.round(baseMsgs + (Math.random() - 0.5) * baseMsgs));
        const reactions = Math.floor(Math.random() * msgCount * 0.5);
        const threads = Math.floor(Math.random() * msgCount * 0.3);

        const timestamp = new Date(dayStart);
        timestamp.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

        events.push({
          source: 'slack',
          event_type: 'channel_activity',
          actor_id: actor.id,
          actor_name: actor.name,
          timestamp: timestamp.toISOString(),
          metadata: {
            channel: channel.name,
            message_count: msgCount,
            reaction_count: reactions,
            thread_count: threads,
          },
        });
      }
    }
  }

  return events;
}
