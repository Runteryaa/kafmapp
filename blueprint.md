# kaf'map Blueprint

## Overview
kaf'map is an OpenStreetMap-based web application designed to help users find cafes and restaurants, specifically highlighting useful but often hard-to-find information like toilet passwords and menu prices.

## Current Implementation
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS (Dark Mode Support)
- **Map Integration:** React Leaflet (OpenStreetMap)
- **Icons:** Lucide React
- **Authentication:** Custom Fullscreen Modals (Login/Register) with Google Auth Integration via Appwrite/Firebase (Placeholder).
- **Data Source:** Mock Data + Live Overpass API Integration (OpenStreetMap).
- **Internationalization:** Custom English/Turkish language toggle.

## Current Features
- **Map Interface:**
  - Interactive map with clustering/markers.
  - Custom Place Markers (Cafe: Amber/Coffee, Fast Food: Red/Pizza, Bar: Purple/Beer, Restaurant: Orange/Utensils).
  - Dark Mode Support for Map Tiles (CartoDB Dark Matter).
- **Place Details:**
  - Detailed side panel/drawer for mobile & desktop.
  - "Unclaimed" badge for live data.
  - Toilet Code & WiFi Password display (with Copy functionality).
  - Menu snippet display with "See all" modal.
- **Search & Navigation:**
  - "Fake Search Bar" button triggering search panel focus.
  - Global city/area search via Nominatim.
  - "Locate Me" button for geolocation.
  - "Scan Area" button for manual data refresh.
- **User Settings:**
  - Theme Toggle (Light/Dark).
  - Language Toggle (English/Spanish - planned Turkish?). Note: Code has 'es' for Spanish, memory mentioned Turkish. Sticking to code 'es'.
- **Authentication:**
  - Login/Register modals accessible via Burger Menu.
  - Google Auth button (UI implementation).

## Plan for Current Request (Rearrange Controls)
1.  **Map Controls Layout Update:**
    -   Move "Locate Me" button to the bottom-left stack.
    -   Stack Order (Bottom-Left): Locate Me -> Zoom In -> Zoom Out.
    -   Keep "Scan Area" button on the bottom-right.
2.  **Verification:**
    -   Ensure all buttons function correctly after move.
    -   Verify responsiveness (mobile/desktop positioning).
