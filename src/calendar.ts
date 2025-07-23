import { createDAVClient } from 'tsdav';
import { parseRecurrenceArray, type RecurrenceRule } from './rruleParser';

type User = {
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
};

// Cache for recurrence rules to avoid multiple API calls
const recurrenceCache = new Map<string, string[]>();

const getRecurrenceRules = async (user: User, recurringEventId: string): Promise<string[]> => {
  if (recurrenceCache.has(recurringEventId)) {
    return recurrenceCache.get(recurringEventId)!;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${recurringEventId}`,
      {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const eventData = await response.json() as {
        recurrence?: string[];
      };
      const rules = eventData.recurrence || [];
      recurrenceCache.set(recurringEventId, rules);
      return rules;
    }
  } catch (error) {
    console.error(`Failed to fetch recurrence rules for ${recurringEventId}:`, error);
  }

  return [];
};

export const fetchEvents = async (user: User) => {
  console.log('Connecting to Google Calendar...');
  
  // Fetch calendar list
  const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${user.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!calendarsResponse.ok) {
    throw new Error(`Failed to fetch calendars: ${calendarsResponse.statusText}`);
  }

  const calendarsData = await calendarsResponse.json() as {
    items: Array<{
      id: string;
      summary: string;
    }>;
  };
  const calendars = calendarsData.items || [];
  
  console.log(`Found ${calendars.length} calendars:`, calendars.map(c => c.summary));
  
  const allEvents = [];
  
  // Use a wider time range - last year to next year
  const startDate = new Date(new Date().getFullYear() - 1, 0, 1);
  const endDate = new Date(new Date().getFullYear() + 2, 0, 1);
  
  console.log(`Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  for (const calendar of calendars) {
    console.log(`Fetching events from calendar: ${calendar.summary} (${calendar.id})`);
    
    try {
      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?` +
        `timeMin=${startDate.toISOString()}&` +
        `timeMax=${endDate.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime&` +
        `maxResults=2500`,
        {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!eventsResponse.ok) {
        console.error(`Failed to fetch events from ${calendar.summary}: ${eventsResponse.statusText}`);
        continue;
      }

      const eventsData = await eventsResponse.json() as {
        items: Array<{
          id: string;
          summary?: string;
          description?: string;
          location?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          htmlLink?: string;
          recurrence?: string[];
          recurringEventId?: string;
        }>;
      };
      const events = eventsData.items || [];

      console.log(`Found ${events.length} events in ${calendar.summary}`);

      for (const event of events) {
        let recurrenceRules = event.recurrence || [];
        
        // If this is a recurring event instance, fetch the recurrence rules from the main event
        if (event.recurringEventId && !event.recurrence?.length) {
          console.log(`Fetching recurrence rules for ${event.summary} (${event.recurringEventId})`);
          recurrenceRules = await getRecurrenceRules(user, event.recurringEventId);
        }

        const eventInfo = {
          id: event.id,
          title: event.summary || 'No title',
          description: event.description || '',
          location: event.location || '',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          calendar: calendar.summary,
          calendarId: calendar.id,
          htmlLink: event.htmlLink,
          recurrence: recurrenceRules,
          recurrenceRules: parseRecurrenceArray(recurrenceRules),
          recurringEventId: event.recurringEventId,
        };

        console.log(`Parsed event: ${eventInfo.title} (recurrence: ${recurrenceRules.length} rules)`);
        allEvents.push(eventInfo);
      }
    } catch (error) {
      console.error(`Error fetching events from ${calendar.summary}:`, error);
    }
  }

  console.log(`Found ${allEvents.length} total events`);
  
  // Save events to .mem/events.json
  const eventsFile = Bun.file('.mem/events.json');
  await eventsFile.write(JSON.stringify(allEvents, null, 2));
  
  console.log('Events saved to .mem/events.json');
  
  return allEvents;
}; 