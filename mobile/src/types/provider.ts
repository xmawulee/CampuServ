// ─────────────────────────────────────────────────────────
//  CampusServ — Provider-Side Type Definitions
// ─────────────────────────────────────────────────────────

export type JobStatus =
  | 'ACTIVE'
  | 'IN_PROGRESS'
  | 'AWAITING_CODE'
  | 'PROOF_SUBMITTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type OfferStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN';

export type RequestStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'COMPLETED'
  | 'CANCELLED';

// ─── Job (from job-service) ───────────────────────────────
export interface ProviderJob {
  id: string;
  requestId: string;
  offerId: string;
  requesterId: string;
  providerId: string;
  providerName?: string;
  requesterName?: string;
  categoryName?: string;
  serviceMode?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  locationHint?: string;
  remoteInfo?: string;
  attachmentUrls?: string[];
  status: JobStatus;
  requestTitle?: string;
  requestDescription?: string;
  agreedPrice?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Offer (from request-service) ────────────────────────
export interface ProviderOffer {
  id: string;
  requestId: string;
  providerId: string;
  price: number;
  eta: string | null;
  message: string | null;
  attachmentUrls?: string[];
  status: OfferStatus;
}

// ─── Dashboard stats (derived) ────────────────────────────
export interface ProviderDashboardStats {
  availableBalance: number;
  pendingEscrow: number;
  activeJobsCount: number;
  pendingBidsCount: number;
  completedJobsCount: number;
  rating: number;
}

// ─── Service category ─────────────────────────────────────
export interface ServiceCategory {
  id: string;
  name: string;
}

// ─── Provider's service listing (maps to provider_services) ─
export interface ServiceListing {
  id: string;
  providerId: string;
  category: ServiceCategory;
  basePrice: number;
  createdAt: string;
}

// ─── Open request (from request-service) ─────────────────
export interface RequestAttachment {
  id: string;
  requestId: string;
  fileUrl: string;
}

export interface OpenRequest {
  id: string;
  requesterId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  location: string | null;
  locationType: string | null;
  locationDetail: string | null;
  deliveryMode: string | null;
  status: RequestStatus;
  deadline: string | null;
  bidWindowCloses: string | null;
  createdAt: string;
  attachments?: RequestAttachment[];
  offers?: ProviderOffer[];
}

// ─── Provider Profile (from user-service GET /users/{id}) ─
export interface ProviderProfileData {
  id: string;
  email: string;
  fullName: string;
  profilePictureUrl: string | null;
  role: string;
  isVerified: boolean | null;
  bio: string | null;
  rating: number;
  completedJobsCount: number;
  portfolio: string[];
  services: ServiceListing[];
}

// ─── Wallet (from payment-service) ────────────────────────
export interface ProviderWallet {
  id: string;
  userId: string;
  balance: number;
  escrowHeld: number;
}
