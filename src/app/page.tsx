"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { 
    MapPin, Search, Coffee, Utensils, 
    Star, ArrowLeft, KeyRound, Wifi, Copy, List, X, ShieldCheck, MapIcon, Maximize2, Loader2, Navigation,
    Menu, Settings, LogIn, UserPlus, Moon, Sun, Languages, Plus, Minus
} from "lucide-react";
import { mockPlaces, LocationState, Place } from "../lib/types"; // Import data

// Dynamically import the Map component with ssr: false
const MapComponent = dynamic(() => import("../components/Map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 animate-pulse">
      <div className="flex flex-col items-center gap-4 text-gray-400">
        <MapIcon size={48} className="animate-bounce" />
        <p className="text-xl font-medium tracking-tight">Loading map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isMenuFullscreen, setIsMenuFullscreen] = useState(false);
    const [userLocation, setUserLocation] = useState<LocationState | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [osmPlaces, setOsmPlaces] = useState<Place[]>([]);
    const [isFetchingMap, setIsFetchingMap] = useState(false);
    const [flyToLocation, setFlyToLocation] = useState<LocationState | null>(null);
    const [isSearchingCity, setIsSearchingCity] = useState(false);

    // New state for features
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [language, setLanguage] = useState<'en' | 'es'>('en');
    const [isThemeLoaded, setIsThemeLoaded] = useState(false);

    // Load theme from local storage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
        setIsThemeLoaded(true);
    }, []);

    // Save theme to local storage
    useEffect(() => {
        if (isThemeLoaded) {
            localStorage.setItem('theme', theme);
        }
    }, [theme, isThemeLoaded]);

    // Initial mobile detection
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Combine local mock data with live OSM data
    // OSM places that match a mock place by name (roughly) are ignored so mock data takes precedence
    const combinedPlaces = [...mockPlaces, ...osmPlaces.filter(op => !mockPlaces.some(mp => mp.name.toLowerCase() === op.name.toLowerCase()))];
    
    // Filter by search
    const filteredPlaces = combinedPlaces.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedPlace = combinedPlaces.find(p => p.id === selectedId);

    const isMobileSearchVisible = isMobile && !isMobilePanelOpen && !selectedId;

    // Actions
    const handleSelect = (id: number) => {
        setSelectedId(id);
        setFlyToLocation(null); // Clear flyTo when selecting a specific place so MapController handles centering
        if (isMobile && !isMobilePanelOpen) {
            setIsMobilePanelOpen(true);
        }
    };

    const handleClearSelection = () => {
        setSelectedId(null);
    };

    const toggleMobilePanel = (forceState: boolean | null = null) => {
        setIsMobilePanelOpen(forceState !== null ? forceState : !isMobilePanelOpen);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Copied: ${text}`);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(newLocation);
                setFlyToLocation(newLocation);
                setIsLocating(false);
                setSelectedId(null); 
                showToast("Location updated");
            },
            () => {
                setIsLocating(false);
                showToast("Unable to retrieve your location");
            }
        );
    };

    const handleZoomIn = () => {
        if (mapInstance) mapInstance.zoomIn();
    };

    const handleZoomOut = () => {
        if (mapInstance) mapInstance.zoomOut();
    };

    // Global city/area search using Nominatim (OpenStreetMap's geocoder)
    const handleGlobalSearch = async (e: React.KeyboardEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
        // Just standard search filtering if it's a typing event
        if ('target' in e && !('key' in e)) {
             setSearchQuery((e.target as HTMLInputElement).value);
             return;
        }

        // Only do full geocoding search on enter press
        if ('key' in e && e.key === 'Enter' && searchQuery.trim() !== '') {
            setIsSearchingCity(true);
            try {
                // Search for city/country
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    
                    setFlyToLocation({ lat, lng: lon });
                    setSelectedId(null);
                    showToast(`Moved to ${data[0].display_name.split(',')[0]}`);
                    
                    if (isMobile) {
                         setIsMobilePanelOpen(false);
                    }
                } else {
                    showToast("Location not found");
                }
            } catch (error) {
                console.error(error);
                showToast("Search failed");
            } finally {
                setIsSearchingCity(false);
            }
        }
    };

    return (
        <div className={`flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans selection:bg-amber-200 relative ${theme === 'dark' ? 'dark' : ''}`}>
            
            {/* Burger Menu Button */}
            <button
                onClick={() => setIsBurgerMenuOpen(!isBurgerMenuOpen)}
                className="fixed top-4 right-4 z-[2000] bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <Menu size={24} className="text-gray-700 dark:text-gray-200" />
            </button>

            {/* Burger Menu Popup */}
            {isBurgerMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 z-[1999]"
                        onClick={() => setIsBurgerMenuOpen(false)}
                    />
                    <div className="fixed top-16 right-4 z-[2000] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 w-48 overflow-hidden animate-fade-in origin-top-right">
                        <div className="flex flex-col py-1">
                            <Link
                                href="/login"
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                            >
                                <LogIn size={18} className="text-gray-400" /> Login
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                            >
                                <UserPlus size={18} className="text-gray-400" /> Register
                            </Link>
                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setIsBurgerMenuOpen(false);
                                }}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors w-full text-left"
                            >
                                <Settings size={18} className="text-gray-400" /> Settings
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setIsSettingsOpen(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Settings</h3>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Theme Setting */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Sun size={16} /> Appearance
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        <Sun size={16} /> Light
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white ring-1 ring-gray-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        <Moon size={16} /> Dark
                                    </button>
                                </div>
                            </div>

                            {/* Language Setting */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Languages size={16} /> Language
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${language === 'en' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        English
                                    </button>
                                    <button
                                        onClick={() => setLanguage('es')}
                                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${language === 'es' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        Español
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-[2000] flex items-center gap-2 transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}`}>
                <ShieldCheck size={18} className="text-green-400" />
                <span className="text-sm font-medium">{toastMessage}</span>
            </div>

            {/* Loading Map Indicator */}
            {isFetchingMap && !selectedId && (
                <div className="fixed top-20 right-4 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm shadow-md rounded-full px-4 py-2 flex items-center gap-2 z-[1000] animate-pulse border border-gray-100">
                    <Loader2 size={16} className="text-amber-500 animate-spin" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">Scanning Area</span>
                </div>
            )}

            {/* Sidebar / Details Panel */}
            <div 
                className={`absolute bottom-0 left-0 w-full h-[60vh] md:h-full md:w-96 md:relative bg-white dark:bg-gray-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl z-[1000] flex flex-col transform transition-transform duration-300 ease-in-out rounded-t-3xl md:rounded-none ${isMobile && !isMobilePanelOpen && !selectedId ? 'translate-y-full' : 'translate-y-0'}`}
            >
                {/* Mobile drag handle */}
                <div className="w-full flex justify-center py-3 md:hidden cursor-pointer" onClick={() => toggleMobilePanel()}>
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                            <MapPin size={20} className="stroke-[2.5]" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            kaf&apos;<span className="text-amber-600">map</span>
                        </h1>
                    </div>
                    {isMobile && (
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => {setIsMobilePanelOpen(false); setSelectedId(null);}}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Dynamic Content Area */}
                <div className="flex-1 overflow-y-auto relative w-full h-full bg-white dark:bg-gray-900">
                    {selectedPlace ? (
                        // --- DETAILS VIEW ---
                        <div className="animate-fade-in relative pb-8">
                            {/* Header Image area (gradient placeholder) */}
                            <div className={`h-32 bg-gradient-to-r relative ${selectedPlace.type === 'cafe' ? 'from-amber-400 to-orange-500' : 'from-orange-500 to-red-500'}`}>
                                <button onClick={handleClearSelection} className="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                                    <ArrowLeft size={16} />
                                </button>
                                {/* Tag if it's live data without details */}
                                {!selectedPlace.toiletPass && selectedPlace.menu.length === 0 && (
                                     <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/20">
                                         Unclaimed
                                     </div>
                                )}
                            </div>
                            
                            <div className="px-6 pb-6 relative -mt-6">
                                {/* Floating Icon */}
                                <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg flex items-center justify-center mb-3">
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${selectedPlace.type === 'cafe' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500'}`}>
                                        {selectedPlace.type === 'cafe' ? <Coffee size={24} /> : <Utensils size={24} />}
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight pr-2">{selectedPlace.name}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 line-clamp-2"><MapPin size={14} className="shrink-0"/> {selectedPlace.address}</p>

                                {/* Passwords Grid */}
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    {/* Toilet Code */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 text-blue-100 dark:text-blue-800/20 opacity-50 transform group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                                            <KeyRound size={80} />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Toilet Code</p>
                                            <div className="flex items-center justify-between h-8">
                                                {selectedPlace.toiletPass ? (
                                                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-tight">{selectedPlace.toiletPass}</p>
                                                ) : (
                                                    <p className="text-sm font-semibold text-gray-400 italic">N/A</p>
                                                )}
                                                {selectedPlace.toiletPass && selectedPlace.toiletPass !== 'Ask to staff' && (
                                                    <button onClick={() => handleCopy(selectedPlace.toiletPass!)} className="text-blue-500 hover:text-blue-700 bg-white dark:bg-gray-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-md p-1.5 shadow-sm transition-colors" title="Copy">
                                                        <Copy size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* WiFi */}
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 relative overflow-hidden group">
                                        <div className="absolute -right-4 -top-4 text-green-100 dark:text-green-800/20 opacity-50 transform group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                                            <Wifi size={80} />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Free WiFi</p>
                                            <div className="flex items-center justify-between h-8">
                                                {selectedPlace.wifiPass ? (
                                                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate pr-2">{selectedPlace.wifiPass}</p>
                                                ) : (
                                                    <p className="text-sm font-semibold text-gray-400 italic">No WiFi</p>
                                                )}
                                                {selectedPlace.wifiPass && (
                                                    <button onClick={() => handleCopy(selectedPlace.wifiPass!)} className="text-green-600 hover:text-green-800 bg-white dark:bg-gray-800 dark:text-green-400 dark:hover:text-green-300 rounded-md p-1.5 shadow-sm transition-colors" title="Copy">
                                                        <Copy size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Section (Snippet) */}
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Menu Snippet</h3>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md">Last updated today</span>
                                    </div>
                                    <div className={`bg-white dark:bg-gray-800 border rounded-xl shadow-sm ${selectedPlace.menu.length > 0 ? 'border-gray-100 dark:border-gray-700 p-4' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50 p-6 flex flex-col items-center justify-center text-center'}`}>
                                        {selectedPlace.menu.length > 0 ? (
                                            <div className="space-y-0">
                                                {selectedPlace.menu.slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                                                        <span className="text-gray-700 dark:text-gray-300">{item.item}</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{item.price}</span>
                                                    </div>
                                                ))}
                                                {selectedPlace.menu.length > 3 && (
                                                    <div className="pt-3 text-center border-t border-gray-50 dark:border-gray-700 mt-2">
                                                        <button onClick={() => setIsMenuFullscreen(true)} className="text-xs font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 flex items-center justify-center gap-1 w-full">
                                                            <Maximize2 size={12} /> See all {selectedPlace.menu.length} items
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No menu prices submitted yet.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button className="w-full mt-6 bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                    Update Info
                                </button>
                            </div>
                        </div>
                    ) : (
                        // --- LIST VIEW ---
                        <div className="p-6">
                            <div className="relative mb-6">
                                <input 
                                    type="text" 
                                    id="search-input" 
                                    placeholder="Search cafes or restaurants..." 
                                    className="w-full bg-gray-100 dark:bg-gray-800 dark:text-white border-none rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-gray-700 transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    value={searchQuery} 
                                    onChange={handleGlobalSearch}
                                    onKeyDown={handleGlobalSearch}
                                />
                                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                {isSearchingCity && <Loader2 className="absolute right-4 top-3.5 text-amber-500 animate-spin" size={18} />}
                            </div>
                            
                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                                Nearby Places
                            </h2>
                            
                            <div className="space-y-3 pb-8">
                                {filteredPlaces.length === 0 && !isFetchingMap && (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        <MapIcon size={24} className="mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                                        No places found.
                                    </div>
                                )}

                                {filteredPlaces.map(place => {
                                    const isCafe = place.type === 'cafe';
                                    const hasData = place.toiletPass || place.menu.length > 0;

                                    return (
                                    <div key={place.id} onClick={() => handleSelect(place.id)} className={`group cursor-pointer bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 transition-all flex items-start gap-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCafe ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500'}`}>
                                            {isCafe ? <Coffee size={18} /> : <Utensils size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-500 transition-colors pr-2">{place.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{place.address}</p>
                                            
                                            <div className="flex gap-3 mt-2 flex-wrap">
                                                {place.rating > 0 && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {place.rating}</span>}
                                                {place.toiletPass && <span className="text-xs font-medium text-blue-500 dark:text-blue-400 flex items-center gap-1"><KeyRound size={12}/> Code</span>}
                                                {place.menu.length > 0 && <span className="text-xs font-medium text-green-600 dark:text-green-500 flex items-center gap-1"><Utensils size={12}/> Menu</span>}
                                                {!hasData && <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1 uppercase tracking-wider text-[10px]">Unclaimed</span>}
                                            </div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 w-full h-full z-0 relative bg-gray-100 dark:bg-gray-900">
                <MapComponent 
                    places={filteredPlaces} 
                    onSelect={handleSelect} 
                    selectedId={selectedId} 
                    isMobile={isMobile} 
                    userLocation={userLocation} 
                    flyToLocation={flyToLocation}
                    onOsmPlacesFetch={setOsmPlaces}
                    setIsFetchingMap={setIsFetchingMap}
                    onMapReady={setMapInstance}
                    theme={theme}
                />
                
                {/* Floating Map Controls */}
                <div className={`absolute left-6 z-[500] flex flex-col gap-3 transition-all duration-300 ${isMobileSearchVisible ? 'bottom-24' : 'bottom-6'}`}>
                    <button 
                        onClick={handleLocateMe}
                        className={`w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700 ${isLocating ? 'animate-pulse text-blue-500' : ''}`}
                        title="Locate Me"
                    >
                        {isLocating ? <Loader2 size={22} className="animate-spin text-blue-500" /> : <Navigation size={20} className={`transform -rotate-45 ${userLocation ? "text-blue-500 fill-blue-500" : ""}`} />}
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                        title="Zoom In"
                    >
                        <Plus size={20} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                        title="Zoom Out"
                    >
                        <Minus size={20} />
                    </button>
                </div>

                {/* Mobile Open Panel Button (Visible when panel is closed on mobile) */}
                {isMobileSearchVisible && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[500] w-[90%] max-w-sm">
                        <button
                            onClick={() => {
                                toggleMobilePanel(true);
                                setTimeout(() => {
                                    document.getElementById('search-input')?.focus();
                                }, 100);
                            }}
                            className="w-full bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-4 py-3 rounded-xl shadow-lg font-medium border border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left"
                        >
                            <Search size={20} className="text-gray-400" />
                            <span className="text-sm">Search places...</span>
                        </button>
                    </div>
                )}
            </div>

            {/* FULLSCREEN MENU MODAL */}
            {isMenuFullscreen && selectedPlace && (
                <div className="fixed inset-0 z-[3000] bg-white dark:bg-gray-900 flex flex-col animate-fade-in overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${selectedPlace.type === 'cafe' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500'}`}>
                                {selectedPlace.type === 'cafe' ? <Coffee size={20} /> : <Utensils size={20} />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">{selectedPlace.name}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Full Menu</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsMenuFullscreen(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Modal Content (Scrollable List) */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                                {selectedPlace.menu.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4">
                                        <div className="flex-1 pr-4">
                                            <h4 className="text-base text-gray-800 dark:text-gray-200 font-medium">{item.item}</h4>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                            <span className="text-base font-semibold text-gray-900 dark:text-white">{item.price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center mt-6 mb-8 flex flex-col items-center gap-2">
                                <ShieldCheck size={20} className="text-gray-300 dark:text-gray-600" />
                                <p className="text-xs text-gray-400 dark:text-gray-500">Prices are user-submitted and may not be 100% accurate or up-to-date.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
