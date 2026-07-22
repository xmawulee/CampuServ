import { LightColors } from '../styles/colors';
export const formatReceiptDateTime = (iso: string | null | undefined): string => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  
  const weekdays = ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday']; // adjusted for index or standard formatter
  // Using standard Intl formatter is cleaner and handles timezones gracefully
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Format to "Wednesday, June 18, 2026 at 2:32 PM" or similar
    const formatted = formatter.format(date);
    // Adjust format if needed to "Wednesday, 18 June 2026 at 2:32 PM"
    // Let's build it manually to ensure exact format: "Wednesday, 18 June 2026 at 2:32 PM"
    const fullWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = fullWeekdays[date.getDay()];
    const day = date.getDate();
    const month = fullMonths[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${dayName}, ${day} ${month} ${year} at ${hours}:${minutes} ${ampm}`;
  } catch (e) {
    return date.toLocaleString();
  }
};

// Format ISO timestamp → compact "Wed, 18 Jun • 2:32 PM"
export const formatShortDateTime = (iso: string | null | undefined): string => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const w = weekdays[date.getDay()];
  const d = date.getDate();
  const m = months[date.getMonth()];
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${w}, ${d} ${m} • ${hours}:${minutes} ${ampm}`;
};

// Format GHS amount
export const formatGHS = (amount: number): string =>
  `GHS ${amount.toFixed(2)}`;

// Calculate commission
export const calcCommission = (amount: number): number =>
  parseFloat((amount * 0.05).toFixed(2));

// Generate transaction ID
export const generateTxnId = (orderId: string, timestamp: string): string => {
  if (!orderId) return 'TXN-88-2026-00000';
  const year = timestamp ? new Date(timestamp).getFullYear() : 2026;
  return `TXN-88-${year}-${orderId.slice(0, 5).toUpperCase()}`;
};

// Status color map
export const statusColor = {
  HELD: LightColors.warning,
  RELEASED: LightColors.success,
  REFUNDED: LightColors.secondary,
  FAILED: LightColors.error,
};
