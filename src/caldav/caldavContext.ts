type User = {
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
};

type Calendar = {
  id: string;
  summary: string;
};

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

const context = (() => {
  const innerContext = {
    user: null as User | null,
    calendars: [] as Calendar[],
    events: [] as Event[],
    isInitialized: false,
  };

  return {
    get<Key extends keyof typeof innerContext>(key: Key): typeof innerContext[Key] {
      return innerContext[key];
    },
    set<Key extends keyof typeof innerContext>(key: Key, value: typeof innerContext[Key]) {
      innerContext[key] = value;
    },
    getUser(): User {
      if (!innerContext.user) {
        throw new Error('User not initialized');
      }
      return innerContext.user;
    },
    getCalendars(): Calendar[] {
      return innerContext.calendars;
    },
    getEvents(): Event[] {
      return innerContext.events;
    },
    isReady(): boolean {
      return innerContext.isInitialized;
    },
  };
})();

export default context; 