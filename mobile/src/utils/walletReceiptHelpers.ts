import { WalletTxnStatus } from '../types/walletTransaction';
import { LightColors } from '../styles/colors';

// "Wednesday, 18 June 2026 at 2:32 PM" — for full receipt screen
export const formatFullReceiptDate = (iso: string | null | undefined): string => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${dayName}, ${day} ${month} ${year} at ${hours}:${minutes} ${ampm}`;
};

// "Today, 2:32 PM" / "Yesterday, 9:15 AM" / "Mon, 16 Jun • 4:00 PM"
export const formatShortTxnDate = (iso: string | null | undefined): string => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  const now = new Date();
  
  const isTodayVal = date.getDate() === now.getDate() && 
                     date.getMonth() === now.getMonth() && 
                     date.getFullYear() === now.getFullYear();
                     
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterdayVal = date.getDate() === yesterday.getDate() && 
                         date.getMonth() === yesterday.getMonth() && 
                         date.getFullYear() === yesterday.getFullYear();
                         
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${hours}:${minutes} ${ampm}`;
  
  if (isTodayVal) {
    return `Today, ${timeStr}`;
  }
  if (isYesterdayVal) {
    return `Yesterday, ${timeStr}`;
  }
  
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const w = weekdays[date.getDay()];
  const d = date.getDate();
  const m = months[date.getMonth()];
  
  return `${w}, ${d} ${m} • ${timeStr}`;
};

// "GHS 50.00"
export const formatGHS = (amount: number): string => {
  const val = typeof amount === 'number' ? amount : Number(amount || 0);
  return `GHS ${val.toFixed(2)}`;
};

// "+ GHS 50.00" or "- GHS 80.00"
export const formatSignedGHS = (
  amount: number,
  type: 'DEPOSIT' | 'WITHDRAWAL'
): string => {
  const val = typeof amount === 'number' ? amount : Number(amount || 0);
  return `${type === 'DEPOSIT' ? '+' : '-'} GHS ${val.toFixed(2)}`;
};

// Mask mobile number: "0551234321" → "055***4321"
export const maskMobileNumber = (num: string | null | undefined): string => {
  if (!num) return 'N/A';
  if (num.length < 7) return num;
  return num.slice(0, 3) + '***' + num.slice(-4);
};

// Generate wallet transaction ID
export const generateWalletTxnId = (userId: string): string => {
  const year = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `WTXN-88-${year}-${suffix}`;
};

// Color for amount text
export const amountColor = (type: 'DEPOSIT' | 'WITHDRAWAL'): string =>
  type === 'DEPOSIT' ? LightColors.success : LightColors.error;

// Icon for transaction type
export const txnTypeIcon = (type: 'DEPOSIT' | 'WITHDRAWAL'): string =>
  type === 'DEPOSIT' ? '↑' : '↓';

// Status color map
export const walletTxnStatusColor: Record<WalletTxnStatus, string> = {
  PENDING:    LightColors.warning,
  SUCCESS:    LightColors.success,
  FAILED:     LightColors.error,
  PROCESSING: LightColors.secondary,
};
