import test from 'node:test';
import assert from 'node:assert';
import { getGreeting, formatGreeting } from './greeting';

test('Simulated background/foreground transition across time-of-day boundaries', () => {
  // We want to simulate the scenario:
  // 1. App mounts / is active in the morning (e.g., 11:55 AM)
  // 2. App goes to background
  // 3. Time passes, boundary is crossed to afternoon (e.g., 12:05 PM)
  // 4. App returns to foreground (becomes active)
  // 5. Assert that greeting correctly transitions from "Good morning" to "Good afternoon"

  let mockCurrentTime = new Date();
  const userName = 'Allen Osei';

  // Step 1: Active in the morning at 11:55 AM
  mockCurrentTime.setHours(11, 55, 0, 0);
  let greetingPrefix = getGreeting(mockCurrentTime);
  let greetingText = formatGreeting(greetingPrefix, userName);
  assert.strictEqual(greetingText, 'Good morning, Allen');

  // Step 2 & 3: Backgrounded, time shifts to 12:05 PM (afternoon range)
  mockCurrentTime.setHours(12, 5, 0, 0);

  // Step 4 & 5: Resumed / Foregrounded
  // The AppState listener triggers updateGreeting() which queries the current Date
  greetingPrefix = getGreeting(mockCurrentTime);
  greetingText = formatGreeting(greetingPrefix, userName);

  // Assert it updated correctly
  assert.strictEqual(greetingText, 'Good afternoon, Allen');
});

test('Simulated background/foreground transition across evening boundary', () => {
  // Simulate backgrounding at 4:55 PM (afternoon) and resuming at 5:05 PM (evening)
  let mockCurrentTime = new Date();
  const userName = 'Allen';

  // 4:55 PM
  mockCurrentTime.setHours(16, 55, 0, 0);
  let greetingPrefix = getGreeting(mockCurrentTime);
  let greetingText = formatGreeting(greetingPrefix, userName);
  assert.strictEqual(greetingText, 'Good afternoon, Allen');

  // Time shifts to 5:05 PM
  mockCurrentTime.setHours(17, 5, 0, 0);

  // Resume / Foreground triggers update
  greetingPrefix = getGreeting(mockCurrentTime);
  greetingText = formatGreeting(greetingPrefix, userName);
  assert.strictEqual(greetingText, 'Good evening, Allen');
});
