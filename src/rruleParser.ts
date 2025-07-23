export type RecurrenceRule = {
  freq?: 'yearly' | 'monthly' | 'weekly' | 'daily' | 'hourly' | 'minutely' | 'secondly';
  interval?: number;
  until?: string;
  count?: number;
  bysecond?: number[];
  byminute?: number[];
  byhour?: number[];
  byday?: string[];
  bymonthday?: number[];
  byyearday?: number[];
  byweekno?: number[];
  bymonth?: number[];
  bysetpos?: number[];
  wkst?: 'mo' | 'tu' | 'we' | 'th' | 'fr' | 'sa' | 'su';
  rdate?: string[];
  exdate?: string[];
};

export const parseRRule = (rruleString: string): RecurrenceRule => {
  const rule: RecurrenceRule = {};
  
  // Remove RRULE: prefix if present
  const cleanRule = rruleString.replace(/^RRULE:/, '');
  
  // Split by semicolon
  const parts = cleanRule.split(';');
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    
    const lowerKey = key.toLowerCase();
    
    switch (lowerKey) {
      case 'freq':
        rule.freq = value.toLowerCase() as RecurrenceRule['freq'];
        break;
        
      case 'interval':
        rule.interval = parseInt(value, 10);
        break;
        
      case 'until':
        rule.until = value;
        break;
        
      case 'count':
        rule.count = parseInt(value, 10);
        break;
        
      case 'bysecond':
        rule.bysecond = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'byminute':
        rule.byminute = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'byhour':
        rule.byhour = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'byday':
        rule.byday = value.split(',').map(v => v.toLowerCase());
        break;
        
      case 'bymonthday':
        rule.bymonthday = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'byyearday':
        rule.byyearday = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'byweekno':
        rule.byweekno = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'bymonth':
        rule.bymonth = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'bysetpos':
        rule.bysetpos = value.split(',').map(v => parseInt(v, 10));
        break;
        
      case 'wkst':
        rule.wkst = value.toLowerCase() as RecurrenceRule['wkst'];
        break;
        
      case 'rdate':
        rule.rdate = value.split(',');
        break;
        
      case 'exdate':
        rule.exdate = value.split(',');
        break;
    }
  }
  
  return rule;
};

export const parseRecurrenceArray = (recurrenceArray: string[]): RecurrenceRule[] => {
  return recurrenceArray.map(rule => parseRRule(rule));
}; 