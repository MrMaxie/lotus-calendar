import { createEventEmitter } from '@maxiedev/events';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server';
import Login from './components/Login';
import LoggedIn from './components/LoggedIn';

const context = (() => {
  const innerContext = {
    loggedAs: null as ({
      email: string;
      name: string;
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
      scope: string;
    } | null),
    clientId: Bun.env.GOOGLE_CLIENT_ID,
    clientSecret: Bun.env.GOOGLE_CLIENT_SECRET,
  };

  const save = async () => {
    const file = Bun.file('.mem/currentSession.json');
    await file.write(JSON.stringify({
      loggedAs: innerContext.loggedAs,
    }, null, 2));
  };

  return {
    get<Key extends keyof typeof innerContext>(key: Key): typeof innerContext[Key] {
      return innerContext[key];
    },
    set<Key extends keyof typeof innerContext>(key: Key, value: typeof innerContext[Key]) {
      innerContext[key] = value;
      save();
    },
    load: async () => {
      try {
        const file = Bun.file('.mem/currentSession.json');
        const json = await file.json();
        innerContext.loggedAs = json.loggedAs;
      } catch {}
    },
  };
})();

const ee = createEventEmitter<{
  loggedIn: [user: {
    email: string;
    name: string;
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    scope: string;
  }];
  loggedOut: [];
}>();

export const oauthServer = async () => {
  await context.load();

  const server = Bun.serve({
    port: 3000,
    routes: {
      '/': async () => {
        const loggedAs = context.get('loggedAs');

        if (loggedAs) {
          const stream = await renderToReadableStream(
            React.createElement(LoggedIn, {
              name: loggedAs.name,
              email: loggedAs.email,
            })
          );
          return new Response(stream, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        const stream = await renderToReadableStream(
          React.createElement(Login)
        );
        return new Response(stream, {
          headers: { 'Content-Type': 'text/html' }
        });
      },
      '/auth/google': async () => {
        const clientId = context.get('clientId')!;

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent('http://localhost:3000/auth/callback')}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events')}&` +
          `access_type=offline`;

        return new Response('', {
          status: 302,
          headers: { Location: authUrl }
        });
      },
      '/auth/callback': async (req) => {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        if (!code) {
          return new Response('Authorization code not found', { status: 400 });
        }

        try {
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              client_id: context.get('clientId')!,
              client_secret: context.get('clientSecret')!,
              code,
              grant_type: 'authorization_code',
              redirect_uri: 'http://localhost:3000/auth/callback',
            }),
          });

          const tokenData = await tokenResponse.json() as {
            access_token: string;
            token_type: string;
            expires_in: number;
            refresh_token?: string;
            scope: string;
          };

          if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData);
            return new Response('Authentication failed', { status: 400 });
          }

          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          });

          const userData = await userResponse.json() as {
            email: string;
            name: string;
          };

          if (!userResponse.ok) {
            console.error('User info fetch failed:', userData);
            return new Response('Failed to get user info', { status: 400 });
          }

          const loggedAs = {
            email: userData.email,
            name: userData.name,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || '',
            tokenType: tokenData.token_type,
            expiresIn: tokenData.expires_in,
            scope: tokenData.scope,
          };

          context.set('loggedAs', loggedAs);
          ee.emit('loggedIn', loggedAs);

          return new Response('', {
            status: 302,
            headers: { Location: '/' }
          });
        } catch (error) {
          console.error('OAuth error:', error);
          return new Response('Authentication failed', { status: 500 });
        }
      },
    },
  });

  console.log(`OAuth server running on http://localhost:${server.port}`);
  return server;
};

export const waitForLoggedIn = async () => {
  const currentUser = context.get('loggedAs');

  return currentUser ? [currentUser] : ee.until('loggedIn');
}