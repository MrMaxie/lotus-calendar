import context from './caldavContext';
import { DateTime } from 'luxon';

export const createEvent = async (options: { title: string; date: Date }): Promise<string> => {
  const user = context.getUser();
  console.log(`Creating event: ${options.title} for date: ${options.date.toISOString()}`);
  
  // Format date for all-day event (YYYY-MM-DD) using local date with Luxon
  const dateTime = DateTime.fromJSDate(options.date);
  const dateStr = dateTime.toFormat('yyyy-MM-dd');
  
  // Add current time to event title
  const now = DateTime.now();
  const timeStr = now.toFormat('HH:mm');
  const eventTitle = `🐶🐶${timeStr} - ${options.title}`;
  
  const eventData = {
    summary: eventTitle,
    start: {
      date: dateStr
    },
    end: {
      date: dateStr
    },
    extendedProperties: {
      private: {
        'isLotus': 'true'
      }
    }
  };

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create event: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const createdEvent = await response.json() as { id: string };
    console.log(`Event created successfully with ID: ${createdEvent.id}`);
    
    return createdEvent.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}; 