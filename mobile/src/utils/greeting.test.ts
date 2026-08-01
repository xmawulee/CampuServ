import test from 'node:test';
import assert from 'node:assert';
import { getGreeting, formatGreeting } from './greeting';

test('getGreeting - time boundary conditions', () => {
  // Helpers to create Date objects with specific hours/minutes
  const createTime = (hour: number, minute: number): Date => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  // Morning Range: 5:00 AM – 11:59 AM
  assert.strictEqual(getGreeting(createTime(5, 0)), 'Good morning');
  assert.strictEqual(getGreeting(createTime(8, 30)), 'Good morning');
  assert.strictEqual(getGreeting(createTime(11, 59)), 'Good morning');

  // Afternoon Range: 12:00 PM – 4:59 PM
  assert.strictEqual(getGreeting(createTime(12, 0)), 'Good afternoon');
  assert.strictEqual(getGreeting(createTime(14, 15)), 'Good afternoon');
  assert.strictEqual(getGreeting(createTime(16, 59)), 'Good afternoon');

  // Evening / Night Range: 5:00 PM – 4:59 AM
  assert.strictEqual(getGreeting(createTime(17, 0)), 'Good evening');
  assert.strictEqual(getGreeting(createTime(20, 0)), 'Good evening');
  assert.strictEqual(getGreeting(createTime(23, 59)), 'Good evening');
  assert.strictEqual(getGreeting(createTime(0, 0)), 'Good evening');
  assert.strictEqual(getGreeting(createTime(3, 45)), 'Good evening');
  assert.strictEqual(getGreeting(createTime(4, 59)), 'Good evening');
});

test('formatGreeting - name formatting and fallbacks', () => {
  // Name available (full name) -> formats to first name
  assert.strictEqual(formatGreeting('Good morning', 'Allen Osei'), 'Good morning, Allen');
  assert.strictEqual(formatGreeting('Good afternoon', '  Kofi   Mensah  '), 'Good afternoon, Kofi');
  
  // Single name
  assert.strictEqual(formatGreeting('Good evening', 'Ama'), 'Good evening, Ama');

  // Name missing / null / undefined / empty -> graceful degradation
  assert.strictEqual(formatGreeting('Good morning', null), 'Good morning!');
  assert.strictEqual(formatGreeting('Good afternoon', undefined), 'Good afternoon!');
  assert.strictEqual(formatGreeting('Good evening', ''), 'Good evening!');
  assert.strictEqual(formatGreeting('Good evening', '   '), 'Good evening!');
});
