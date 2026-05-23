# kaf'map Blueprint

## Overview
kaf'map is an OpenStreetMap-based web application designed to help users find cafes and restaurants, specifically highlighting useful but often hard-to-find information like toilet passwords and menu prices. 

## Current Implementation
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Map Integration:** React Leaflet (OpenStreetMap)
- **Icons:** Lucide React

## Current Features
- Interactive map centered on a default location (e.g., a city center).
- Markers for sample cafes and restaurants.
- Popups on markers displaying:
  - Establishment Name
  - Type (Cafe/Restaurant)
  - Toilet Password (if known)
  - Link to Menu or sample menu prices.

## Plan for Current Request (Generate Demo)
1.  **Install Dependencies:** `leaflet`, `react-leaflet`, `@types/leaflet`, `lucide-react` (Completed).
2.  **Create Map Component:** Build a Client Component (`src/components/Map.tsx`) that renders the Leaflet map, as Leaflet requires window access and must run on the client.
3.  **Define Mock Data:** Create a set of mock locations (cafes/restaurants) with coordinates, names, toilet passwords, and sample menu items.
4.  **Integrate Markers:** Map over the mock data to place markers on the map with detailed popups.
5.  **Update Main Page:** Replace the default Next.js boilerplate in `src/app/page.tsx` to display the map taking up the full screen or a large portion of it, along with a header/sidebar for app branding.
6.  **Fix Leaflet CSS/Icon Issues:** Ensure Leaflet CSS is imported and default marker icons work correctly in Next.js.