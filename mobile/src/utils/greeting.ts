/**
 * Returns a time-of-day greeting based on the local time.
 * 
 * Boundaries:
 * - 5:00 AM - 11:59 AM (5:00 - 11:59) -> "Good morning"
 * - 12:00 PM - 4:59 PM (12:00 - 16:59) -> "Good afternoon"
 * - 5:00 PM - 4:59 AM (17:00 - 4:59) -> "Good evening"
 * 
 * @param date The Date object to determine the greeting for.
 */
export function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

/**
 * Formats the greeting with the user's first name, or returns a sensible fallback
 * if the name is not available.
 * 
 * @param greeting The greeting prefix (e.g. "Good morning").
 * @param fullName The user's full name.
 */
export function formatGreeting(greeting: string, fullName?: string | null): string {
  if (!fullName || !fullName.trim()) {
    return `${greeting}!`;
  }
  const firstName = fullName.trim().split(/\s+/)[0];
  return `${greeting}, ${firstName}`;
}
