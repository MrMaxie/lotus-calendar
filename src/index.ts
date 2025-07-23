import { oauthServer, waitForLoggedIn } from './oauthServer';

const main = async () => {
  console.log('Starting Lotus Calendar OAuth server...');
  
  await oauthServer();
  
  console.log('Waiting for user to log in...');
  const [user] = await waitForLoggedIn();
  
  console.log(`User logged in: ${user.name} (${user.email})`);
  console.log('OAuth flow completed successfully!');
  
  
};

main();
