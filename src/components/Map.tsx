"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

// We need to dynamically import react-leaflet components since Leaflet uses the window object
import dynamic from 'next/dynamic';
import { Place, LocationState } from "../lib/types";

// Only import what we need dynamically to avoid window errors
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

// MapEventsWrapper component
const MapEventsWrapper = dynamic(
  () => import('react-leaflet').then((mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function MapEventsInner({ onZoomEnd, onMoveEnd, setMapRef }: any) {
        const map = mod.useMapEvents({
            zoomend: onZoomEnd,
            moveend: onMoveEnd
        });
        useEffect(() => {
            if (setMapRef) setMapRef(map);
        }, [map, setMapRef]);
        return null;
    }
  }),
  { ssr: false }
);

export default function MapComponent({ 
    places, onSelect, selectedId, isMobile, userLocation, flyToLocation, onOsmPlacesFetch, setIsFetchingMap, onMapReady, theme, manualTrigger
}: { 
    places: Place[], onSelect: (id: number) => void, selectedId: number | null, isMobile: boolean, 
    userLocation: LocationState | null, flyToLocation: LocationState | null,
    onOsmPlacesFetch: (places: Place[]) => void, setIsFetchingMap: (b: boolean) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMapReady?: (map: any) => void,
    theme?: 'light' | 'dark',
    manualTrigger?: number
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [L, setL] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null);
  const selectedPlace = places.find(p => p.id === selectedId);
  const [currentZoom, setCurrentZoom] = useState(15);
  
  const fetchRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loadedBounds, setLoadedBounds] = useState<any>(null);

  useEffect(() => {
      // Import leaflet on client side only
      import('leaflet').then((leaflet) => {
          setL(leaflet.default || leaflet);
      });
  }, []);

  // Map Controller Effect
  useEffect(() => {
    if (!map) return;
    if (flyToLocation) {
        map.setView([flyToLocation.lat, flyToLocation.lng], 15, { animate: true, duration: 1.5 });
    } else if (selectedPlace) {
       const latOffset = isMobile ? -0.002 : 0;
       map.setView([selectedPlace.lat + latOffset, selectedPlace.lng], 17, { animate: true, duration: 0.5 });
    } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
    }
  }, [map, flyToLocation, selectedPlace, isMobile, userLocation]);

  // Overpass Fetcher
  const fetchPlaces = async (force: boolean = false) => {
      if (!map) return;
      const zoom = map.getZoom();
      
      // Require users to zoom in quite far (Zoom 15+) before fetching to avoid Overpass rate limiting
      if (zoom < 15) {
           return; 
      }
      
      const currentBounds = map.getBounds();

      // Optimization: Check if current view is fully inside the already loaded area
      // If yes, we don't need to fetch again
      if (!force && loadedBounds && loadedBounds.contains(currentBounds)) {
          return;
      }
      
      // Load a bigger area (50% padding) to reduce future requests while panning
      const expandedBounds = currentBounds.pad(0.5);
      const boundsStr = `${expandedBounds.getSouth()},${expandedBounds.getWest()},${expandedBounds.getNorth()},${expandedBounds.getEast()}`;

      const query = `
          [out:json][timeout:10];
          (
              node["amenity"~"cafe|restaurant|fast_food|bar|pub"](${boundsStr});
              way["amenity"~"cafe|restaurant|fast_food|bar|pub"](${boundsStr});
          );
          out center;
      `;

      setIsFetchingMap(true);
      
      const endpoints = [
          "https://overpass-api.de/api/interpreter",
          "https://lz4.overpass-api.de/api/interpreter",
          "https://z.overpass-api.de/api/interpreter",
          "https://overpass.kumi.systems/api/interpreter"
      ];
      
      let data = null;
      let success = false;

      for (const endpoint of endpoints) {
          try {
              const res = await fetch(endpoint, {
                  method: "POST",
                  body: "data=" + encodeURIComponent(query),
                  headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                  }
              });
              
              if (!res.ok) {
                  continue;
              }
              
              const text = await res.text();
              if (text.startsWith("<?xml")) {
                  continue; // Likely rate limited, try next endpoint
              }
              data = JSON.parse(text);
              success = true;
              break; // Success!
          } catch (e) {
              console.warn(`Endpoint ${endpoint} failed`, e);
          }
      }

      setIsFetchingMap(false);

      if (!success || !data) {
          console.error("All Overpass endpoints failed or returned XML");
          return;
      }

      try {
          const newPlaces: Place[] = data.elements
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((el: any) => el.tags?.name)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((el: any) => {
                  const lat = el.type === 'node' ? el.lat : el.center.lat;
                  const lng = el.type === 'node' ? el.lon : el.center.lon;
                  return {
                      id: el.id,
                      name: el.tags!.name || "Unknown",
                      lat, lng,
                      type: el.tags!.amenity as Place['type'],
                      address: el.tags!['addr:street'] ? `${el.tags!['addr:street']} ${el.tags!['addr:housenumber'] || ''}` : "Address unknown",
                      toiletPass: null, 
                      wifiPass: null, 
                      rating: 0, 
                      menu: []
                  };
              });
          
          onOsmPlacesFetch(newPlaces);
          setLoadedBounds(expandedBounds);
      } catch (e) {
          console.error("Parsing Overpass data failed", e);
      }
  };

  const onZoomEnd = () => {
      if (!map) return;
      setCurrentZoom(map.getZoom());
      if (fetchRef.current) clearTimeout(fetchRef.current);
      fetchRef.current = window.setTimeout(() => fetchPlaces(), 800); // Decreased debounce to 800ms for faster loads
  };

  const onMoveEnd = () => {
      if (!map) return;
      if (fetchRef.current) clearTimeout(fetchRef.current);
      fetchRef.current = window.setTimeout(() => fetchPlaces(), 800); // Decreased debounce to 800ms for faster loads
  };

  useEffect(() => {
      if (map) {
         fetchPlaces();
         if (onMapReady) onMapReady(map);
      }
      return () => { if (fetchRef.current) clearTimeout(fetchRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Listen for manual trigger
  useEffect(() => {
    if (manualTrigger) {
        fetchPlaces(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTrigger]);


  if (!L) return (
      <div className={`absolute inset-0 animate-pulse flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <p className={`font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Initializing Map...</p>
      </div>
  );

  const getCustomIcon = (type: string, isUnclaimed: boolean) => {
    let bgColor;
    let iconHtml;

    if (isUnclaimed) {
        bgColor = '#9ca3af'; // gray-400
    } else {
        switch (type) {
            case 'cafe':
                bgColor = '#d97706'; // amber-600
                break;
            case 'fast_food':
                bgColor = '#dc2626'; // red-600
                break;
            case 'bar':
            case 'pub':
                bgColor = '#9333ea'; // purple-600
                break;
            case 'restaurant':
            default:
                bgColor = '#ea580c'; // orange-600
                break;
        }
    }
    
    const cafeIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`;
    const restaurantIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
    const fastFoodIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pizza"><path d="m12 14-1 1"/><path d="m13.75 18.25-1.25 1.42"/><path d="M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12"/><path d="M18.8 9.3a1 1 0 0 0 2.1 7.7"/><path d="M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z"/></svg>`;
    const barIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-beer"><path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6"/><path d="M13 12v6"/><path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/></svg>`;

    switch (type) {
        case 'cafe':
            iconHtml = cafeIconHtml;
            break;
        case 'fast_food':
            iconHtml = fastFoodIconHtml;
            break;
        case 'bar':
        case 'pub':
            iconHtml = barIconHtml;
            break;
        case 'restaurant':
        default:
            iconHtml = restaurantIconHtml;
            break;
    }

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); background-color: ${bgColor}; color: white; opacity: ${isUnclaimed ? 0.8 : 1}; transition: transform 0.2s;">${iconHtml}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };

  const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: #3b82f6; border: 3px solid white; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  // Only show markers if zoomed in enough
  const showMarkers = currentZoom >= 14;

  return (
    <div style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }}>
        {!showMarkers && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-gray-200 text-sm font-medium text-gray-600 pointer-events-none whitespace-nowrap">
                Zoom in to see cafes and restaurants
            </div>
        )}

        <MapContainer
            center={userLocation ? [userLocation.lat, userLocation.lng] : [40.0375, 32.8945]}
            zoom={15}
            zoomControl={false}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", zIndex: 0, background: theme === 'dark' ? '#1f2937' : '#f3f4f6' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                url={theme === 'dark'
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
                subdomains="abcd"
                maxZoom={20}
                className={theme === 'dark' ? 'map-tiles-dark' : ''}
            />
            
            <MapEventsWrapper onZoomEnd={onZoomEnd} onMoveEnd={onMoveEnd} setMapRef={setMap} />

            {showMarkers && places.map((place) => {
                const isUnclaimed = !place.toiletPass && place.menu.length === 0;
                return (
                <Marker 
                    key={place.id} 
                    position={[place.lat, place.lng]} 
                    icon={getCustomIcon(place.type, isUnclaimed)}
                    eventHandlers={{ click: () => onSelect(place.id) }}
                />
            )})}

            {userLocation && (
                <>
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
                    <Circle 
                        center={[userLocation.lat, userLocation.lng]} 
                        pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.1, color: 'transparent' }} 
                        radius={150} 
                    />
                </>
            )}
        </MapContainer>
    </div>
  );
}
