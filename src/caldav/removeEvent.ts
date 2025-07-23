import context from './caldavContext';

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  calendar: string;
  calendarId: string;
  htmlLink?: string;
  recurrence: string[];
  recurrenceRules: any[];
  recurringEventId?: string;
  x: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
};

export const removeEvent = async (id: string): Promise<void> => {
  const user = context.getUser();
  console.log(`Removing event with ID: ${id}`);
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to remove event: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`Event ${id} removed successfully`);
  } catch (error) {
    console.error('Error removing event:', error);
    throw error;
  }
};

export const removeAllLotusEvents = async (): Promise<void> => {
  console.log('Searching for events with isLotus=true...');
  
  // Get events from context
  const events = context.get('events') as Event[] || [];

  const lotusEvents = events.filter(event => 
    event.x?.private?.isLotus === 'true'
  );

  console.log(`Found ${lotusEvents.length} events with isLotus=true`);

  // Remove all lotus events
  for (const event of lotusEvents) {
    console.log(`Removing lotus event: ${event.title} (${event.id})`);
    await removeEvent(event.id);
  }

  console.log(`Successfully removed ${lotusEvents.length} lotus events`);
}; 