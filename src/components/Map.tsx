"use client";

import { useEffect, useRef, useState, memo, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { Place, LocationState } from "../lib/types";
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import Supercluster from 'supercluster';

function MapEventsWrapper({ onZoomEnd, onMoveEnd, setMapRef, onMapClick }: any) {
    const map = useMapEvents({
        zoomend: onZoomEnd,
        moveend: onMoveEnd,
        click: (e) => {
            if (onMapClick) onMapClick(e.latlng);
        }
    });
    useEffect(() => {
        if (setMapRef) setMapRef(map);
    }, [map, setMapRef]);
    return null;
}

// Icon cache outside component to prevent recreating L.divIcon
const iconCache: Record<string, any> = {};

const getCustomIcon = (type: string, isUnclaimed: boolean, isPremium: boolean, premiumColor?: string, favoriteColor?: string) => {
    const cacheKey = `${type}-${isUnclaimed}-${isPremium}-${premiumColor || 'default'}-${favoriteColor || 'none'}`;
    if (iconCache[cacheKey]) {
        return iconCache[cacheKey];
    }

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

    // Use custom premium color or favorite color for border
    // If favorite, override with specific list color if not premium
    const finalOutlineColor = isPremium ? (premiumColor || '#ffd700') : (favoriteColor || '#ec4899');
    const isHighlighted = isPremium || !!favoriteColor;

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

    const iconClasses = `flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg text-white transition-transform duration-200 ${isPremium ? 'animate-premium-glow' : ''}`;
    
    // Dynamic CSS variables for the glow animation
    // Category color stays as background, premiumColor only for border and glow wave
    const inlineStyle = `
        background-color: ${bgColor}; 
        opacity: ${isUnclaimed ? 0.8 : 1}; 
        ${isHighlighted ? `
            --glow-color: ${finalOutlineColor}; 
            border-color: ${finalOutlineColor};
            border-width: 3px;
        ` : 'border-color: white;'}
    `;

    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="${iconClasses}" style="${inlineStyle.replace(/\s+/g, ' ')}">${iconHtml}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    iconCache[cacheKey] = icon;
    return icon;
};

const userIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: #3b82f6; border: 3px solid white; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const PlaceMarker = memo(({ place, onSelect, isFavorite, listColor }: { place: Place, onSelect: (id: number) => void, isFavorite?: boolean, listColor?: string }) => {
    const isUnclaimed = !place.isRegistered;
    const eventHandlers = useMemo(() => ({ click: () => onSelect(place.id) }), [place.id, onSelect]);
    
    // Check if premium sponsorship is active
    const isPremiumActive = useMemo(() => {
        if (!place.isPremium) return false;
        if (!place.premiumUntil) return true; // Perpetual if date missing
        return new Date(place.premiumUntil) > new Date();
    }, [place.isPremium, place.premiumUntil]);

    return (
        <Marker
            position={[place.lat, place.lng]}
            icon={getCustomIcon(place.type, isUnclaimed, isPremiumActive, place.premiumColor, listColor)}
            eventHandlers={eventHandlers}
            zIndexOffset={isPremiumActive || isFavorite ? 1000 : 0}
        >
            <Tooltip direction="top" offset={[0, -16]} opacity={1} className="custom-tooltip">
                <span className={`font-semibold border-none shadow-none text-sm`} style={(isPremiumActive || isFavorite) ? { color: isPremiumActive ? '#d97706' : (listColor || '#ec4899') } : { color: '#111827' }}>{place.name}</span>
            </Tooltip>
        </Marker>
    );
});
PlaceMarker.displayName = 'PlaceMarker';

export default function MapComponent({
    places, onSelect, selectedId, isMobile, userLocation, flyToLocation, onOsmPlacesFetch, setIsFetchingMap, onMapReady, theme, manualTrigger, t, onMapClick, favorites
}: {
    places: Place[], onSelect: (id: number) => void, selectedId: number | null, isMobile: boolean,
    userLocation: LocationState | null, flyToLocation: LocationState | null,
    onOsmPlacesFetch: (places: Place[]) => void, setIsFetchingMap: (b: boolean) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMapReady?: (map: any) => void,
    theme?: 'light' | 'dark',
    manualTrigger?: number,
    t: any,
    onMapClick?: (latlng: any) => void,
    favorites?: any[]
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [map, setMap] = useState<any>(null);
    const selectedPlace = useMemo(() => places.find(p => p.id === selectedId), [places, selectedId]);
    const [currentZoom, setCurrentZoom] = useState(15);
    const [currentBounds, setCurrentBounds] = useState<any>(null);
    
    // IP Geolocation fallback state
    const [ipLocation, setIpLocation] = useState<LocationState | null>(null);

    const fetchRef = useRef<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [loadedBounds, setLoadedBounds] = useState<any>(null);

    const prevFlyTo = useRef<LocationState | null>(null);
    const prevSelectedId = useRef<number | null>(null);
    const initialIpPanDone = useRef(false);
    const initialGpsPanDone = useRef(false);

    // Fetch IP Location on Mount
    useEffect(() => {
        const fetchIpLocation = async () => {
            try {
                // Using geojs.io - a free, no-key IP geolocation API with CORS support
                const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.latitude && data.longitude) {
                        setIpLocation({
                            lat: parseFloat(data.latitude),
                            lng: parseFloat(data.longitude)
                        });
                    }
                }
            } catch (error) {
                console.warn("IP Geolocation failed:", error);
            }
        };

        fetchIpLocation();
    }, []);

    // Determine which location to use: GPS is preferred, IP is fallback
    const effectiveLocation = userLocation || ipLocation;

    // Map Controller Effect
    useEffect(() => {
        if (!map) return;

        const isFlyToUpdate = flyToLocation && (!prevFlyTo.current || flyToLocation.lat !== prevFlyTo.current.lat || flyToLocation.lng !== prevFlyTo.current.lng);
        const isSelectedUpdate = selectedId !== prevSelectedId.current;

        // 1. Selection Logic (Higher Priority)
        if (isSelectedUpdate) {
            prevSelectedId.current = selectedId;
            if (selectedPlace) {
                // If a place is selected, update flyTo ref to avoid double-panning
                if (flyToLocation) prevFlyTo.current = flyToLocation;
                
                const latOffset = isMobile ? -0.002 : 0;
                const targetZoom = Math.max(map.getZoom(), 17);
                map.setView([selectedPlace.lat + latOffset, selectedPlace.lng], targetZoom, { animate: true, duration: 0.5 });
                return; // Selection handling complete
            } else if (selectedId === null && effectiveLocation) {
                // Selection cleared -> Pan back to user location
                map.setView([effectiveLocation.lat, effectiveLocation.lng], 15, { animate: true, duration: 0.5 });
            }
        }

        // 2. Manual FlyTo (e.g., Locate Me button)
        if (isFlyToUpdate) {
            prevFlyTo.current = flyToLocation;
            map.setView([flyToLocation.lat, flyToLocation.lng], 15, { animate: true, duration: 1.0 });
            return;
        }

        // 3. Initial GPS/IP Landing
        if (!selectedId && !flyToLocation) {
            if (userLocation && !initialGpsPanDone.current) {
                map.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
                initialGpsPanDone.current = true;
            } else if (ipLocation && !userLocation && !initialIpPanDone.current) {
                map.setView([ipLocation.lat, ipLocation.lng], 15, { animate: true });
                initialIpPanDone.current = true;
            }
        }
    }, [map, flyToLocation, selectedPlace, selectedId, isMobile, ipLocation, userLocation, effectiveLocation]);

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

        // Load a bigger area (100% padding) to reduce future requests while panning
        const expandedBounds = currentBounds.pad(1.0);
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
                    
                    // Improved address assembly from multiple possible OSM tags
                    const tags = el.tags || {};
                    let address = "";
                    if (tags['addr:full']) {
                        address = tags['addr:full'];
                    } else if (tags['addr:street']) {
                        address = `${tags['addr:street']} ${tags['addr:housenumber'] || ''}`;
                        if (tags['addr:suburb']) address += `, ${tags['addr:suburb']}`;
                        if (tags['addr:city']) address += ` / ${tags['addr:city']}`;
                    } else if (tags['addr:place']) {
                        address = tags['addr:place'];
                    } else if (tags['addr:suburb'] || tags['addr:city']) {
                        address = [tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(' / ');
                    } else {
                        address = t.addressUnknown;
                    }

                    return {
                        id: el.id,
                        name: tags.name || t.unknown,
                        lat, lng,
                        type: tags.amenity as Place['type'],
                        address: address.trim(),
                        toiletPass: null,
                        wifiPass: null,
                        rating: 0,
                        menu: [],
                        isRegistered: false
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
        setCurrentBounds(map.getBounds());
        if (fetchRef.current) clearTimeout(fetchRef.current);
        fetchRef.current = window.setTimeout(() => fetchPlaces(), 800); // Decreased debounce to 800ms for faster loads
    };

    const onMoveEnd = () => {
        if (!map) return;
        setCurrentBounds(map.getBounds());
        if (fetchRef.current) clearTimeout(fetchRef.current);
        fetchRef.current = window.setTimeout(() => fetchPlaces(), 800); // Decreased debounce to 800ms for faster loads
    };

    useEffect(() => {
        if (map) {
            fetchPlaces();
            setCurrentBounds(map.getBounds());
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

    // Only show markers if zoomed in enough
    const showMarkers = currentZoom >= 14;

    const favoritePlaceIds = useMemo(() => {
        return favorites ? favorites.map(f => f.placeId) : [];
    }, [favorites]);

    const highlightedPlaces = useMemo(() => places.filter(p => {
        const isFav = favoritePlaceIds.includes(p.id.toString());
        if (isFav) return true;

        if (!p.isPremium) return false;
        if (!p.premiumUntil) return true; // Perpetual if date missing
        return new Date(p.premiumUntil) > new Date();
    }), [places, favoritePlaceIds]);

    const regularPlaces = useMemo(() => places.filter(p => {
        const isFav = favoritePlaceIds.includes(p.id.toString());
        if (isFav) return false; // Exclude from regular if it's a favorite

        if (!p.isPremium) return true;
        if (!p.premiumUntil) return false;
        return new Date(p.premiumUntil) <= new Date();
    }), [places, favoritePlaceIds]);

    // --- Supercluster Logic for Min Points ---
    const scIndex = useMemo(() => {
        const index = new Supercluster({
            radius: 120,
            maxZoom: 16,
            minPoints: 4 // Only cluster if 4 or more points
        });
        
        index.load(regularPlaces.map(p => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { place: p }
        })) as any);
        
        return index;
    }, [regularPlaces]);

    const { clusteredMarkers, individualMarkers } = useMemo(() => {
        if (!currentBounds || currentZoom >= 17) {
            return { clusteredMarkers: [], individualMarkers: regularPlaces };
        }

        const bbox: [number, number, number, number] = [
            currentBounds.getWest(),
            currentBounds.getSouth(),
            currentBounds.getEast(),
            currentBounds.getNorth()
        ];

        try {
            const clusters = scIndex.getClusters(bbox, Math.floor(currentZoom));
            const clustered: Place[] = [];
            const individual: Place[] = [];

            clusters.forEach(c => {
                if (c.properties?.cluster) {
                    // Large cluster (6+ points due to scIndex config)
                    const leaves = scIndex.getLeaves(c.id as number, Infinity);
                    clustered.push(...leaves.map(l => l.properties.place));
                } else {
                    // Single point or member of a small group that didn't cluster
                    individual.push(c.properties.place);
                }
            });

            return { clusteredMarkers: clustered, individualMarkers: individual };
        } catch (e) {
            console.error("Supercluster calculation failed", e);
            return { clusteredMarkers: [], individualMarkers: regularPlaces };
        }
    }, [scIndex, currentBounds, currentZoom, regularPlaces]);

    return (
        <div style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }}>
            {!showMarkers && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-gray-200 text-sm font-medium text-gray-600 pointer-events-none whitespace-nowrap">
                    {t.zoomInToSearch}
                </div>
            )}

            <MapContainer
                center={effectiveLocation ? [effectiveLocation.lat, effectiveLocation.lng] : [39.0, 35.0]}
                zoom={effectiveLocation ? 15 : 6}
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

                <MapEventsWrapper onZoomEnd={onZoomEnd} onMoveEnd={onMoveEnd} setMapRef={setMap} onMapClick={onMapClick} />

                {showMarkers && (
                    <>
                        <MarkerClusterGroup
                            chunkedLoading
                            maxClusterRadius={120}
                            spiderfyOnMaxZoom={true}
                            disableClusteringAtZoom={17}
                            removeOutsideVisibleBounds={true}
                        >
                            {clusteredMarkers.map((place) => (
                                <PlaceMarker key={place.id} place={place} onSelect={onSelect} />
                            ))}
                        </MarkerClusterGroup>
                        {individualMarkers.map((place) => (
                            <PlaceMarker key={place.id} place={place} onSelect={onSelect} />
                        ))}
                        {highlightedPlaces.map((place) => {
                            const isFav = favoritePlaceIds.includes(place.id.toString());
                            const favEntry = favorites?.find(f => f.placeId === place.id.toString());
                            const listColor = isFav ? favEntry?.listColor : undefined;
                            
                            return (
                                <PlaceMarker 
                                    key={place.id} 
                                    place={place} 
                                    onSelect={onSelect} 
                                    isFavorite={isFav}
                                    listColor={listColor}
                                />
                            );
                        })}
                    </>
                )}

                {effectiveLocation && (
                    <>
                        <Marker position={[effectiveLocation.lat, effectiveLocation.lng]} icon={userIcon} />
                        <Circle
                            center={[effectiveLocation.lat, effectiveLocation.lng]}
                            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.1, color: 'transparent' }}
                            radius={150}
                        />
                    </>
                )}
            </MapContainer>
        </div>
    );
}
