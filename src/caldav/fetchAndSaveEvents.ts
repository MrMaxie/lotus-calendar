import { parseRecurrenceArray } from '../rruleParser';
import context from './caldavContext';

// Cache for recurrence rules to avoid multiple API calls
const recurrenceCache = new Map<string, string[]>();

const getRecurrenceRules = async (recurringEventId: string): Promise<string[]> => {
  if (recurrenceCache.has(recurringEventId)) {
    return recurrenceCache.get(recurringEventId)!;
  }

  const user = context.getUser();

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

export const fetchAndSaveEvents = async () => {
  const user = context.getUser();
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
  
  // Update context with calendars
  context.set('calendars', calendars);
  
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
          extendedProperties?: {
            private?: Record<string, string>;
            shared?: Record<string, string>;
          };
        }>;
      };
      const events = eventsData.items || [];

      console.log(`Found ${events.length} events in ${calendar.summary}`);

      for (const event of events) {
        let recurrenceRules = event.recurrence || [];
        
        // If this is a recurring event instance, fetch the recurrence rules from the main event
        if (event.recurringEventId && !event.recurrence?.length) {
          console.log(`Fetching recurrence rules for ${event.summary} (${event.recurringEventId})`);
          recurrenceRules = await getRecurrenceRules(event.recurringEventId);
        }

        // Collect extended properties into 'x' field
        const x: Record<string, any> = {};
        if (event.extendedProperties) {
          if (event.extendedProperties.private) {
            x.private = event.extendedProperties.private;
          }
          if (event.extendedProperties.shared) {
            x.shared = event.extendedProperties.shared;
          }
        }

        const eventInfo = {
          id: event.id,
          title: event.summary || 'No title',
          description: event.description || '',
          location: event.location || '',
          start: event.start?.dateTime || event.start?.date || '',
          end: event.end?.dateTime || event.end?.date || '',
          calendar: calendar.summary,
          calendarId: calendar.id,
          htmlLink: event.htmlLink,
          recurrence: recurrenceRules,
          recurrenceRules: parseRecurrenceArray(recurrenceRules),
          recurringEventId: event.recurringEventId,
          x,
        };

        console.log(`Parsed event: ${eventInfo.title} (recurrence: ${recurrenceRules.length} rules, x-fields: ${Object.keys(x).length})`);
        allEvents.push(eventInfo);
      }
    } catch (error) {
      console.error(`Error fetching events from ${calendar.summary}:`, error);
    }
  }

  console.log(`Found ${allEvents.length} total events`);
  
  // Update context with events
  context.set('events', allEvents);
  
  // Save events to .mem/events.json
  const eventsFile = Bun.file('.mem/events.json');
  await eventsFile.write(JSON.stringify(allEvents, null, 2));
  
  console.log('Events saved to .mem/events.json');
  
  return allEvents;
}; 