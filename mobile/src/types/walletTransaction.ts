export type WalletTxnType = 'DEPOSIT' | 'WITHDRAWAL';

export type WalletTxnStatus =
  | 'PENDING'      // initiated, awaiting Paystack confirmation
  | 'SUCCESS'      // confirmed and applied to wallet
  | 'FAILED'       // Paystack declined or timed out
  | 'PROCESSING';  // withdrawal submitted, bank/MoMo processing

export interface WalletTransaction {
  // Core identifiers
  walletTxnId: string;          // e.g. "WTXN-88-2026-00071"
  paystackReference: string;    // Paystack ref or internal ref for withdrawals
  userId: string;               // UUID of the wallet owner

  // Who
  ownerName: string;            // Full name
  ownerStudentId: string;       // e.g. "6543219"
  ownerEmail: string;           // @st.knust.edu.gh

  // What kind
  type: WalletTxnType;          // DEPOSIT | WITHDRAWAL
  status: WalletTxnStatus;

  // Money
  amount: number;               // GHS amount of this transaction
  feesCharged: number;          // Any Paystack processing fee (0 if absorbed)
  netAmount: number;            // amount - feesCharged (what actually hits wallet)
  balanceBefore: number;        // Wallet balance before this transaction
  balanceAfter: number;         // Wallet balance after this transaction
  currency: 'GHS';              // Always GHS

  // Payment channel
  paymentMethod: 'MTN MoMo' | 'Vodafone Cash' | 'AirtelTigo Money' | 'Bank Transfer';
  mobileNumber?: string;        // Masked: "055***4321" — for MoMo deposits/withdrawals
  bankName?: string;            // e.g. "Absa Ghana" — for bank withdrawals
  accountNumberMasked?: string; // e.g. "****7890"

  // Timestamps (ISO 8601, WAT = UTC+0)
  initiatedAt: string;          // When user tapped Deposit / Withdraw
  completedAt: string | null;   // When Paystack webhook confirmed OR null if pending
  failedAt: string | null;      // If failed, when

  // Extra context
  narration: string;            // Human-readable: "Wallet Top-Up" | "Earnings Withdrawal"
  failureReason?: string;       // e.g. "Insufficient MoMo balance" if FAILED
  ipAddress?: string;           // For fraud detection (backend only, don't display)
  createdAt?: string;
}
export interface WalletTxnCardProps {
  transaction: WalletTransaction;
  onPress: (walletTxnId: string) => void;
}
