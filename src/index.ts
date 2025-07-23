import { oauthServer, waitForLoggedIn } from './oauthServer';
import { context, fetchAndSaveEvents, createEvent, removeAllLotusEvents } from './caldav';

const main = async () => {
  console.log('Starting Lotus Calendar OAuth server...');
  
  await oauthServer();
  
  console.log('Waiting for user to log in...');
  const [user] = await waitForLoggedIn();
  
  console.log(`User logged in: ${user.name} (${user.email})`);
  console.log('OAuth flow completed successfully!');
  
  // Initialize caldav context
  console.log('Initializing CalDAV context...');
  context.set('user', user);
  context.set('isInitialized', true);
  
  // Fetch events
  console.log('Fetching calendar events...');
  const events = await fetchAndSaveEvents();
  
  console.log(`Successfully fetched ${events.length} events`);
  
  // Remove all existing lotus events
  console.log('\n=== Removing All Lotus Events ===');
  await removeAllLotusEvents();
  
  // Create new lotus event for today
  console.log('\n=== Creating New Lotus Event ===');
  const today = new Date();
  const eventId = await createEvent({
    title: 'Testowy event',
    date: today
  });
  
  console.log(`Created new lotus event with ID: ${eventId}`);
  console.log('Event operations completed successfully!');
};

main();
