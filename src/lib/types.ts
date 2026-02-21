export interface MenuItem {
  item: string;
  price: string;
}

export interface Place {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: "cafe" | "restaurant";
  address: string;
  toiletPass: string | null;
  wifiPass: string | null;
  rating: number;
  menu: MenuItem[];
}

export interface LocationState {
    lat: number;
    lng: number;
}

// The mock places with expanded menus
export const mockPlaces: Place[] = [
  { 
    id: 1, name: "Pursaklar Merkez Cafe", lat: 40.0380, lng: 32.8950, type: "cafe", address: "Merkez Mah, 1. Cad No:12", toiletPass: "1923#", wifiPass: "pursaklar123", rating: 4.5, 
    menu: [
      {item: "Çay", price: "₺15"}, {item: "Fincan Çay", price: "₺25"}, {item: "Türk Kahvesi", price: "₺45"}, {item: "Filtre Kahve", price: "₺60"}, 
      {item: "Americano", price: "₺65"}, {item: "Latte", price: "₺75"}, {item: "Cappuccino", price: "₺75"}, {item: "Mocha", price: "₺85"},
      {item: "Cheesecake (Limonlu/Frambuazlı)", price: "₺90"}, {item: "Tiramisu", price: "₺85"}, {item: "Brownie", price: "₺80"}, {item: "Su", price: "₺10"}
    ] 
  },
  { 
    id: 2, name: "Lezzet Lokantası", lat: 40.0400, lng: 32.8980, type: "restaurant", address: "Fatih Mah, Belediye Sk. No:5", toiletPass: "Ask to staff", wifiPass: null, rating: 4.2, 
    menu: [
      {item: "İskender", price: "₺250"}, {item: "Mercimek Çorbası", price: "₺60"}, {item: "Ezogelin Çorbası", price: "₺60"}, {item: "Lahmacun", price: "₺80"},
      {item: "Adana Kebap", price: "₺220"}, {item: "Urfa Kebap", price: "₺220"}, {item: "Tavuk Şiş", price: "₺180"}, {item: "Karışık Izgara", price: "₺350"},
      {item: "Künefe", price: "₺110"}, {item: "Sütlaç", price: "₺70"}, {item: "Ayran", price: "₺30"}, {item: "Şalgam", price: "₺35"}
    ] 
  },
  { 
    id: 3, name: "Gece Kuşu Roasters", lat: 40.0350, lng: 32.8900, type: "cafe", address: "Mimar Sinan Cad. No:44", toiletPass: "8899*", wifiPass: "roast_guest", rating: 4.8, 
    menu: [
      {item: "V60 / Chemex", price: "₺95"}, {item: "Flat White", price: "₺85"}, {item: "Cortado", price: "₺80"}, {item: "Espresso (Single/Double)", price: "₺55/70"},
      {item: "Cold Brew", price: "₺90"}, {item: "Iced Latte", price: "₺85"}, {item: "Iced Americano", price: "₺75"}, {item: "Matcha Latte", price: "₺95"},
      {item: "San Sebastian Cheesecake", price: "₺120"}, {item: "Cookie", price: "₺65"}, {item: "Kruvasan", price: "₺75"}
    ] 
  },
  { 
    id: 4, name: "Yeşilçam Çay Evi", lat: 40.0395, lng: 32.8935, type: "cafe", address: "Karaca Sokak No:3", toiletPass: "2024", wifiPass: null, rating: 3.9, 
    menu: [
      {item: "Çay", price: "₺10"}, {item: "Oralet (Portakal/Kivi/Elma)", price: "₺15"}, {item: "Kuşburnu", price: "₺20"}, {item: "Adaçayı", price: "₺25"},
      {item: "Tost (Kaşarlı/Sucuklu)", price: "₺45"}, {item: "Tost (Karışık)", price: "₺50"}, {item: "Ayvalık Tostu", price: "₺80"},
      {item: "Menemen", price: "₺90"}, {item: "Sahanda Yumurta", price: "₺60"}, {item: "Maden Suyu", price: "₺15"}
    ] 
  },
  { 
    id: 5, name: "Burger Station", lat: 40.0375, lng: 32.8975, type: "restaurant", address: "İstasyon Cd. No:88", toiletPass: "1234", wifiPass: "burgerstation5G", rating: 4.4, 
    menu: [
      {item: "Smash Cheeseburger", price: "₺180"}, {item: "Double Smash", price: "₺240"}, {item: "Tiftik Burger", price: "₺210"}, {item: "Mantar Burger", price: "₺200"},
      {item: "Cajun Patates", price: "₺65"}, {item: "Parmesanlı Truf Patates", price: "₺90"}, {item: "Soğan Halkası (6'lı)", price: "₺55"},
      {item: "Çıtır Tavuk Parçaları", price: "₺120"}, {item: "Milkshake (Çikolata/Çilek/Vanilya)", price: "₺95"}, {item: "Kutu İçecekler", price: "₺40"}
    ] 
  },
  { 
    id: 6, name: "Vadi Patisserie", lat: 40.0330, lng: 32.8920, type: "cafe", address: "Vadi Evleri Altı", toiletPass: "0000", wifiPass: "vadi_cafe", rating: 4.6, 
    menu: [
      {item: "Profiterol", price: "₺120"}, {item: "Ekler (Porsiyon)", price: "₺110"}, {item: "Triliçe", price: "₺90"}, {item: "Sütlaç", price: "₺80"},
      {item: "Latte", price: "₺75"}, {item: "Türk Kahvesi", price: "₺50"}, {item: "Filtre Kahve", price: "₺65"}, {item: "Çay", price: "₺20"},
      {item: "Ev Yapımı Limonata", price: "₺60"}, {item: "Karadut Suyu", price: "₺65"}, {item: "Sıcak Çikolata", price: "₺75"}, {item: "Salep", price: "₺80"}
    ] 
  }
];
