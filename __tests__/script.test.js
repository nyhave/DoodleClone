import { formatDate, toIcsDate } from '../script.js';

describe('script utilities', () => {
  test('toIcsDate converts ISO to ICS format', () => {
    expect(toIcsDate('2023-01-01T00:00:00Z')).toBe('20230101T000000Z');
  });

  test('formatDate returns string', () => {
    const result = formatDate('2023-01-01T12:00:00Z', 'UTC');
    expect(typeof result).toBe('string');
  });
});
