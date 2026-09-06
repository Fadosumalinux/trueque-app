export interface Zone {
  id: string;
  name: string;
  region: string;
  multiplier: number;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: "article" | "service";
  baseValue: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: "user" | "professional" | "deliverer";
  bio?: string;
  avatarUrl?: string;
  verificationStatus: "pending" | "verified";
  biometricVerified: boolean;
  dniVerified: boolean;
  zoneId?: string;
  coverageZone?: string;
  maxTravelKm?: number;
  credits: number;
  ratingAvg: number;
  ratingCount: number;
  totalExchanges: number;
  likesCount: number;
  zone?: { id: string; name: string; region: string } | null;
}

export interface TradeMode {
  id: string;
  name: string;
  description?: string;
  type: "barter" | "sale" | "auction" | "custom";
  isPreset: boolean;
  createdById?: string;
  audienceScope: "public" | "verified" | "zone" | "invite";
  allowBarter: boolean;
  allowFieles: boolean;
  minBid?: number | null;
  maxBid?: number | null;
  bidStep?: number | null;
  durationHours?: number | null;
  maxParticipants?: number | null;
  isActive: boolean;
  createdBy?: { id: string; displayName: string; avatarUrl?: string };
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  amount: number;
  article?: string | null;
  note?: string | null;
  status: string;
  createdAt: string;
  bidder: { id: string; displayName: string; avatarUrl?: string; verificationStatus: string };
}

export interface Listing {
  id: string;
  userId: string;
  type: "offer" | "want";
  title: string;
  description: string;
  acceptTerms: string;
  estimatedValue: number;
  currency: "credits" | "barter" | "both";
  status: string;
  mode?: TradeMode | null;
  audienceScope?: string | null;
  allowBarter?: boolean;
  allowFieles?: boolean;
  minBid?: number | null;
  maxBid?: number | null;
  bidStep?: number | null;
  auctionStart?: string | null;
  auctionEnd?: string | null;
  maxParticipants?: number | null;
  bids?: Bid[];
  likeCount?: number;
  category: Category;
  zone: { id: string; name: string; multiplier: number };
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    verificationStatus: string;
    ratingAvg: number;
    ratingCount?: number;
    role?: string;
    coverageZone?: string;
    maxTravelKm?: number;
    bio?: string;
  };
}

export interface Exchange {
  id: string;
  listingId: string;
  fromUserId: string;
  toUserId: string;
  mode: "barter" | "credits" | "mixed";
  offerTerms: string;
  estimatedValue: number;
  creditsAmount: number;
  platformFee: number;
  feeSplit: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  delivererId?: string | null;
  deliveryCost: number;
  deliveryMode?: string | null;
  listing: Listing;
  fromUser: { id: string; displayName: string; username: string; avatarUrl?: string };
  toUser: { id: string; displayName: string; username: string; avatarUrl?: string };
  deliverer?: { id: string; displayName: string; username: string } | null;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  type: string;
  label: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
