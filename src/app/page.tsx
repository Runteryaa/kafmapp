"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
    MapPin, Search, Coffee, Utensils, Pizza, Beer,
    Star, ArrowLeft, KeyRound, Wifi, Copy, X, ShieldCheck, MapIcon, Maximize2, Loader2, Navigation,
    Menu, Settings, LogIn, UserPlus, Moon, Sun, Languages, Plus, Minus, RefreshCw, LogOut, User, Flag, ExternalLink, AlertTriangle, Pencil, ThumbsUp, Download
} from "lucide-react";
import { mockPlaces, LocationState, Place } from "../lib/types"; // Import data
import { LoginModal, RegisterModal } from "../components/AuthModals";
import { UpdateInfoModal } from "../components/UpdateInfoModal"; // Import new modal
import ReportModal from "../components/ReportModal"; // Import report modal
import { client, databases } from "../lib/appwrite"; // Import appwrite client
import { ID, Query } from "appwrite"; // Import appwrite ID and Query
import { useAuth } from "../hooks/useAuth";
import { getTranslation } from "../lib/translations";

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

const getPlaceStyle = (type: string) => {
    switch (type) {
        case 'cafe':
            return {
                Icon: Coffee,
                bgClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500',
                gradientClass: 'from-amber-400 to-orange-500',
                borderHoverClass: 'hover:border-amber-200 dark:hover:border-amber-900',
                textHoverClass: 'group-hover:text-amber-700 dark:group-hover:text-amber-500'
            };
        case 'fast_food':
            return {
                Icon: Pizza,
                bgClass: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500',
                gradientClass: 'from-red-500 to-red-600',
                borderHoverClass: 'hover:border-red-200 dark:hover:border-red-900',
                textHoverClass: 'group-hover:text-red-700 dark:group-hover:text-red-500'
            };
        case 'bar':
        case 'pub':
            return {
                Icon: Beer,
                bgClass: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-500',
                gradientClass: 'from-purple-500 to-purple-600',
                borderHoverClass: 'hover:border-purple-200 dark:hover:border-purple-900',
                textHoverClass: 'group-hover:text-purple-700 dark:group-hover:text-purple-500'
            };
        case 'restaurant':
        default:
            return {
                Icon: Utensils,
                bgClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500',
                gradientClass: 'from-orange-500 to-red-500',
                borderHoverClass: 'hover:border-orange-200 dark:hover:border-orange-900',
                textHoverClass: 'group-hover:text-orange-700 dark:group-hover:text-orange-500'
            };
    }
};

export default function Home() {
    const [language, setLanguage] = useState<'tr' | 'en'>('tr');
    const t = getTranslation(language);
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
    const [manualFetchTrigger, setManualFetchTrigger] = useState(0);

    const [dbPlaces, setDbPlaces] = useState<Place[]>([]);
    const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

    // Use the useAuth hook for authentication
    const { user, logout } = useAuth();

    // Panel drag state
    const [panelHeight, setPanelHeight] = useState(60); // vh
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    // New state for features
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mapInstance, setMapInstance] = useState<any>(null);
    const [isBurgerMenuOpen, setIsBurgerMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [isThemeLoaded, setIsThemeLoaded] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [placeReports, setPlaceReports] = useState<any[]>([]);
    const [placeUpdates, setPlaceUpdates] = useState<any[]>([]);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(
                function (registration) {
                    console.log('Service Worker registration successful with scope: ', registration.scope);
                },
                function (err) {
                    console.log('Service Worker registration failed: ', err);
                }
            );
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app is already installed
        const checkInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsAppInstalled(true);
            }
        };
        checkInstalled();
        window.addEventListener('appinstalled', () => setIsAppInstalled(true));

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', () => setIsAppInstalled(true));
        };
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) {
            showToast(t.installInstructions);
            return;
        }
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            } else {
                console.log('User dismissed the A2HS prompt');
            }
            setInstallPrompt(null);
        });
    };

    useEffect(() => {
        if (selectedId) {
            databases.listDocuments('kafmap', 'pending_updates', [
                Query.equal('placeId', selectedId.toString())
            ]).then(res => {
                const docs = res.documents;
                setPlaceReports(docs.filter(d => d.type === 'report'));
                setPlaceUpdates(docs.filter(d => d.type === 'update'));
            }).catch(err => {
                console.error("Failed to fetch pending updates/reports", err);
            });
        } else {
            setPlaceReports([]);
            setPlaceUpdates([]);
        }
    }, [selectedId]);

    const hasReport = (code: string) => placeReports.some(r => {
        try { return JSON.parse(r.payload).reasonCode === code; } catch { return false; }
    });

    const [pendingVerificationState, setPendingVerificationState] = useState<{
        updateId: string,
        field: 'toiletPass' | 'wifiPass' | 'menu',
        newValue: any,
        currentVerifyCount: number,
        fullPayload: any
    } | null>(null);

    const getPendingUpdate = (field: 'toiletPass' | 'wifiPass' | 'menu') => {
        if (!selectedPlace || !selectedPlace.isRegistered) return null;
        for (const update of placeUpdates) {
            try {
                const payload = JSON.parse(update.payload);
                let isChanged = false;

                if (field === 'menu') {
                    if (payload.menu && payload.menu !== JSON.stringify(selectedPlace.menu)) isChanged = true;
                } else {
                    if (payload[field] !== undefined && payload[field] !== selectedPlace[field]) isChanged = true;
                }

                if (isChanged) {
                    return {
                        id: update.$id,
                        value: field === 'menu' ? payload.menu : payload[field],
                        verifyCount: payload.verifyCount || 0,
                        fullPayload: payload
                    };
                }
            } catch { continue; }
        }
        return null;
    };

    const handleVerifyPendingUpdate = async () => {
        if (!user) {
            showToast(t.loginToVerify);
            setIsLoginOpen(true);
            return;
        }
        if (!pendingVerificationState || !selectedPlace) return;

        const { updateId, field, newValue, currentVerifyCount, fullPayload } = pendingVerificationState;

        const verifyKey = `verified_pending_${updateId}_user_${user.$id}`;
        if (localStorage.getItem(verifyKey)) {
            showToast(t.alreadyVerifiedPending);
            return;
        }

        const newCount = currentVerifyCount + 1;

        if (newCount >= 2) {
            try {
                const docId = `place_${selectedPlace.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
                const placesPayload: any = { ...fullPayload };

                if (placesPayload.toiletPass !== undefined && placesPayload.toiletPass !== selectedPlace.toiletPass) {
                    placesPayload.wcUpvotes = 0;
                    placesPayload.wcUpdatedAt = new Date().toISOString();
                }
                if (placesPayload.wifiPass !== undefined && placesPayload.wifiPass !== selectedPlace.wifiPass) {
                    placesPayload.wifiUpvotes = 0;
                    placesPayload.wifiUpdatedAt = new Date().toISOString();
                }
                if (placesPayload.menu !== undefined && placesPayload.menu !== JSON.stringify(selectedPlace.menu)) {
                    placesPayload.menuUpvotes = 0;
                    placesPayload.menuUpdatedAt = new Date().toISOString();
                }
                delete placesPayload.verifyCount;

                await databases.updateDocument('kafmap', 'places', docId, placesPayload);
                await databases.deleteDocument('kafmap', 'pending_updates', updateId);

                showToast(t.updateVerifiedApplied);
                setPendingVerificationState(null);
                fetchDbPlaces();
                setPlaceUpdates(placeUpdates.filter(u => u.$id !== updateId));
            } catch (err) {
                console.error(err);
                showToast(t.failedToApplyUpdate);
            }
        } else {
            try {
                fullPayload.verifyCount = newCount;
                await databases.updateDocument('kafmap', 'pending_updates', updateId, {
                    payload: JSON.stringify(fullPayload)
                });
                localStorage.setItem(verifyKey, "true");
                showToast(t.verificationSubmitted);
                setPendingVerificationState(null);
                setPlaceUpdates(placeUpdates.map(u => {
                    if (u.$id === updateId) return { ...u, payload: JSON.stringify(fullPayload) };
                    return u;
                }));
            } catch (err) {
                console.error(err);
                showToast(t.failedToVerifyUpdate);
            }
        }
    };

    // Fetch places data from Appwrite DB and construct full Place objects
    const fetchDbPlaces = async () => {
        try {
            const response = await databases.listDocuments('kafmap', 'places');
            const placesList: Place[] = response.documents.map((doc: any) => ({
                id: parseInt(doc.placeId),
                name: doc.name,
                lat: doc.lat ? parseFloat(doc.lat.toString()) : 0, // Explicitly parse float for coordinates
                lng: doc.lng ? parseFloat(doc.lng.toString()) : 0,
                type: doc.type || 'restaurant',
                address: doc.address || '',
                toiletPass: doc.toiletPass,
                wifiPass: doc.wifiPass,
                menuUrl: doc.menuUrl || null,
                // Calculate average rating from ratingSum and ratingCount
                rating: Number(doc.ratingCount) > 0 ? Number(doc.ratingSum) / Number(doc.ratingCount) : 0,
                menu: doc.menu ? JSON.parse(doc.menu) : [],
                isRegistered: true,
                wcUpdatedAt: doc.wcUpdatedAt || doc.$updatedAt,
                wcUpvotes: doc.wcUpvotes || 0,
                wifiUpdatedAt: doc.wifiUpdatedAt || doc.$updatedAt,
                wifiUpvotes: doc.wifiUpvotes || 0,
                menuUpdatedAt: doc.menuUpdatedAt || doc.$updatedAt,
                menuUpvotes: doc.menuUpvotes || 0,
            }));
            setDbPlaces(placesList);
        } catch (error) {
            console.error("Failed to fetch places from DB:", error);
        }
    };

    useEffect(() => {
        fetchDbPlaces();
    }, []);

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

    // Auto-locate user on initial load
    useEffect(() => {
        if (!navigator.geolocation) return;

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
            },
            (error) => {
                console.warn("Auto-location failed on load:", error);
                setIsLocating(false);
            }
        );
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            showToast(t.loggedOutSuccessfully);
            setIsBurgerMenuOpen(false);
        } catch (error) {
            console.error("Logout failed", error);
            showToast(t.logoutFailed);
        }
    };

    const handleRatePlace = async (ratingValue: number) => {
        if (!user) {
            showToast(t.loginToRate);
            setIsLoginOpen(true);
            return;
        }

        if (!selectedPlace) return;

        // Block multiple ratings locally per user
        const ratedKey = `rated_place_${selectedPlace.id}_user_${user.$id}`;
        if (localStorage.getItem(ratedKey)) {
            showToast(t.alreadyRated);
            return;
        }

        setIsRatingSubmitting(true);
        const docId = `place_${selectedPlace.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);

        try {
            // First, check if the place exists in DB
            try {
                const doc = await databases.getDocument('kafmap', 'places', docId);

                // Place exists, update rating
                // Note: This is a simple implementation. A robust one would store individual user ratings in a sub-collection
                // to prevent multiple votes per user, but for now we'll just increment sum/count on the place doc.
                const currentSum = doc.ratingSum ? Number(doc.ratingSum) : 0;
                const currentCount = doc.ratingCount ? Number(doc.ratingCount) : 0;

                await databases.updateDocument('kafmap', 'places', docId, {
                    ratingSum: (currentSum + ratingValue).toString(),
                    ratingCount: (currentCount + 1).toString()
                });

            } catch (err: any) {
                // If it doesn't exist (404), create a new one with initial rating
                if (err.code === 404) {
                    await databases.createDocument('kafmap', 'places', docId, {
                        placeId: selectedPlace.id.toString(),
                        name: selectedPlace.name,
                        lat: selectedPlace.lat.toString(),
                        lng: selectedPlace.lng.toString(),
                        type: selectedPlace.type,
                        address: selectedPlace.address,
                        ratingSum: ratingValue.toString(),
                        ratingCount: "1"
                    });
                } else {
                    throw err;
                }
            }

            // After a successful operation, set the local flag to prevent multiple spam ratings
            localStorage.setItem(ratedKey, "true");

            showToast(t.ratingSubmitted);
            fetchDbPlaces(); // Refresh local data
        } catch (err) {
            console.error("Rating failed", err);
            showToast(t.failedRating);
        } finally {
            setIsRatingSubmitting(false);
        }
    };

    const handleReportPlace = () => {
        if (!selectedPlace) return;
        setIsReportModalOpen(true);
    };

    const handleVerifyField = async (field: 'wc' | 'wifi' | 'menu') => {
        if (!user) {
            showToast(t.loginToUpdate);
            setIsLoginOpen(true);
            return;
        }

        if (!selectedPlace) return;

        const verifyKey = `verified_${field}_place_${selectedPlace.id}_user_${user.$id}`;
        if (localStorage.getItem(verifyKey)) {
            showToast(t.youHaveAlreadyVerifiedThis);
            return;
        }

        const docId = `place_${selectedPlace.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
        try {
            const currentUpvotes = selectedPlace[`${field}Upvotes`] || 0;
            const updatePayload: any = {};
            updatePayload[`${field}Upvotes`] = currentUpvotes + 1;

            await databases.updateDocument('kafmap', 'places', docId, updatePayload);
            localStorage.setItem(verifyKey, "true");
            showToast(t.verificationSubmitted);
            fetchDbPlaces(); // Refresh local data
        } catch (err) {
            console.error("Verification failed", err);
            showToast(t.failedToSubmitVerification);
        }
    };


    // Merge Strategies:
    // 1. Start with DB places (these are "registered" and have rich data)
    // 2. Add OSM places ONLY if they are NOT already in the DB list (by ID)
    // This ensures that if a place is in the DB, we show THAT version (which has passwords/menu), 
    // regardless of whether it is currently visible on the map or not.
    // The MapComponent will still fetch OSM data based on view, but we prioritize our DB data.

    const combinedPlacesMap = new Map<number, Place>();

    // First add all DB places (they persist globally in the app state)
    dbPlaces.forEach(p => combinedPlacesMap.set(p.id, p));

    // Then add OSM places if they don't exist in the map
    osmPlaces.forEach(p => {
        if (!combinedPlacesMap.has(p.id)) {
            combinedPlacesMap.set(p.id, p);
        } else {
            // DB places might have missing coordinates (0, 0) if saved before schema updates.
            // If the live OSM node gives us real coordinates, patch the DB entry dynamically so it isn't orphaned off the coast of Africa!
            const existingDbPlace = combinedPlacesMap.get(p.id)!;
            if (!existingDbPlace.lat || existingDbPlace.lat === 0 || !existingDbPlace.lng || existingDbPlace.lng === 0) {
                existingDbPlace.lat = p.lat;
                existingDbPlace.lng = p.lng;
            }
        }
    });

    const combinedPlaces = Array.from(combinedPlacesMap.values());

    // Filter by search
    const filteredPlaces = combinedPlaces.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedPlace = combinedPlaces.find(p => p.id === selectedId);

    const pendingWcUpdate = getPendingUpdate('toiletPass');
    const pendingWifiUpdate = getPendingUpdate('wifiPass');
    const pendingMenuUpdate = getPendingUpdate('menu');

    const isMobileSearchVisible = isMobile && !isMobilePanelOpen && !selectedId;

    // Actions
    const handleSelect = (id: number) => {
        setSelectedId(id);
        const place = combinedPlaces.find(p => p.id === id);

        // If the place is far away (e.g. from search result not in view), fly to it
        if (place) {
            // Only fly if we are not already very close
            setFlyToLocation({ lat: place.lat, lng: place.lng });
        }

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

    const getDaysDiff = (dateStr: string | undefined | null) => {
        if (!dateStr) return -1;
        const d1 = new Date(dateStr);
        const d2 = new Date();
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const renderVerificationFooter = (
        field: 'wc' | 'wifi' | 'menu',
        updatedAt: string | undefined | null,
        upvotes: number | undefined,
        pendingUpdateItem: any = null,
        reportMessage: string | null = null
    ) => {
        if (!updatedAt) return null;
        const daysDiff = getDaysDiff(updatedAt);
        if (daysDiff === -1) return null;

        const isOutdated = daysDiff > 30 && (upvotes || 0) === 0;

        let isVerifiedLocally = false;
        if (typeof window !== 'undefined' && user && selectedPlace) {
            const verifyKey = `verified_${field}_place_${selectedPlace.id}_user_${user.$id}`;
            isVerifiedLocally = !!localStorage.getItem(verifyKey);
        }

        return (
            <div className="flex flex-col mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 gap-2">
                {/* Alerts Section */}
                {(isOutdated || pendingUpdateItem || reportMessage) && (
                    <div className="flex flex-col gap-1.5 pt-0.5">
                        {reportMessage && (
                            <button
                                onClick={() => setAlertMessage(t.flagTooltip.replace('{reason}', reportMessage.toLowerCase()))}
                                className="flex items-center gap-1.5 text-left text-[11px] font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                            >
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{t.flagTooltip.replace('{reason}', reportMessage)}</span>
                            </button>
                        )}
                        {pendingUpdateItem && (
                            <button
                                onClick={() => setPendingVerificationState({
                                    updateId: pendingUpdateItem.id,
                                    field: field === 'wc' ? 'toiletPass' : field === 'wifi' ? 'wifiPass' : 'menu',
                                    newValue: pendingUpdateItem.value,
                                    currentVerifyCount: pendingUpdateItem.verifyCount,
                                    fullPayload: pendingUpdateItem.fullPayload
                                })}
                                className="flex items-center gap-1.5 text-left text-[11px] font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                            >
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{t.pendingUpdateVerifyHere}</span>
                            </button>
                        )}
                        {isOutdated && !pendingUpdateItem && !reportMessage && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setAlertMessage(t.infoMightBeOutdated); }}
                                className="flex items-center gap-1.5 text-left text-[11px] font-medium text-amber-600 dark:text-amber-500 hover:text-amber-700 transition-colors"
                            >
                                <AlertTriangle size={12} className="shrink-0" />
                                <span>{t.infoMightBeOutdated}</span>
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1 font-medium bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            {daysDiff === 0 ? t.updatedToday : t.updatedDaysAgo.replace('{days}', daysDiff.toString())}
                        </span>
                        <span className="font-medium opacity-80">&bull; {t.usedByPeople.replace('{count}', (upvotes || 0).toString())}</span>
                    </div>
                    <button
                        onClick={() => handleVerifyField(field)}
                        className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-md transition-colors border ml-2 ${isVerifiedLocally ? 'bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-500 border-green-200/50 dark:border-green-800/50' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-500 border-amber-200/50 dark:border-amber-800/50'}`}
                        title={isVerifiedLocally ? 'Verified' : t.verifyInfo}
                    >
                        <ThumbsUp size={12} className="stroke-[2.5]" />
                    </button>
                </div>
            </div>
        );
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            showToast(t.geolocationNotSupported);
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
                showToast(t.locationUpdated);
            },
            () => {
                setIsLocating(false);
                showToast(t.unableToRetrieveLocation);
            }
        );
    };

    const handleZoomIn = () => {
        if (mapInstance) mapInstance.zoomIn();
    };

    const handleZoomOut = () => {
        if (mapInstance) mapInstance.zoomOut();
    };

    // Panel Drag Handlers
    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isMobile) return;

        // Only trigger if we're touching the handle or header, not the content
        // This is handled by where we attach the events

        setIsDragging(true);
        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        dragStartY.current = clientY;
        dragStartHeight.current = panelHeight;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || !isMobile) return;

        const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
        const deltaY = dragStartY.current - clientY; // Positive = Drag Up
        const windowHeight = window.innerHeight;

        // Convert delta pixels to vh
        const deltaVh = (deltaY / windowHeight) * 100;

        // Calculate new height
        let newHeight = dragStartHeight.current + deltaVh;

        // Clamp values
        if (newHeight > 100) newHeight = 100;
        if (newHeight < 20) newHeight = 20;

        setPanelHeight(newHeight);
    };

    const handleTouchEnd = () => {
        if (!isDragging || !isMobile) return;
        setIsDragging(false);

        // Snap logic
        if (panelHeight > 80) { // If dragged past 80%, snap to full
            setPanelHeight(100);
        } else if (panelHeight < 45) { // If dragged below 45%, close
            setIsMobilePanelOpen(false);
            setSelectedId(null);
            // Reset height for next open after transition
            setTimeout(() => setPanelHeight(60), 300);
        } else { // Snap back to default
            setPanelHeight(60);
        }
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
                    showToast(t.locationNotFound);
                }
            } catch (error) {
                console.error(error);
                showToast(t.searchFailed);
            } finally {
                setIsSearchingCity(false);
            }
        }
    };

    return (
        <div className={`flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-sans selection:bg-amber-200 relative ${theme === 'dark' ? 'dark' : ''}`}>

            {/* Burger Menu Button */}
            <button
                onClick={() => setIsBurgerMenuOpen(!isBurgerMenuOpen)}
                className="fixed top-4 right-4 z-[2000] bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                {user ? (
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs uppercase">
                        {user.name ? user.name.charAt(0) : <User size={14} />}
                    </div>
                ) : (
                    <Menu size={24} className="text-gray-700 dark:text-gray-200" />
                )}
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
                            {!user ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsLoginOpen(true);
                                            setIsBurgerMenuOpen(false);
                                        }}
                                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors w-full text-left"
                                    >
                                        <LogIn size={18} className="text-gray-400" /> {t.login}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsRegisterOpen(true);
                                            setIsBurgerMenuOpen(false);
                                        }}
                                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors w-full text-left"
                                    >
                                        <UserPlus size={18} className="text-gray-400" /> {t.register}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="px-4 py-3 bg-gray-100 dark:bg-gray-900/50 flex flex-col gap-1">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.signedInAs}</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.name || user.email}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400 transition-colors w-full text-left"
                                    >
                                        <LogOut size={18} className="text-red-400" /> {t.logout}
                                    </button>
                                </>
                            )}

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                            <button
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setIsBurgerMenuOpen(false);
                                }}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors w-full text-left"
                            >
                                <Settings size={18} className="text-gray-400" /> {t.settings}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Auth Modals */}
            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onSwitchToRegister={() => {
                    setIsLoginOpen(false);
                    setIsRegisterOpen(true);
                }}
                t={t}
            />
            <RegisterModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSwitchToLogin={() => {
                    setIsRegisterOpen(false);
                    setIsLoginOpen(true);
                }}
                t={t}
            />

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        onClick={() => setIsSettingsOpen(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{t.settings}</h3>
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Install App Button */}
                            {!isAppInstalled && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 flex items-center justify-between border border-amber-100 dark:border-amber-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-500 p-2 rounded-lg">
                                            <Download size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-sm">{t.installApp}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.installApp}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleInstallClick}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${installPrompt ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                                    >
                                        {t.installApp}
                                    </button>
                                </div>
                            )}

                            {/* Theme Setting */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Sun size={16} /> {t.appearance}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        <Sun size={16} /> {t.light}
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white ring-1 ring-gray-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        <Moon size={16} /> {t.dark}
                                    </button>
                                </div>
                            </div>

                            {/* Language Setting */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Languages size={16} /> {t.language}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setLanguage('tr')}
                                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${language === 'tr' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        {t.turkish}
                                    </button>
                                    <button
                                        onClick={() => setLanguage('en')}
                                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${language === 'en' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        {t.english}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-sm"
                            >
                                {t.done}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Info Modal */}
            <UpdateInfoModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                place={selectedPlace || null}
                onSuccess={() => {
                    fetchDbPlaces(); // Refresh DB data
                    showToast(t.changesSubmittedForAdmin);
                }}
                t={t}
            />

            {/* Toast Notification */}
            <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-[2000] flex items-center gap-2 transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}`}>
                <ShieldCheck size={18} className="text-green-400" />
                <span className="text-sm font-medium">{toastMessage}</span>
            </div>

            {/* Loading Map Indicator */}
            {isFetchingMap && !selectedId && (
                <div className="fixed top-20 right-4 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm shadow-md rounded-full px-4 py-2 flex items-center gap-2 z-[1000] animate-pulse border border-gray-100">
                    <Loader2 size={16} className="text-amber-500 animate-spin" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{t.scanningArea}</span>
                </div>
            )}

            {/* Sidebar / Details Panel */}
            <div
                className={`absolute bottom-0 left-0 w-full md:h-full md:w-96 md:relative bg-white dark:bg-gray-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl z-[1000] flex flex-col transform transition-transform duration-300 ease-in-out rounded-t-3xl md:rounded-none ${isMobile && !isMobilePanelOpen && !selectedId ? 'translate-y-full' : 'translate-y-0'}`}
                style={{
                    height: isMobile ? `${panelHeight}vh` : '100%',
                    transition: isDragging ? 'none' : undefined
                }}
            >
                {/* Mobile drag handle */}
                <div
                    className="w-full flex justify-center py-3 md:hidden cursor-grab active:cursor-grabbing touch-none"
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                </div>

                {/* Header - Also draggable */}
                <div
                    className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 bg-white dark:bg-gray-800 touch-none"
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                            <MapPin size={20} className="stroke-[2.5]" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Kaf&apos;<span className="text-amber-600">Map</span>
                        </h1>
                    </div>
                    {isMobile && (
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => { setIsMobilePanelOpen(false); setSelectedId(null); }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Dynamic Content Area */}
                <div className="flex-1 overflow-y-auto relative w-full h-full bg-white dark:bg-gray-800">
                    {selectedPlace ? (() => {
                        const style = getPlaceStyle(selectedPlace.type);
                        const { Icon } = style;
                        return (
                            // --- DETAILS VIEW ---
                            <div className="animate-fade-in relative pb-8 pt-6">
                                <div className="px-6 pb-6">
                                    {/* Header Controls */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={handleClearSelection} className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0">
                                                <ArrowLeft size={16} />
                                            </button>
                                            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${style.bgClass}`}>
                                                <Icon size={24} className="sm:w-7 sm:h-7" />
                                            </div>

                                            {/* Star Rating Display */}
                                            <div className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        disabled={isRatingSubmitting}
                                                        onClick={() => handleRatePlace(star)}
                                                        className="focus:outline-none transform hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed leading-none flex items-center justify-center"
                                                    >
                                                        <Star
                                                            size={16}
                                                            className={`w-4 h-4 sm:w-5 sm:h-5 ${star <= Math.round(selectedPlace.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 hover:fill-yellow-400'}`}
                                                        />
                                                    </button>
                                                ))}
                                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-1 font-medium">
                                                    {selectedPlace.rating ? selectedPlace.rating.toFixed(1) : ''}
                                                </span>
                                                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                                <button onClick={handleReportPlace} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full dark:hover:bg-red-900/20 hover:bg-red-50" title="Report inaccurate info">
                                                    <Flag size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight pr-2">{selectedPlace.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 line-clamp-2"><MapPin size={14} className="shrink-0" /> {selectedPlace.address}</p>

                                    {/* Passwords Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-6">
                                        {/* Toilet Code */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 relative overflow-hidden group">
                                            <div className="absolute -right-4 -top-4 text-blue-100 dark:text-blue-800/20 opacity-50 transform group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                                                <KeyRound size={80} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t.toiletCode}</p>
                                                    <div className="ml-auto flex items-center gap-1.5">
                                                        <button onClick={() => { if (!user) { showToast(t.loginToUpdate); setIsLoginOpen(true); } else { setIsUpdateModalOpen(true); } }} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center justify-center bg-blue-100/50 dark:bg-blue-900/50 rounded-md p-1" title="Edit">
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between h-8">
                                                    {selectedPlace.toiletPass ? (
                                                        <p className="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-tight">{selectedPlace.toiletPass}</p>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-400 italic">{t.noWC}</p>
                                                    )}
                                                </div>
                                                {selectedPlace.isRegistered && (selectedPlace.toiletPass && selectedPlace.toiletPass !== 'Ask to staff' && selectedPlace.toiletPass !== 'No' && selectedPlace.toiletPass !== 'None' && selectedPlace.toiletPass !== 'free' && selectedPlace.toiletPass !== 'ücretsiz' && selectedPlace.toiletPass !== 'ucretsiz' && selectedPlace.toiletPass !== 'Free' && selectedPlace.toiletPass !== 'Ücretsiz' && selectedPlace.toiletPass !== 'Ucretsiz') && renderVerificationFooter('wc', selectedPlace.wcUpdatedAt, selectedPlace.wcUpvotes, pendingWcUpdate, hasReport('wcPasswordIncorrect') ? t.wcPasswordIncorrect : null)}
                                            </div>
                                        </div>

                                        {/* WiFi */}
                                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 relative overflow-hidden group">
                                            <div className="absolute -right-4 -top-4 text-green-100 dark:text-green-800/20 opacity-50 transform group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                                                <Wifi size={80} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">{t.freeWifi}</p>
                                                    <div className="ml-auto flex items-center gap-1.5">
                                                        <button onClick={() => { if (!user) { showToast(t.loginToUpdate); setIsLoginOpen(true); } else { setIsUpdateModalOpen(true); } }} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors flex items-center justify-center bg-green-100/50 dark:bg-green-900/50 rounded-md p-1" title="Edit">
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between h-8">
                                                    {selectedPlace.wifiPass ? (
                                                        <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate pr-2">{selectedPlace.wifiPass}</p>
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-400 italic">{t.noWifi}</p>
                                                    )}
                                                    {selectedPlace.wifiPass && (
                                                        <button onClick={() => handleCopy(selectedPlace.wifiPass!)} className="text-green-600 hover:text-green-800 bg-white dark:bg-gray-800 dark:text-green-400 dark:hover:text-green-300 rounded-md p-1.5 shadow-sm transition-colors" title="Copy">
                                                            <Copy size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                {selectedPlace.isRegistered && (selectedPlace.wifiPass && selectedPlace.wifiPass !== 'No' && selectedPlace.wifiPass !== 'None' && selectedPlace.wifiPass !== 'Free' && selectedPlace.wifiPass !== 'Open' && selectedPlace.wifiPass !== 'Ask to staff') && renderVerificationFooter('wifi', selectedPlace.wifiUpdatedAt, selectedPlace.wifiUpvotes, pendingWifiUpdate, hasReport('wifiPasswordIncorrect') ? t.wifiPasswordIncorrect : null)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Section (Snippet) */}
                                    <div className="mt-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{t.menuSnippet}</h3>
                                                <div className="ml-auto flex items-center gap-1.5">
                                                    <button onClick={() => { if (!user) { showToast(t.loginToUpdate); setIsLoginOpen(true); } else { setIsUpdateModalOpen(true); } }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-md flex items-center justify-center" title={t.edit}>
                                                        <Pencil size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md">{t.lastUpdatedToday}</span>
                                        </div>
                                        {selectedPlace.menuUrl ? (
                                            <a
                                                href={selectedPlace.menuUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800"
                                            >
                                                <ExternalLink size={18} />
                                                {t.openUrlMenu}
                                            </a>
                                        ) : (
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
                                                                    <Maximize2 size={12} /> {t.seeAllItems.replace('{count}', selectedPlace.menu.length.toString())}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t.noMenuPrices}</p>
                                                )}
                                            </div>
                                        )}
                                        {selectedPlace.isRegistered && (selectedPlace.menu.length > 0 || selectedPlace.menuUrl) && renderVerificationFooter('menu', selectedPlace.menuUpdatedAt, selectedPlace.menuUpvotes, pendingMenuUpdate, hasReport('menuPricesOutdated') ? t.menuPricesOutdated : null)}
                                    </div>

                                    {/* Action Button Removed -> Use Pencils Instead */}
                                </div>
                            </div>
                        );
                    })() : (
                        // --- LIST VIEW ---
                        <div className="p-6">
                            <div className="relative mb-6">
                                <input
                                    type="text"
                                    id="search-input"
                                    placeholder={t.searchPlaceholder}
                                    className="w-full bg-gray-100 dark:bg-gray-900/50 dark:text-white border-none rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-gray-700 transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    value={searchQuery}
                                    onChange={handleGlobalSearch}
                                    onKeyDown={handleGlobalSearch}
                                />
                                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                                {isSearchingCity && <Loader2 className="absolute right-4 top-3.5 text-amber-500 animate-spin" size={18} />}
                            </div>

                            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                                {t.nearbyPlaces}
                            </h2>

                            <div className="space-y-3 pb-8">
                                {filteredPlaces.length === 0 && !isFetchingMap && (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                                        <MapIcon size={24} className="mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                                        {t.noPlacesFound}
                                    </div>
                                )}

                                {filteredPlaces.map(place => {
                                    const style = getPlaceStyle(place.type);
                                    const { Icon } = style;

                                    return (
                                        <div key={place.id} onClick={() => handleSelect(place.id)} className={`group cursor-pointer bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 transition-all flex items-start gap-4 hover:shadow-md ${style.borderHoverClass}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${place.isRegistered ? style.bgClass : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                                <Icon size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-semibold text-gray-900 dark:text-gray-100 truncate transition-colors pr-2 ${style.textHoverClass}`}>{place.name}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{place.address}</p>

                                                <div className="flex gap-3 mt-2 flex-wrap">
                                                    {place.rating > 0 && <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400" /> {place.rating.toFixed(1)}</span>}

                                                    {place.isRegistered ? (
                                                        <>
                                                            {/* Toilet Status */}
                                                            {(() => {
                                                                const pass = place.toiletPass;
                                                                let colorClass = "text-yellow-600 dark:text-yellow-500"; // Default: Yellow (Code)
                                                                if (pass === null) colorClass = "text-gray-400 dark:text-gray-500"; // Gray (Unknown)
                                                                else if (pass === 'No' || pass === 'None') colorClass = "text-red-500 dark:text-red-400"; // Red (Absent)
                                                                else if (pass === 'free' || pass === 'ücretsiz' || pass === 'ucretsiz' || pass === 'Free' || pass === 'Ücretsiz' || pass === 'Ucretsiz') colorClass = "text-green-600 dark:text-green-500"; // Green (Available)

                                                                return <span className={`text-xs font-medium ${colorClass} flex items-center gap-1`}><KeyRound size={12} /> WC</span>
                                                            })()}

                                                            {/* WiFi Status */}
                                                            {(() => {
                                                                const pass = place.wifiPass;
                                                                let colorClass = "text-yellow-600 dark:text-yellow-500"; // Default: Yellow (Code)
                                                                if (pass === null) colorClass = "text-gray-400 dark:text-gray-500"; // Gray (Unknown)
                                                                else if (pass === 'No' || pass === 'None') colorClass = "text-red-500 dark:text-red-400"; // Red (Absent)
                                                                else if (pass === 'Free' || pass === 'Open' || pass === 'Ask to staff') colorClass = "text-green-600 dark:text-green-500"; // Green (Available)

                                                                return <span className={`text-xs font-medium ${colorClass} flex items-center gap-1`}><Wifi size={12} /> Wifi</span>
                                                            })()}

                                                            {/* Menu Status */}
                                                            {place.menu.length > 0 ? (
                                                                <span className="text-xs font-medium text-green-600 dark:text-green-500 flex items-center gap-1"><Utensils size={12} /> {t.menu}</span>
                                                            ) : (
                                                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1"><Utensils size={12} /> {t.menu}</span>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 w-full h-full z-0 relative bg-gray-100 dark:bg-gray-800">
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
                    manualTrigger={manualFetchTrigger}
                    t={t}
                />

                {/* Floating Map Controls - Zoom Buttons (Left) */}
                <div className={`absolute left-6 z-[500] flex flex-col gap-3 transition-all duration-300 ${isMobileSearchVisible ? 'bottom-24' : 'bottom-6'}`}>
                    <button
                        onClick={handleZoomIn}
                        className="w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                        title={t.zoomIn}
                    >
                        <Plus size={20} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                        title={t.zoomOut}
                    >
                        <Minus size={20} />
                    </button>
                </div>

                {/* Floating Map Controls - Locate Me Button (Right) */}
                <div className={`absolute right-6 z-[500] flex flex-col gap-3 transition-all duration-300 ${isMobileSearchVisible ? 'bottom-24' : 'bottom-6'}`}>
                    <button
                        onClick={handleLocateMe}
                        className={`w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700 ${isLocating ? 'animate-pulse text-blue-500' : ''}`}
                        title={t.locateMe}
                    >
                        {isLocating ? <Loader2 size={22} className="animate-spin text-blue-500" /> : <Navigation size={20} className={`transform -rotate-45 ${userLocation ? "text-blue-500 fill-blue-500" : ""}`} />}
                    </button>
                    <button
                        onClick={() => setManualFetchTrigger(Date.now())}
                        className={`w-12 h-12 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700 ${isFetchingMap ? 'text-amber-500' : ''}`}
                        title={t.scanArea}
                        disabled={isFetchingMap}
                    >
                        {isFetchingMap ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
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
                            <span className="text-sm">{t.searchPlaceholder}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* FULLSCREEN MENU MODAL */}
            {isMenuFullscreen && selectedPlace && (() => {
                const style = getPlaceStyle(selectedPlace.type);
                const { Icon } = style;

                return (
                    <div className="fixed inset-0 z-[3000] bg-white dark:bg-gray-900 flex flex-col animate-fade-in overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bgClass}`}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">{selectedPlace.name}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t.fullMenu}</p>
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
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.pricesUserSubmitted}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* Report Modal */}
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                place={selectedPlace || null}
                t={t}
                onSuccess={() => {
                    showToast(t.reportSubmitted);
                    // Manually fetch reports to update UI instantly without needing a full reload
                    if (selectedId) {
                        databases.listDocuments('kafmap', 'pending_updates', [
                            Query.equal('placeId', selectedId.toString()),
                            Query.equal('type', 'report')
                        ]).then(res => setPlaceReports(res.documents));
                    }
                }}
            />

            {/* Custom Alert Modal */}
            {alertMessage && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setAlertMessage(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl p-8 transform transition-all text-center border border-red-100 dark:border-red-900/30" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-red-50 dark:ring-red-900/20">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.attention}</h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 mb-8 font-medium">{alertMessage}</p>
                        <button
                            onClick={() => setAlertMessage(null)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-red-500/20"
                        >
                            {t.understood}
                        </button>
                    </div>
                </div>
            )}
            {/* Pending Verification Modal */}
            {pendingVerificationState && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPendingVerificationState(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl p-8 transform transition-all text-center border border-green-100 dark:border-green-900/30" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-50 dark:ring-green-900/20">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.pendingUpdate}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t.pendingUpdateDesc}</p>

                        <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-xl p-4 font-mono font-medium text-lg mb-6 break-all">
                            {pendingVerificationState.field === 'menu' ? t.newMenuDataUploaded : pendingVerificationState.newValue}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setPendingVerificationState(null)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl transition-colors"
                            >
                                {t.cancel}
                            </button>
                            <button
                                onClick={handleVerifyPendingUpdate}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-green-500/20 flex flex-col items-center justify-center leading-none"
                            >
                                <span>{t.verifyInfo}</span>
                                <span className="text-[10px] opacity-80 mt-1">{t.verificationsCount.replace('{count}', pendingVerificationState.currentVerifyCount.toString())}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
