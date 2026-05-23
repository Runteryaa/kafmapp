export interface MenuItem {
  item: string;
  price: string;
}

export interface Review {
  id: string;
  placeId: string;
  userId: string;
  userName: string;
  rating: number;
  commentText: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: "cafe" | "restaurant" | "fast_food" | "bar" | "pub";
  address: string;
  toiletPass: string | null;
  wifiPass: string | null;
  rating: number;
  menu: MenuItem[];
  menuUrl?: string | null;
  isRegistered?: boolean;
  wcUpdatedAt?: string;
  wcUpvotes?: number;
  wifiUpdatedAt?: string;
  wifiUpvotes?: number;
  menuUpdatedAt?: string;
  menuUpvotes?: number;
  isPremium?: boolean;
  premiumUntil?: string; // ISO Date string
  premiumColor?: string; // Hex or CSS color
  ratingSum?: number | string;
  ratingCount?: number | string;
}

export interface LocationState {
  lat: number;
  lng: number;
}

export interface Sponsor {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  linkUrl: string;
  isActive: boolean;
  position?: 'top' | 'bottom';
}

// Keeping mock data for now as fallback/hybrid usage until full DB fetch is implemented in page.tsx
export const mockPlaces: Place[] = [];
