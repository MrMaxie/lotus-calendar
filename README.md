# Lotus Calendar - OAuth Microfrontend

A simple OAuth microfrontend for Google authentication built with Bun.

## Setup

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set Application Type to "Web application"
   - Add `http://localhost:3000/auth/callback` to Authorized redirect URIs
   - Copy the Client ID and Client Secret

2. **Set Environment Variables:**
   ```bash
   export GOOGLE_CLIENT_ID="your_client_id_here"
   export GOOGLE_CLIENT_SECRET="your_client_secret_here"
   ```

3. **Install Dependencies:**
   ```bash
   bun install
   ```

4. **Run the Server:**
   ```bash
   bun start
   ```

5. **Access the Application:**
   - Open http://localhost:3000 in your browser
   - Click "Sign in with Google"
   - Complete the OAuth flow

## Features

- Simple and clean login interface
- Google OAuth 2.0 authentication
- User session management
- Logout functionality
- Event-driven architecture for login state

## Routes

- `/` - Login page or logged-in user page
- `/auth/google` - Initiates Google OAuth flow
- `/auth/callback` - OAuth callback handler
- `/logout` - Logs out the user

## Architecture

The application uses:
- **Bun** for the runtime and HTTP server
- **@maxiedev/events** for event-driven communication
- **Google OAuth 2.0** for authentication
- **TypeScript** for type safety 