import { createEventEmitter } from '@maxiedev/events';

const context = (() => {
  const innerContext = {
    loggedAs: null as ({
      email: string;
      name: string;
      accessToken: string;
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
  }];
  loggedOut: [];
}>();

const loadTemplate = async (templateName: string) => {
  const templatePath = `src/templates/${templateName}.html`;
  try {
    const file = Bun.file(templatePath);
    return await file.text();
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return '';
  }
};

const renderTemplate = (template: string, data: Record<string, string>) => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
};

export const oauthServer = async () => {
  await context.load();

  const loggedInHtml = await loadTemplate('logged-in');
  const loginHtml = await loadTemplate('login');

  const server = Bun.serve({
    port: 3000,
    routes: {
      '/': async () => {
        const loggedAs = context.get('loggedAs');

        if (loggedAs) {
          return new Response(renderTemplate(loggedInHtml, {
            email: loggedAs.email,
            name: loggedAs.name,
          }), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response(loginHtml, {
          headers: { 'Content-Type': 'text/html' }
        });
      },
      '/auth/google': async () => {
        const clientId = context.get('clientId')!;

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent('http://localhost:3000/auth/callback')}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')}&` +
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
  return ee.until('loggedIn');
}