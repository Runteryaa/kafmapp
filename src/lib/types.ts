export interface MenuItem {
  item: string;
  price: string;
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
  isRegistered?: boolean;
}

export interface LocationState {
    lat: number;
    lng: number;
}

// Keeping mock data for now as fallback/hybrid usage until full DB fetch is implemented in page.tsx
export const mockPlaces: Place[] = [];
