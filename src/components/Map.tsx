"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Coffee, Utensils, KeyRound, Banknote } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Mock data
const locations = [
  {
    id: 1,
    name: "The Roasted Bean",
    type: "cafe",
    lat: 51.505,
    lng: -0.09,
    toiletPassword: "1234*",
    prices: [
      { item: "Espresso", price: "$2.50" },
      { item: "Latte", price: "$4.00" },
      { item: "Croissant", price: "$3.50" },
    ],
  },
  {
    id: 2,
    name: "Pasta Paradiso",
    type: "restaurant",
    lat: 51.51,
    lng: -0.1,
    toiletPassword: "No password, ask staff",
    prices: [
      { item: "Spaghetti Carbonara", price: "$14.00" },
      { item: "Margherita Pizza", price: "$12.00" },
      { item: "Tiramisu", price: "$7.00" },
    ],
  },
  {
    id: 3,
    name: "Matcha Magic",
    type: "cafe",
    lat: 51.508,
    lng: -0.11,
    toiletPassword: "8888#",
    prices: [
      { item: "Matcha Latte", price: "$5.50" },
      { item: "Green Tea Cake", price: "$6.00" },
    ],
  },
  {
      id: 4,
      name: "Burger Joint",
      type: "restaurant",
      lat: 51.503,
      lng: -0.08,
      toiletPassword: "None",
      prices: [
          { item: "Cheeseburger", price: "$9.00" },
          { item: "Fries", price: "$4.00" },
          { item: "Milkshake", price: "$5.00" },
      ],
  },
];

export default function MapComponent() {
  const [mounted, setMounted] = useState(false);

  // Use a timeout or a simple effect to trigger mount state to avoid sync update warning
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return <div className="h-[600px] w-full animate-pulse bg-gray-200 rounded-lg"></div>;

  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg shadow-lg z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={icon}>
          <Popup className="min-w-[200px]">
            <div className="p-2 font-sans">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                {loc.type === "cafe" ? <Coffee size={20} className="text-amber-700"/> : <Utensils size={20} className="text-blue-600"/>}
                {loc.name}
              </h3>
              
              <div className="bg-gray-50 p-3 rounded-md border border-gray-100 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-semibold">
                    <KeyRound size={16} className="text-gray-500"/>
                    Toilet Password
                </div>
                <div className="text-sm font-mono bg-white border border-gray-200 p-1.5 rounded text-center text-red-600 tracking-wider">
                    {loc.toiletPassword}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-2 font-semibold">
                    <Banknote size={16} className="text-green-600"/>
                    Popular Menu
                </div>
                <ul className="text-sm space-y-1">
                  {loc.prices.map((p, index) => (
                    <li key={index} className="flex justify-between border-b border-gray-200 pb-1 last:border-0 last:pb-0">
                      <span className="text-gray-600">{p.item}</span>
                      <span className="font-medium text-gray-900">{p.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
