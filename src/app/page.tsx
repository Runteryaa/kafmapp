"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
    MapPin, Search, Coffee, Utensils, Pizza, Beer,
    Star, ArrowLeft, KeyRound, Wifi, Copy, X, ShieldCheck, MapIcon, Maximize2, Loader2, Navigation,
    Menu, Settings, LogIn, UserPlus, Moon, Sun, Languages, Plus, Minus, RefreshCw, LogOut, User, Flag, ExternalLink, AlertTriangle, Pencil, ThumbsUp, MonitorSmartphone, Shuffle, SortAsc, Filter, ChevronDown, Check, Shield
} from "lucide-react";
import { mockPlaces, LocationState, Place, Review } from "../lib/types"; // Import data
import { LoginModal, RegisterModal } from "../components/AuthModals";
import { UpdateInfoModal } from "../components/UpdateInfoModal"; // Import new modal
import ReportModal from "../components/ReportModal"; // Import report modal
import { client, databases } from "../lib/appwrite"; // Import appwrite client
import { ID, Query } from "appwrite"; // Import appwrite ID and Query
import { useAuth } from "../hooks/useAuth";
import { getTranslation } from "../lib/translations";

const SponsorBanners = dynamic(() => import("../components/SponsorBanners"), { ssr: false });

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

const LIST_COLORS = [
    { name: 'Pink', value: '#ec4899' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Orange', value: '#f59e0b' },
    { name: 'Red', value: '#ef4444' },
];

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

    const [isInstallable, setIsInstallable] = useState(false);
    
    // Reviews state
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState<number>(0);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

    // Filtering & Sorting State
    const [filterType, setFilterType] = useState<'all' | 'registered' | 'unregistered' | 'favorites'>('all');
    const [listFilter, setListFilter] = useState<string | null>(null);
    const [sortType, setSortType] = useState<'name' | 'rating' | 'newest' | 'oldest' | 'random'>('rating');

    // Add Place Feature State
    const [isAddMode, setIsAddMode] = useState(false);
    const [newPlaceCoords, setNewPlaceCoords] = useState<LocationState | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPlaceData, setNewPlaceData] = useState({
        name: "",
        type: "cafe" as Place['type'],
        address: "",
        toiletPass: "",
        wifiPass: "",
        menuUrl: ""
    });
    const [isAddPlaceLoading, setIsAddPlaceLoading] = useState(false);

    // Favorites Feature State
    const [favorites, setFavorites] = useState<any[]>([]);
    const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isManageListsOpen, setIsManageListsOpen] = useState(false);
    const [isProcessingListAction, setIsProcessingListAction] = useState(false);
    const [editingListName, setEditingListName] = useState<string | null>(null);
    const [tempEditName, setTempEditName] = useState("");
    const [tempEditColor, setTempEditColor] = useState("");
    const [newListName, setNewListName] = useState("");
    const [newListColor, setNewListColor] = useState(LIST_COLORS[0].value);

    const fetchFavorites = useCallback(async () => {
        if (!user) {
            setFavorites([]);
            return;
        }
        try {
            const res = await databases.listDocuments(
                'kafmap',
                'favorites',
                [Query.equal('userId', user.$id)]
            );
            setFavorites(res.documents);
        } catch (error) {
            console.error("Failed to fetch favorites:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const handleToggleFavorite = async (placeId: string, listType: string, listColor?: string) => {
        if (isUserBanned()) return;
        if (!user) {
            showToast(t.loginToUpdate || "Lütfen giriş yapın");
            setIsLoginOpen(true);
            return;
        }

        const existing = favorites.find(f => f.placeId === placeId && f.listType.toLowerCase() === listType.toLowerCase());
        
        try {
            if (existing) {
                // Remove
                setFavorites(prev => prev.filter(f => f.$id !== existing.$id));
                await databases.deleteDocument('kafmap', 'favorites', existing.$id);
            } else {
                // Determine color
                // If creating a new entry for an existing list, try to match the color of existing items in that list
                let finalColor = listColor;
                if (!finalColor) {
                    const existingListEntry = favorites.find(f => f.listType.toLowerCase() === listType.toLowerCase());
                    finalColor = existingListEntry?.listColor || LIST_COLORS[0].value;
                }

                // Add
                const tempId = `fav_${Date.now()}`;
                const newFav = {
                    $id: tempId,
                    userId: user.$id,
                    placeId: placeId,
                    listType: listType,
                    listColor: finalColor,
                    createdAt: new Date().toISOString()
                };
                setFavorites(prev => [...prev, newFav]);
                
                const created = await databases.createDocument(
                    'kafmap',
                    'favorites',
                    'unique()',
                    {
                        userId: user.$id,
                        placeId: placeId,
                        listType: listType,
                        listColor: finalColor
                    }
                );
                
                setFavorites(prev => prev.map(f => f.$id === tempId ? created : f));
            }
        } catch (error) {
            console.error("Collection update failed:", error);
            showToast("İşlem başarısız");
            fetchFavorites(); // Rollback
        }
    };

    const handleRenameList = async (oldName: string, newName: string) => {
        if (!user || !newName.trim() || oldName === newName) return;
        setIsProcessingListAction(true);
        try {
            const listItems = favorites.filter(f => f.listType?.toLowerCase() === oldName.toLowerCase());
            await Promise.all(listItems.map(item => 
                databases.updateDocument('kafmap', 'favorites', item.$id, { listType: newName.trim() })
            ));
            showToast(t.listRenamed || "Liste yeniden adlandırıldı");
            await fetchFavorites();
        } catch (error) {
            console.error("Rename failed:", error);
            showToast("İşlem başarısız");
        } finally {
            setIsProcessingListAction(false);
        }
    };

    const handleDeleteList = async (listName: string) => {
        if (!user) return;
        if (!confirm(t.deleteListConfirm || `${listName} listesini silmek istediğinize emin misiniz?`)) return;
        
        setIsProcessingListAction(true);
        try {
            const listItems = favorites.filter(f => f.listType?.toLowerCase() === listName.toLowerCase());
            await Promise.all(listItems.map(item => 
                databases.deleteDocument('kafmap', 'favorites', item.$id)
            ));
            showToast(t.listDeleted || "Liste silindi");
            if (listFilter === listName) setListFilter(null);
            await fetchFavorites();
        } catch (error) {
            console.error("Delete failed:", error);
            showToast("İşlem başarısız");
        } finally {
            setIsProcessingListAction(false);
        }
    };

    const handleUpdateListColor = async (listName: string, newColor: string) => {
        if (!user) return;
        setIsProcessingListAction(true);
        try {
            const listItems = favorites.filter(f => f.listType?.toLowerCase() === listName.toLowerCase());
            await Promise.all(listItems.map(item => 
                databases.updateDocument('kafmap', 'favorites', item.$id, { listColor: newColor })
            ));
            showToast(t.colorUpdated || "Renk güncellendi");
            await fetchFavorites();
        } catch (error) {
            console.error("Color update failed:", error);
            showToast("İşlem başarısız");
        } finally {
            setIsProcessingListAction(false);
        }
    };

    // Reverse geocode for new places
    useEffect(() => {
        if (newPlaceCoords && isAddModalOpen) {
            setIsAddPlaceLoading(true);
            setNewPlaceData(prev => ({ ...prev, address: "" })); // Clear old address
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPlaceCoords.lat}&lon=${newPlaceCoords.lng}&zoom=18&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        const addr = data.address;
                        const road = addr.road || addr.pedestrian || addr.path || '';
                        const suburb = addr.suburb || addr.neighbourhood || '';
                        const city = addr.city || addr.town || addr.village || '';
                        
                        let formattedAddress = [];
                        if (road) formattedAddress.push(road);
                        if (suburb) formattedAddress.push(suburb);
                        if (city) formattedAddress.push(city);
                        
                        if (formattedAddress.length > 0) {
                            setNewPlaceData(prev => ({ ...prev, address: formattedAddress.join(', ') }));
                        } else {
                            showToast("Adres otomatik bulunamadı, lütfen manuel yazın.");
                        }
                    }
                })
                .catch(err => {
                    console.error("Reverse geocoding failed", err);
                    showToast("Adres servis hatası, lütfen manuel girin.");
                })
                .finally(() => {
                    setIsAddPlaceLoading(false);
                });
        }
    }, [newPlaceCoords, isAddModalOpen]);
    
    // Dynamic Address State
    const [dynamicAddress, setDynamicAddress] = useState<string | null>(null);
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);

    // Boycott State
    const [isIsraelBoycottEnabled, setIsIsraelBoycottEnabled] = useState(false);
    const [isLocalBoycottEnabled, setIsLocalBoycottEnabled] = useState(false);
    const [israelBoycottList, setIsraelBoycottList] = useState<string[]>([]);
    const [localBoycottList, setLocalBoycottList] = useState<string[]>([]);

    useEffect(() => {
        const fetchBoycottLists = async () => {
            try {
                const [israelRes, localRes] = await Promise.all([
                    fetch('/boycott_israel.json'),
                    fetch('/boycott_local.json')
                ]);
                if (israelRes.ok) setIsraelBoycottList(await israelRes.json());
                if (localRes.ok) setLocalBoycottList(await localRes.json());
            } catch (error) {
                console.error("Failed to load boycott lists", error);
            }
        };
        fetchBoycottLists();
    }, []);

    const panelScrollRef = useRef<HTMLDivElement>(null);

    // Scroll panel to top when selection changes
    useEffect(() => {
        if (selectedId && panelScrollRef.current) {
            panelScrollRef.current.scrollTo(0, 0);
        }
    }, [selectedId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedIsrael = localStorage.getItem('israelBoycott');
            const savedLocal = localStorage.getItem('localBoycott');
            const savedFilter = localStorage.getItem('filterType');
            const savedSort = localStorage.getItem('sortType');
            
            if (savedIsrael === 'true') setIsIsraelBoycottEnabled(true);
            if (savedLocal === 'true') setIsLocalBoycottEnabled(true);
            if (savedFilter) setFilterType(savedFilter as any);
            if (savedSort) setSortType(savedSort as any);

            if ('install' in navigator) {
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
                if (!isStandalone) {
                    setIsInstallable(true);
                }
            }

            // Check if event was already captured by layout script
            if ((window as any).deferredPrompt) {
                setIsInstallable(true);
            }
        }

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            (window as any).deferredPrompt = e;
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (typeof window !== 'undefined' && 'install' in navigator) {
            try {
                await (navigator as any).install();
                setIsInstallable(false);
                return;
            } catch (error) {
                console.error('Installation via Web Install API failed:', error);
            }
        }

        const promptEvent = typeof window !== 'undefined' ? (window as any).deferredPrompt : null;
        if (!promptEvent) return;

        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
            (window as any).deferredPrompt = null;
            setIsInstallable(false);
        }
    };


    useEffect(() => {
        if (selectedId) {
            databases.listDocuments('kafmap', 'pending_updates', [
                Query.equal('placeId', selectedId.toString())
            ]).then(res => {
                const docs = res.documents;
                setPlaceReports(docs.filter((d: any) => d.type === 'report'));
                setPlaceUpdates(docs.filter((d: any) => d.type === 'update'));
            }).catch(err => {
                console.error("Failed to fetch pending updates/reports", err);
            });
        } else {
            setPlaceReports([]);
            setPlaceUpdates([]);
        }
    }, [selectedId]);

    const hasReport = (code: string) => placeReports.some((r: any) => {
        try { return JSON.parse(r.payload).reasonCode === code; } catch { return false; }
    });

    const [pendingVerificationState, setPendingVerificationState] = useState<{
        updateId: string,
        field: 'toiletPass' | 'wifiPass' | 'menu',
        newValue: any,
        currentVerifyCount: number,
        fullPayload: any
    } | null>(null);

    const getPendingUpdates = (field: 'toiletPass' | 'wifiPass' | 'menu') => {
        if (!selectedPlace || !selectedPlace.isRegistered) return [];
        const updates = [];
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
                    updates.push({
                        id: update.$id,
                        value: field === 'menu' ? payload.menu : payload[field],
                        verifyCount: payload.verifyCount || 0,
                        fullPayload: payload
                    });
                }
            } catch { continue; }
        }
        return updates;
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

                // Delete the approved update
                await databases.deleteDocument('kafmap', 'pending_updates', updateId);

                // Delete all other pending updates that touch this same field for this place
                const fieldKey = field === 'menu' ? 'menu' : field;
                const updatesToDelete = placeUpdates.filter((u: any) => {
                    try {
                        const payload = JSON.parse(u.payload);
                        return payload[fieldKey] !== undefined && u.$id !== updateId;
                    } catch { return false; }
                });

                for (const u of updatesToDelete) {
                    await databases.deleteDocument('kafmap', 'pending_updates', u.$id);
                }

                showToast(t.updateVerifiedApplied);
                setPendingVerificationState(null);
                fetchDbPlaces();

                const deletedIds = new Set([updateId, ...updatesToDelete.map((u: any) => u.$id)]);
                setPlaceUpdates(placeUpdates.filter((u: any) => !deletedIds.has(u.$id)));
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
                setPlaceUpdates(placeUpdates.map((u: any) => {
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
            const response = await databases.listDocuments('kafmap', 'places', [
                Query.limit(1000)
            ]);
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
                isPremium: doc.isPremium === true || doc.isPremium === 'true',
                premiumUntil: doc.premiumUntil,
                premiumColor: doc.premiumColor,
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

    const fetchReviews = async (placeId: string) => {
        setIsReviewsLoading(true);
        try {
            const response = await databases.listDocuments('kafmap', 'reviews', [
                Query.equal('placeId', placeId)
            ]);
            // sort by createdAt descending
            const sortedReviews = response.documents.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setReviews(sortedReviews as unknown as Review[]);
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
        } finally {
            setIsReviewsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedId) {
            fetchReviews(selectedId.toString());
            // Form is reset initially, but will be populated if user has a review (see next effect)
            setReviewText("");
            setReviewRating(0);
            setEditingReviewId(null);
        } else {
            setReviews([]);
            setReviewText("");
            setReviewRating(0);
            setEditingReviewId(null);
        }
    }, [selectedId]);

    // Auto-fill review form if user already has a review
    useEffect(() => {
        if (user && reviews.length > 0) {
            const existingReview = reviews.find(r => r.userId === user.$id);
            if (existingReview && !editingReviewId) {
                setReviewText(existingReview.commentText || "");
                setReviewRating(Number(existingReview.rating));
                setEditingReviewId(existingReview.id || (existingReview as any).$id);
            }
        }
    }, [reviews, user, editingReviewId]);

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

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            showToast(t.loginToRate);
            setIsLoginOpen(true);
            return;
        }
        if (!selectedPlace) return;
        if (reviewRating === 0) {
            showToast(t.selectRating || "Please select a rating");
            return;
        }

        setIsSubmittingReview(true);
        const docId = `place_${selectedPlace.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);

        try {
            if (editingReviewId) {
                // Update existing review
                const oldReview = reviews.find(r => r.id === editingReviewId || (r as any).$id === editingReviewId);
                if (!oldReview) throw new Error("Review not found");
                
                await databases.updateDocument('kafmap', 'reviews', editingReviewId, {
                    rating: reviewRating.toString(),
                    commentText: reviewText
                });

                // Calculate rating diff
                const ratingDiff = reviewRating - Number(oldReview.rating);
                if (ratingDiff !== 0) {
                    try {
                        const doc = await databases.getDocument('kafmap', 'places', docId);
                        const currentSum = doc.ratingSum ? Number(doc.ratingSum) : 0;
                        const currentCount = doc.ratingCount ? Number(doc.ratingCount) : 0;
                        await databases.updateDocument('kafmap', 'places', docId, {
                            ratingSum: (currentSum + ratingDiff).toString()
                        });
                        
                        // Update local UI immediately
                        setDbPlaces((prev: Place[]) => prev.map(p => {
                            if (p.id === selectedPlace.id) {
                                return { ...p, rating: currentCount > 0 ? (currentSum + ratingDiff) / currentCount : 0 };
                            }
                            return p;
                        }));
                    } catch (err) {}
                }
                showToast(t.reviewUpdated || "Review updated!");
            } else {
                // Check if user already reviewed
                const existingReview = reviews.find(r => r.userId === user.$id);
                if (existingReview) {
                    showToast(t.alreadyRated);
                    setIsSubmittingReview(false);
                    return;
                }

                // Create new review
                const newId = ID.unique();
                await databases.createDocument('kafmap', 'reviews', newId, {
                    placeId: selectedPlace.id.toString(),
                    userId: user.$id,
                    userName: user.name || "User",
                    userRole: (user as any).role || "user",
                    rating: reviewRating.toString(),
                    commentText: reviewText,
                    createdAt: new Date().toISOString()
                });

                // Update place rating aggregate
                try {
                    const doc = await databases.getDocument('kafmap', 'places', docId);
                    const currentSum = doc.ratingSum ? Number(doc.ratingSum) : 0;
                    const currentCount = doc.ratingCount ? Number(doc.ratingCount) : 0;
                    await databases.updateDocument('kafmap', 'places', docId, {
                        ratingSum: (currentSum + reviewRating).toString(),
                        ratingCount: (currentCount + 1).toString()
                    });
                } catch (err: any) {
                    if (err.code === 404) {
                        await databases.createDocument('kafmap', 'places', docId, {
                            placeId: selectedPlace.id.toString(),
                            name: selectedPlace.name,
                            lat: selectedPlace.lat.toString(),
                            lng: selectedPlace.lng.toString(),
                            type: selectedPlace.type,
                            address: selectedPlace.address,
                            ratingSum: reviewRating.toString(),
                            ratingCount: "1"
                        });
                    }
                }
                showToast(t.ratingSubmitted);
                setEditingReviewId(newId); // Keep form in edit mode
            }

            fetchReviews(selectedPlace.id.toString());
            // Do not reset form here, it stays in edit mode or retains its values
        } catch (err) {
            console.error("Review failed", err);
            showToast(t.failedRating);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleEditReviewClick = (review: Review) => {
        setReviewText(review.commentText || "");
        setReviewRating(Number(review.rating));
        setEditingReviewId(review.id || (review as any).$id);
        
        // Scroll to form
        const reviewForm = document.getElementById("review-form");
        if (reviewForm) {
            reviewForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleDeleteReview = async (reviewId: string, ratingValue: number) => {
        if (!confirm(t.deleteReviewConfirm || "Are you sure you want to delete this review?")) return;
        if (!selectedPlace) return;
        
        setIsSubmittingReview(true);
        const docId = `place_${selectedPlace.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);

        try {
            await databases.deleteDocument('kafmap', 'reviews', reviewId);
            
            // Update place aggregate
            try {
                const doc = await databases.getDocument('kafmap', 'places', docId);
                const currentSum = doc.ratingSum ? Number(doc.ratingSum) : 0;
                const currentCount = doc.ratingCount ? Number(doc.ratingCount) : 0;
                
                await databases.updateDocument('kafmap', 'places', docId, {
                    ratingSum: Math.max(0, currentSum - ratingValue).toString(),
                    ratingCount: Math.max(0, currentCount - 1).toString()
                });
            } catch (err) {}
            
            showToast(t.reviewDeleted || "Review deleted!");
            fetchReviews(selectedPlace.id.toString());
        } catch (error) {
            console.error(error);
            showToast(t.failedToDeleteReview || "Failed to delete review");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleRatePlace = async (ratingValue: number) => {
        if (isUserBanned()) return;
        if (!user) {
            showToast(t.loginToRate);
            setIsLoginOpen(true);
            return;
        }

        setReviewRating(ratingValue);
        const reviewForm = document.getElementById("review-form");
        if (reviewForm) {
            reviewForm.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleReportPlace = () => {
        if (isUserBanned()) return;
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

    const combinedPlaces = useMemo(() => {
        const combinedPlacesMap = new Map<number, Place>();

        // First add all DB places (they persist globally in the app state)
        dbPlaces.forEach(p => combinedPlacesMap.set(p.id, p));

        // Then add OSM places if they don't exist in the map
        osmPlaces.forEach(p => {
            if (!combinedPlacesMap.has(p.id)) {
                combinedPlacesMap.set(p.id, p);
            } else {
                const existingDbPlace = combinedPlacesMap.get(p.id)!;
                if (!existingDbPlace.lat || existingDbPlace.lat === 0 || !existingDbPlace.lng || existingDbPlace.lng === 0) {
                    existingDbPlace.lat = p.lat;
                    existingDbPlace.lng = p.lng;
                }
            }
        });

        return Array.from(combinedPlacesMap.values());
    }, [dbPlaces, osmPlaces]);

    const normalizeForBoycott = useCallback((str: string) => {
        if (!str) return "";
        return str
            .toLocaleLowerCase('tr')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/['’´`]/g, '') // Remove all types of apostrophes
            .replace(/[^a-z0-9]/g, '') // Remove all special chars, spaces and now-normalized Turkish chars
            .trim();
    }, []);

    // Filter by search
    const filteredPlaces = useMemo(() => {
        let result = [...combinedPlaces];

        // 0. Boycott Filters
        if (isIsraelBoycottEnabled) {
            result = result.filter(p => {
                const normalizedName = normalizeForBoycott(p.name);
                return !israelBoycottList.some(keyword => normalizedName.includes(normalizeForBoycott(keyword)));
            });
        }
        if (isLocalBoycottEnabled) {
            result = result.filter(p => {
                const normalizedName = normalizeForBoycott(p.name);
                return !localBoycottList.some(keyword => normalizedName.includes(normalizeForBoycott(keyword)));
            });
        }

        // 1. Search Filter
        if (searchQuery) {
            result = result.filter(p => p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // 2. Registration Filter
        if (filterType === 'registered') {
            result = result.filter(p => p.isRegistered);
        } else if (filterType === 'unregistered') {
            result = result.filter(p => !p.isRegistered);
        } else if (filterType === 'favorites') {
            const favs = listFilter 
                ? favorites.filter(f => f.listType.toLowerCase() === listFilter.toLowerCase())
                : favorites;
            const favIds = favs.map(f => f.placeId);
            result = result.filter(p => favIds.includes(p.id.toString()));
        }

        // 3. Sorting
        switch (sortType) {
            case 'name':
                result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'rating':
                result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'newest':
                // For DB places use id or created dates if we add them, for OSM use ID as proxy
                result.sort((a, b) => b.id - a.id);
                break;
            case 'oldest':
                result.sort((a, b) => a.id - b.id);
                break;
            case 'random':
                // Stable random sort based on ID
                result.sort((a, b) => {
                    const seed = manualFetchTrigger || 0;
                    const valA = Math.sin(a.id + seed);
                    const valB = Math.sin(b.id + seed);
                    return valA - valB;
                });
                break;
        }

        return result;
    }, [combinedPlaces, searchQuery, filterType, listFilter, sortType, manualFetchTrigger, favorites, isIsraelBoycottEnabled, isLocalBoycottEnabled]);

    const selectedPlace = useMemo(() => combinedPlaces.find(p => p.id === selectedId), [combinedPlaces, selectedId]);

    // Dynamically fetch address if unknown
    useEffect(() => {
        let isMounted = true;
        setDynamicAddress(null); // reset

        if (selectedPlace && selectedPlace.address === t.addressUnknown) {
            setIsFetchingAddress(true);
            // Reverse geocoding via Nominatim
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedPlace.lat}&lon=${selectedPlace.lng}&zoom=18&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    if (!isMounted) return;
                    if (data && data.address) {
                        const addr = data.address;
                        const road = addr.road || addr.pedestrian || addr.path || '';
                        const suburb = addr.suburb || addr.neighbourhood || '';
                        const city = addr.city || addr.town || addr.village || '';
                        
                        let formattedAddress = [];
                        if (road) formattedAddress.push(road);
                        if (suburb) formattedAddress.push(suburb);
                        if (city) formattedAddress.push(city);
                        
                        if (formattedAddress.length > 0) {
                            setDynamicAddress(formattedAddress.join(', '));
                        }
                    }
                })
                .catch(err => console.error("Reverse geocoding failed", err))
                .finally(() => {
                    if (isMounted) setIsFetchingAddress(false);
                });
        }

        return () => {
            isMounted = false;
        };
    }, [selectedPlace, t.addressUnknown]);

    const getRawPendingUpdates = useCallback((field: string) => {
        return placeUpdates.filter((u: any) => u.placeId === selectedId?.toString() && u.status === 'pending' && u.payload.includes(field));
    }, [placeUpdates, selectedId]);

    const pendingWcUpdates = getRawPendingUpdates('toiletPass');
    const pendingWifiUpdates = getRawPendingUpdates('wifiPass');
    const pendingMenuUpdates = getRawPendingUpdates('menu');

    const isMobileSearchVisible = isMobile && !isMobilePanelOpen && !selectedId;

    const isUserBanned = useCallback(() => {
        if (user && (user as any).isBanned === 'true') {
            showToast("Hesabınız kısıtlanmıştır. Bu işlemi yapamazsınız.");
            return true;
        }
        return false;
    }, [user]);

    // Actions
    const handleSelect = useCallback((id: number) => {
        setSelectedId(id);
        const place = combinedPlaces.find(p => p.id === id);

        if (place) {
            setFlyToLocation({ lat: place.lat, lng: place.lng });
        }

        if (isMobile && !isMobilePanelOpen) {
            setIsMobilePanelOpen(true);
        }
    }, [combinedPlaces, isMobile, isMobilePanelOpen]);

    const handleClosePanel = useCallback(() => {
        if (isMobile) {
            setIsMobilePanelOpen(false);
            // Delay clearing the ID so the panel has time to slide down without re-rendering the whole app
            setTimeout(() => {
                setSelectedId(null);
            }, 300);
        } else {
            setSelectedId(null);
        }
    }, [isMobile]);

    const handleBackToList = useCallback(() => {
        setSelectedId(null);
        // On mobile, this keeps the panel open but switches back to search results/nearby list
    }, []);

    const handleOpenUpdateModal = () => {
        if (isUserBanned()) return;
        if (!user) {
            showToast(t.loginToUpdate);
            setIsLoginOpen(true);
            return;
        }
        setIsUpdateModalOpen(true);
    };

    const handleStartAddMode = () => {
        if (isUserBanned()) return;
        setIsAddMode(true);
        setIsBurgerMenuOpen(false);
        setIsSettingsOpen(false);
        showToast(t.selectPlaceOnMap || "Click on the map to add a place");
    };

    const handleMapClick = useCallback((latlng: any) => {
        if (!isAddMode) return;
        
        setNewPlaceCoords({ lat: latlng.lat, lng: latlng.lng });
        setIsAddMode(false);
        setIsAddModalOpen(true);
    }, [isAddMode]);

    const handleAddPlaceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUserBanned()) return;
        if (!user) {
            showToast(t.loginToUpdate);
            setIsLoginOpen(true);
            return;
        }
        if (!newPlaceCoords) return;
        if (!newPlaceData.address || newPlaceData.address.trim() === "") {
            showToast("Mekan adresi boş olamaz!");
            return;
        }

        setIsAddPlaceLoading(true);
        try {
            const isSpam = checkIsSpam();

            // Generate a random numeric ID for the new place
            const numericId = Math.floor(Math.random() * 1000000000);
            const tempId = numericId.toString();
            const payload = {
                ...newPlaceData,
                lat: newPlaceCoords.lat.toString(),
                lng: newPlaceCoords.lng.toString(),
                placeId: tempId,
                isRegistered: true,
                menu: "[]",
                ratingSum: "0",
                ratingCount: "0"
            };

            const docId = `place_${tempId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);

            // ONLY Instantly add to DB if NOT spam
            if (!isSpam) {
                try {
                    await databases.createDocument('kafmap', 'places', docId, payload);
                    // Also update local state so it appears immediately!
                    setDbPlaces(prev => [...prev, {
                        id: numericId,
                        name: payload.name,
                        lat: parseFloat(payload.lat),
                        lng: parseFloat(payload.lng),
                        type: payload.type as any,
                        address: payload.address,
                        toiletPass: payload.toiletPass || null,
                        wifiPass: payload.wifiPass || null,
                        menuUrl: payload.menuUrl || null,
                        rating: 0,
                        menu: [],
                        isRegistered: true
                    }]);
                } catch (e: any) {
                    if (e.code === 409) await databases.updateDocument('kafmap', 'places', docId, payload);
                }
            }

            // Submit as a pending update (type: add) for admin moderation
            await databases.createDocument('kafmap', 'pending_updates', ID.unique(), {
                placeId: tempId,
                placeName: newPlaceData.name,
                type: 'add',
                payload: JSON.stringify(payload),
                status: 'pending',
                isSpam: isSpam ? 'true' : 'false',
                createdAt: new Date().toISOString()
            });

            if (isSpam) {
                showToast("Şüpheli işlem tespit edildi. Mekan onaylandıktan sonra haritada görünecektir.");
            } else {
                showToast(t.changesSubmittedForAdmin);
            }
            setIsAddModalOpen(false);
            setNewPlaceData({
                name: "",
                type: "cafe",
                address: "",
                toiletPass: "",
                wifiPass: "",
                menuUrl: ""
            });
        } catch (error) {
            console.error("Add place failed", error);
            showToast(t.failedReport);
        } finally {
            setIsAddPlaceLoading(false);
        }
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

    const checkIsSpam = useCallback(() => {
        const now = Date.now();
        const historyRaw = localStorage.getItem('submission_history');
        let history: number[] = [];
        try {
            history = JSON.parse(historyRaw || '[]');
        } catch (e) {
            history = [];
        }

        // Clean up history (older than 3 mins)
        history = history.filter(time => now - time < 3 * 60 * 1000);
        
        // Add current
        const newHistory = [...history, now];
        localStorage.setItem('submission_history', JSON.stringify(newHistory));

        // Threshold: More than 3 submissions in 3 minutes is spam
        return history.length >= 3;
    }, []);

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
        pendingUpdateItems: any[] = [],
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
                {(isOutdated || pendingUpdateItems.length > 0 || reportMessage) && (
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
                        {pendingUpdateItems.map((pendingUpdateItem, idx) => (
                            <button
                                key={idx}
                                onClick={() => setPendingVerificationState({
                                    updateId: pendingUpdateItem.id,
                                    field: field === 'wc' ? 'toiletPass' : field === 'wifi' ? 'wifiPass' : 'menu',
                                    newValue: pendingUpdateItem.value,
                                    currentVerifyCount: pendingUpdateItem.verifyCoundateItem.value,
                       fullPayload: pendingUpdateItem.fullPayload
                                })}
                                className="flex items-center justify-between gap-1.5 text-left text-[11px] font-medium text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors px-2 py-1.5 rounded-md w-full border border-green-200/50 dark:border-green-800/50"
                            >
                                <div className="flex items-center gap-1.5 truncate">
                                    <AlertTriangle size={12} className="shrink-0" />
                                    <span className="truncate">
                                        {t.pendingUpdateVerifyHere}
                                        {field !== 'menu' && pendingUpdateItem.value && (
                                            <span className="ml-1 opacity-80 italic">"{pendingUpdateItem.value}"</span>
                                        )}
                                    </span>
                                </div>
                                <span className="shrink-0 flex items-center gap-1 font-bold bg-green-200 dark:bg-green-800 px-1.5 py-0.5 rounded text-[10px] text-green-800 dark:text-green-200">
                                    {pendingUpdateItem.verifyCount || 0}/2
                                </span>
                            </button>
                        ))}
                        {isOutdated && pendingUpdateItems.length === 0 && !reportMessage && (
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
                            <div className="px-4 py-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.myLists || "Listelerim"}</span>
                                <button 
                                    onClick={() => {
                                        setIsManageListsOpen(true);
                                        setIsBurgerMenuOpen(false);
                                    }}
                                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-widest flex items-center gap-1"
                                >
                                    <Pencil size={10} /> {t.manage || "Yönet"}
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    if (filterType === 'favorites' && !listFilter) {
                                        setFilterType('all');
                                    } else {
                                        setFilterType('favorites');
                                        setListFilter(null);
                                    }
                                    setIsBurgerMenuOpen(false);
                                }}
                                className={`px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-sm font-medium transition-colors w-full text-left ${filterType === 'favorites' && !listFilter ? 'text-pink-600 bg-pink-50/50 dark:bg-pink-900/10' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Star size={16} className="text-pink-500" /> {t.allLists || "Tüm Listeler"}
                                </div>
                                <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">{favorites.length}</span>
                            </button>

                            <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                {Array.from(new Set(favorites.map(f => f.listType).filter(Boolean))).map(listName => {
                                    if (!listName) return null;
                                    const listItems = favorites.filter(f => f.listType === listName);
                                    const count = listItems.length;
                                    const listColor = listItems[0]?.listColor || '#ec4899';
                                    
                                    return (
                                        <button
                                            key={listName}
                                            onClick={() => {
                                                if (listFilter === listName && filterType === 'favorites') {
                                                    setFilterType('all');
                                                    setListFilter(null);
                                                } else {
                                                    setFilterType('favorites');
                                                    setListFilter(listName);
                                                }
                                                setIsBurgerMenuOpen(false);
                                            }}
                                            className={`px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-xs font-medium transition-colors w-full text-left pl-11 ${listFilter === listName ? 'bg-gray-50 dark:bg-gray-700/50' : 'text-gray-500 dark:text-gray-400'}`}
                                            style={listFilter === listName ? { color: listColor } : {}}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: listColor }}></div>
                                                <span className="truncate">{listName}</span>
                                            </div>
                                            <span className="text-[10px] opacity-50">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleStartAddMode}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-amber-600 transition-colors w-full text-left mt-1 border-t border-gray-100 dark:border-gray-800"
                            >
                                <Plus size={18} className="text-amber-500" /> {t.addNewVenue}
                            </button>
                            <button
                                onClick={() => {
                                    setIsSettingsOpen(true);
                                    setIsBurgerMenuOpen(false);
                                }}
                                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors w-full text-left"
                            >
                                <Settings size={18} className="text-gray-400" /> {t.settings}
                            </button>                        </div>
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
                            {/* Install App Setting */}
                            {isInstallable && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                        <MonitorSmartphone size={16} /> {t.installApp}
                                    </label>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-center justify-between">
                                        <div className="pr-4">
                                            <p className="text-sm font-bold text-amber-900 dark:text-amber-400">{t.installApp}</p>
                                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-0.5">{t.installAppDesc}</p>
                                        </div>
                                        <button
                                            onClick={handleInstallClick}
                                            className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-amber-500/20"
                                        >
                                            {t.install}
                                        </button>
                                    </div>
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

                            {/* Boycott Settings */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                    <Shield size={16} /> {t.boycottSettings || "Boycott Filters"}
                                </label>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            const newVal = !isIsraelBoycottEnabled;
                                            setIsIsraelBoycottEnabled(newVal);
                                            localStorage.setItem('israelBoycott', newVal.toString());
                                        }}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${isIsraelBoycottEnabled ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}
                                    >
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className={`text-sm font-bold ${isIsraelBoycottEnabled ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {t.israelBoycott || "Israel Boycott"}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Hides major international chains</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${isIsraelBoycottEnabled ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isIsraelBoycottEnabled ? 'left-5' : 'left-1'}`} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const newVal = !isLocalBoycottEnabled;
                                            setIsLocalBoycottEnabled(newVal);
                                            localStorage.setItem('localBoycott', newVal.toString());
                                        }}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${isLocalBoycottEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}
                                    >
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className={`text-sm font-bold ${isLocalBoycottEnabled ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {t.localBoycott}
                                            </span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{t.localBoycottDesc}</span>
                                        </div>
                                        <div className={`w-10 h-6 rounded-full relative transition-colors ${isLocalBoycottEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isLocalBoycottEnabled ? 'left-5' : 'left-1'}`} />
                                        </div>
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
                                        className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${language === 'en' ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : 'bg-white dark:bg-gray-700 er:border-gray-500'}`}
                                    >
                                        {t.english}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Reset Settings */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={() => {
                                        if (confirm(t.resetConfirm || "Are you sure you want to reset all customizations?")) {
                                            localStorage.removeItem('theme');
                                            localStorage.removeItem('language');
                                            localStorage.removeItem('israelBoycott');
                                            localStorage.removeItem('localBoycott');
                                            localStorage.removeItem('filterType');
                                            localStorage.removeItem('sortType');
                                            
                                            // Reset local state
                                            setTheme('light');
                                            setLanguage('tr');
                                            setIsIsraelBoycottEnabled(false);
                                            setIsLocalBoycottEnabled(false);
                                            setFilterType('all');
                                            setSortType('rating');
                                            
                                            showToast(t.customizationsReset || "Customizations reset successfully");
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                                >
                                    <RefreshCw size={16} /> {t.resetCustomizations || "Reset Customizations"}
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex justify-end">
                            <button
                                onClick={() => setIsSettingsOpen(false)}
                                className="bg-gray-900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hove900 dark:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-sm"
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
                checkIsSpam={checkIsSpam}
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
                className={`absolute bottom-0 left-0 w-full md:h-full md:w-96 md:relative bg-white dark:bg-gray-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl z-[1000] flex flex-col transform transition-transform duration-300 ease-in-out rounded-t-3xl md:rounded-none ${isMobile ? (!isMobilePanelOpen ? 'translate-y-full' : 'translate-y-0') : 'translate-y-0'}`}
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
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <img
                                src="/kafmap.svg"
                                alt="Kaf'Map Icon"
                                className={`absolute inset-0 w-10 h-10 bg-transparent object-contain drop-shadow-sm transition-opacity duration-300 ${selectedId ? 'opacity-0' : 'opacity-100'}`}
                            />
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${selectedId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                <button 
                                    onClick={handleBackToList} 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    disabled={!selectedId} 
                                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Kaf&apos;<span className="text-amber-600">Map</span>
                        </h1>
                    </div>
                    {isMobile && (
                        <button 
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 -mr-2" 
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={handleClosePanel}
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Dynamic Content Area */}
                <div ref={panelScrollRef} className="flex-1 overflow-y-auto relative w-full h-full bg-white dark:bg-gray-800">
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

                                    {/* Premium Disclaimer Badge */}
                                    {selectedPlace.isPremium && (!selectedPlace.premiumUntil || new Date(selectedPlace.premiumUntil) > new Date()) && (
                                        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <ShieldCheck size={12} className="text-amber-600 dark:text-amber-400" />
                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                                                {t.premiumDisclaimer}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight pr-2">{selectedPlace.name}</h2>
                                        <div className="flex shrink-0 gap-2 relative">
                                            <button 
                                                onClick={() => setIsSaveModalOpen(true)}
                                                className={`p-2 rounded-full transition-colors ${favorites.some(f => f.placeId === selectedPlace.id.toString()) ? 'bg-pink-100 text-pink-500 dark:bg-pink-900/30' : 'bg-gray-100 text-gray-400 hover:bg-pink-50 hover:text-pink-500 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                                                title={t.favorites}
                                            >
                                                <Star size={20} className={favorites.some(f => f.placeId === selectedPlace.id.toString()) ? 'fill-current' : ''} />
                                            </button>

                                            {/* Save to List Modal / Dropdown */}
                                            {isSaveModalOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-[2100]" onClick={() => setIsSaveModalOpen(false)} />
                                                    <div className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[2200] p-4 animate-fade-in origin-top-right">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">{t.saveToList || "Listeye Kaydet"}</h4>
                                                        
                                                        <div className="max-h-48 overflow-y-auto space-y-1 mb-3 custom-scrollbar">
                                                            {/* Default & Custom Lists */}
                                                            {Array.from(new Set(['Favorites', 'Want to go', ...favorites.map(f => f.listType).filter(Boolean)])).map(listName => {
                                                                if (!listName) return null;
                                                                const listEntry = favorites.find(f => f.listType?.toLowerCase() === listName.toLowerCase());
                                                                const listColor = listEntry?.listColor || (listName === 'Favorites' ? '#ec4899' : '#3b82f6');
                                                                const isInList = favorites.some(f => f.placeId === selectedPlace.id.toString() && f.listType?.toLowerCase() === listName.toLowerCase());
                                                                
                                                                return (
                                                                    <button
                                                                        key={listName}
                                                                        onClick={() => handleToggleFavorite(selectedPlace.id.toString(), listName, listColor)}
                                                                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-colors ${isInList ? 'bg-gray-50 dark:bg-gray-700/50' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                                        style={isInList ? { color: listColor, borderLeft: `4px solid ${listColor}` } : {}}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: listColor }}></div>
                                                                            <span className="truncate">{listName}</span>
                                                                        </div>
                                                                        {isInList && <Check size={14} />}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                                            {/* Color Picker */}
                                                            <div className="flex gap-1.5 mb-3 px-1">
                                                                {LIST_COLORS.map(c => (
                                                                    <button
                                                                        key={c.value}
                                                                        onClick={() => setNewListColor(c.value)}
                                                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${newListColor === c.value ? 'scale-110 border-gray-400 dark:border-white' : 'border-transparent hover:scale-105'}`}
                                                                        style={{ backgroundColor: c.value }}
                                                                        title={c.name}
                                                                    />
                                                                ))}
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text"
                                                                    placeholder={t.newListName || "Yeni liste adı..."}
                                                                    value={newListName}
                                                                    onChange={(e) => setNewListName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && newListName.trim()) {
                                                                            handleToggleFavorite(selectedPlace.id.toString(), newListName.trim(), newListColor);
                                                                            setNewListName("");
                                                                        }
                                                                    }}
                                                                    className="flex-1 bg-gray-50 dark:bg-gray-900 border-none rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-pink-500"
                                                                />
                                                                <button 
                                                                    onClick={() => {
                                                                        if (newListName.trim()) {
                                                                            handleToggleFavorite(selectedPlace.id.toString(), newListName.trim(), newListColor);
                                                                            setNewListName("");
                                                                        }
                                                                    }}
                                                                    className="p-2 text-white rounded-lg transition-colors"
                                                                    style={{ backgroundColor: newListColor }}
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 line-clamp-2">
                                        <MapPin size={14} className="shrink-0" /> 
                                        {isFetchingAddress && <Loader2 size={12} className="animate-spin shrink-0" />}
                                        {dynamicAddress || selectedPlace.address}
                                    </p>

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
                                                        <button onClick={handleOpenUpdateModal} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center justify-center bg-blue-100/50 dark:bg-blue-900/50 rounded-md p-1" title="Edit">
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
                                                {selectedPlace.isRegistered && (selectedPlace.toiletPass && selectedPlace.toiletPass !== 'Ask to staff' && selectedPlace.toiletPass !== 'No' && selectedPlace.toiletPass !== 'None' && selectedPlace.toiletPass !== 'free' && selectedPlace.toiletPass !== 'ücretsiz' && selectedPlace.toiletPass !== 'ucretsiz' && selectedPlace.toiletPass !== 'Free' && selectedPlace.toiletPass !== 'Ücretsiz' && selectedPlace.toiletPass !== 'Ucretsiz') && renderVerificationFooter('wc', selectedPlace.wcUpdatedAt, selectedPlace.wcUpvotes, pendingWcUpdates, hasReport('wcPasswordIncorrect') ? t.wcPasswordIncorrect : null)}
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
                                                        <button onClick={handleOpenUpdateModal} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors flex items-center justify-center bg-green-100/50 dark:bg-green-900/50 rounded-md p-1" title="Edit">
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
                                                {selectedPlace.isRegistered && (selectedPlace.wifiPass && selectedPlace.wifiPass !== 'No' && selectedPlace.wifiPass !== 'None' && selectedPlace.wifiPass !== 'Free' && selectedPlace.wifiPass !== 'Open' && selectedPlace.wifiPass !== 'Ask to staff') && renderVerificationFooter('wifi', selectedPlace.wifiUpdatedAt, selectedPlace.wifiUpvotes, pendingWifiUpdates, hasReport('wifiPasswordIncorrect') ? t.wifiPasswordIncorrect : null)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Section (Snippet) */}
                                    <div className="mt-8">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{t.menuSnippet}</h3>
                                                <div className="ml-auto flex items-center gap-1.5">
                                                    <button onClick={handleOpenUpdateModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-md flex items-center justify-center" title={t.edit}>
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
                                        {selectedPlace.isRegistered && (selectedPlace.menu.length > 0 || selectedPlace.menuUrl) && renderVerificationFooter('menu', selectedPlace.menuUpdatedAt, selectedPlace.menuUpvotes, pendingMenuUpdates, hasReport('menuPricesOutdated') ? t.menuPricesOutdated : null)}
                                    </div>

                                    {/* Reviews Section */}
                                    <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8" id="review-form">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">{t.reviews || "Reviews"}</h3>
                                            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full text-yellow-600 dark:text-yellow-500 font-bold text-sm border border-yellow-100 dark:border-yellow-800/30">
                                                <Star size={14} className="fill-current" />
                                                <span>{selectedPlace.rating ? selectedPlace.rating.toFixed(1) : '0.0'}</span>
                                            </div>
                                        </div>

                                        {/* Review Form */}
                                        <form onSubmit={handleReviewSubmit} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700 mb-8">
                                            <div className="mb-4">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.yourRating || "Your Rating"}</label>
                                                <div className="flex items-center gap-1.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setReviewRating(star)}
                                                            className="focus:outline-none transition-transform hover:scale-110 leading-none flex items-center justify-center"
                                                        >
                                                            <Star
                                                                size={28}
                                                                className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 hover:fill-yellow-400'}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.yourReview || "Your Review"} (Optional)</label>
                                                <textarea
                                                    value={reviewText}
                                                    onChange={(e) => setReviewText(e.target.value)}
                                                    placeholder={t.writeReview || "Write about your experience here..."}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none h-24 placeholder:text-gray-400"
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-3">
                                                {editingReviewId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const existingReview = reviews.find(r => r.id === editingReviewId || (r as any).$id === editingReviewId);
                                                            if (existingReview) {
                                                                setReviewText(existingReview.commentText || "");
                                                                setReviewRating(Number(existingReview.rating));
                                                            }
                                                        }}
                                                        className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                    >
                                                        {t.cancel || "Cancel"}
                                                    </button>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingReview || reviewRating === 0}
                                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isSubmittingReview && <Loader2 size={16} className="animate-spin" />}
                                                    {editingReviewId ? (t.updateReview || "Update") : (t.submit || "Submit")}
                                                </button>
                                            </div>
                                        </form>

                                        {/* Reviews List */}
                                        <div className="space-y-4">
                                            {isReviewsLoading ? (
                                                <div className="flex justify-center py-6">
                                                    <Loader2 size={24} className="animate-spin text-gray-400" />
                                                </div>
                                            ) : reviews.length > 0 ? (
                                                reviews.map((review) => (
                                                    <div key={review.id || (review as any).$id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                                                    {review.userName ? review.userName.substring(0, 2) : 'U'}
                                                                </div>
                                                                <div>
                                                                   <div className="flex items-center gap-2">
                                                                       <p className="text-sm font-bold text-gray-900 dark:text-white">{review.userName || 'User'}</p>
                                                                       {((review as any).userRole === 'admin' || (review as any).userRole === 'explorer') && (
                                                                           <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${(review as any).userRole === 'admin' ? 'bg-red-500 text-white shadow-sm shadow-red-500/20' : 'bg-blue-500 text-white shadow-sm shadow-blue-500/20'}`}>
                                                                               {(review as any).userRole === 'admin' ? t.adminRole : t.explorerRole}
                                                                           </span>
                                                                       )}                                                                   </div>
                                                                   <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                       {new Date(review.createdAt).toLocaleDateString()}
                                                                   </p>
                                                                </div>                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{review.rating}</span>
                                                            </div>
                                                        </div>
                                                        {review.commentText && (
                                                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 whitespace-pre-wrap">{review.commentText}</p>
                                                        )}
                                                        {user && user.$id === review.userId && (
                                                            <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
                                                                <button
                                                                    onClick={() => handleEditReviewClick(review)}
                                                                    className="text-xs font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                                >
                                                                    {t.edit || "Edit"}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteReview(review.id || (review as any).$id, Number(review.rating))}
                                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                                >
                                                                    {t.delete || "Delete"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t.noReviewsYet || "No reviews yet. Be the first to review!"}</p>
                                            )}
                                        </div>
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

                            {/* Filtering & Sorting Controls */}
                            <div className="mb-6 grid grid-cols-2 gap-3">
                                {/* Filter Dropdown */}
                                <div className="relative group">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <Filter size={14} />
                                    </div>
                                    <select
                                        value={filterType === 'favorites' && listFilter ? `list:${listFilter}` : filterType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val.startsWith('list:')) {
                                                const listName = val.replace('list:', '');
                                                setFilterType('favorites');
                                                setListFilter(listName);
                                            } else {
                                                setFilterType(val as any);
                                                setListFilter(null);
                                            }
                                        }}
                                        className="w-full appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-[11px] font-bold py-2.5 pl-9 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm outline-none hover:border-amber-300 dark:hover:border-amber-900/50 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all cursor-pointer"
                                    >
                                        <option value="all">{t.all}</option>
                                        <option value="registered">{t.registered}</option>
                                        <option value="unregistered">{t.unregistered}</option>
                                        
                                        {/* User Collections */}
                                        {Array.from(new Set(favorites.map(f => f.listType).filter(Boolean))).length > 0 && (
                                            <optgroup label={t.myLists || "Listelerim"}>
                                                <option value="favorites">{t.allLists || "Tüm Kaydedilenler"}</option>
                                                {Array.from(new Set(favorites.map(f => f.listType).filter(Boolean))).map(listName => (
                                                    <option key={listName} value={`list:${listName}`}>
                                                        {listName}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform duration-200">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>

                                {/* Sort Dropdown */}
                                <div className="relative group">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none group-focus-within:text-amber-500 transition-colors">
                                        <SortAsc size={14} />
                                    </div>
                                    <select
                                        value={sortType}
                                        onChange={(e) => {
                                            const newVal = e.target.value as any;
                                            setSortType(newVal);
                                            localStorage.setItem('sortType', newVal);
                                        }}
                                        className="w-full appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-[11px] font-bold py-2.5 pl-9 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm outline-none hover:border-amber-300 dark:hover:border-amber-900/50 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all cursor-pointer"
                                    >
                                        <option value="name">{t.sortName}</option>
                                        <option value="rating">{t.sortRating}</option>
                                        <option value="newest">{t.sortNewest}</option>
                                        <option value="oldest">{t.sortOldest}</option>
                                        <option value="random">{t.sortRandom}</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:rotate-180 transition-transform duration-200">
                                        <ChevronDown size={14} />
                                    </div>
                                </div>
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
                                                {place.address !== t.addressUnknown && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{place.address}</p>
                                                )}

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
            <div className={`flex-1 w-full h-full z-0 relative bg-gray-100 dark:bg-gray-800 ${isAddMode ? 'cursor-crosshair' : ''}`}>
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
                    onMapClick={handleMapClick}
                    favorites={favorites}
                />

                {/* Add Mode Indicator */}
                {isAddMode && (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-bounce">
                        <div className="flex flex-col">
                            <span className="text-sm font-black">{t.selectPlaceOnMap}</span>
                        </div>
                        <button 
                            onClick={() => setIsAddMode(false)}
                            className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                
                {/* Floating Map Controls - Zoom Buttons (Left) */}
                <div className={`absolute left-6 z-[500] flex flex-col gap-3 transition-all duration-300 ${isMobile ? 'bottom-24' : 'bottom-6'}`}>
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
                <div className={`absolute right-6 z-[500] flex flex-col gap-3 transition-all duration-300 ${isMobile ? 'bottom-24' : 'bottom-6'}`}>
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

                {/* Floating Sponsor Banners */}
                <SponsorBanners isMobile={isMobile} />

                {/* Mobile Open Panel Button (Visible when panel is closed on mobile) */}
                {isMobile && (
                    <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[500] w-[90%] max-w-sm transition-opacity duration-300 ${isMobilePanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                checkIsSpam={checkIsSpam}
                onSuccess={() => {
                    showToast(t.reportSubmitted);
                    // Manually fetch reports to update UI instantly without needing a full reload
                    if (selectedId) {
                        databases.listDocuments('kafmap', 'pending_updates', [
                            Query.equal('placeId', selectedId.toString()),
                            Query.equal('type', 'report')
                        ]).then((res: any) => setPlaceReports(res.documents));
                    }
                }}
            />

            {/* Privacy Policy Modal */}
            {isPrivacyModalOpen && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                                    <ShieldCheck size={28} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                    {t.privacyPolicy}
                                </h2>
                            </div>
                            <button onClick={() => setIsPrivacyModalOpen(false)} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-10 overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none">
                            <div className="space-y-8">
                                <section>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                        1. Veri Sorumlusu
                                    </h3>
                                    <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                        KafMap ("Biz"), kullanıcılarımızın gizliliğine önem veriyoruz. Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca aydınlatma yükümlülüğümüzü yerine getirmek amacıyla hazırlanmıştır.
                                    </p>
                                </section>
                                <section>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                        2. İşlenen Veriler ve Amaç
                                    </h3>
                                    <ul className="space-y-4">
                                        <li className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Konum Verisi</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Harita üzerinde yakınınızdaki mekanları göstermek amacıyla anlık olarak işlenir. Sunucularımızda saklanmaz.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">Hesap Bilgileri</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">E-posta ve kullanıcı adınız, favorilerinizi kaydetmek ve yorumlarınızı yönetmek amacıyla saklanır.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </section>
                                <section>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                                        3. Veri Paylaşımı
                                    </h3>
                                    <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                                        Kişisel verileriniz asla üçüncü taraflara satılmaz veya ticari amaçla paylaşılmaz. Verileriniz sadece güvenli bulut altyapılarında (Appwrite, Oracle Cloud) operasyonel amaçlarla tutulur.
                                    </p>
                                </section>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <button
                                onClick={() => setIsPrivacyModalOpen(false)}
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black py-5 rounded-[20px] transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-gray-900/10 dark:shadow-none"
                            >
                                {t.understood}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Lists Modal */}
            {isManageListsOpen && (
                <div className="fixed inset-0 z-[7000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Settings size={24} className="text-amber-500" />
                                {t.myLists}
                            </h2>
                            <button onClick={() => { setIsManageListsOpen(false); setEditingListName(null); }} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-4">
                                {Array.from(new Set(favorites.map(f => f.listType).filter(Boolean))).map(listName => {
                                    const listItems = favorites.filter(f => f.listType === listName);
                                    const listColor = listItems[0]?.listColor || '#ec4899';
                                    const isEditing = editingListName === listName;

                                    return (
                                        <div key={listName} className={`p-4 rounded-2xl border transition-all ${isEditing ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30'}`}>
                                            {isEditing ? (
                                                <div className="space-y-4">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={tempEditName}
                                                            onChange={(e) => setTempEditName(e.target.value)}
                                                            className="flex-1 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                                            placeholder={t.renameList}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-1.5">
                                                            {LIST_COLORS.map(c => (
                                                                <button
                                                                    key={c.value}
                                                                    onClick={() => setTempEditColor(c.value)}
                                                                    className={`w-6 h-6 rounded-full border-2 transition-transform ${tempEditColor === c.value ? 'scale-110 border-gray-400 dark:border-white' : 'border-transparent hover:scale-105'}`}
                                                                    style={{ backgroundColor: c.value }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setEditingListName(null)}
                                                                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                                            >
                                                                {t.cancel}
                                                            </button>
                                                            <button 
                                                                disabled={isProcessingListAction}
                                                                onClick={async () => {
                                                                    if (tempEditName !== listName) await handleRenameList(listName, tempEditName);
                                                                    if (tempEditColor !== listColor) await handleUpdateListColor(tempEditName || listName, tempEditColor);
                                                                    setEditingListName(null);
                                                                }}
                                                                className="bg-amber-500 text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-amber-600 transition-all flex items-center gap-2"
                                                            >
                                                                {isProcessingListAction && <Loader2 size={12} className="animate-spin" />}
                                                                {t.done}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: listColor }}></div>
                                                        <div>
                                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{listName}</h3>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{listItems.length} {t.nearbyPlaces?.toLowerCase()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingListName(listName);
                                                                setTempEditName(listName);
                                                                setTempEditColor(listColor);
                                                            }}
                                                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                                            title={t.edit}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button 
                                                            disabled={isProcessingListAction}
                                                            onClick={() => handleDeleteList(listName)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                                            title={t.deleteList}
                                                        >
                                                            <Plus size={16} className="rotate-45" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {Array.from(new Set(favorites.map(f => f.listType).filter(Boolean))).length === 0 && (
                                    <div className="text-center py-12">
                                        <Star size={40} className="mx-auto text-gray-200 mb-4" />
                                        <p className="text-gray-400 text-sm font-medium">Henüz bir listeniz bulunmuyor.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isProcessingListAction && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center z-[10]">
                                <Loader2 size={32} className="animate-spin text-amber-500" />
                            </div>
                        )}
                    </div>
                </div>
            )}

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

            {/* Add Venue Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto py-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-auto">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                                    <Plus size={20} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">{t.addNewVenue}</h3>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlaceSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Venue Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newPlaceData.name}
                                        onChange={(e) => setNewPlaceData({...newPlaceData, name: e.target.value})}
                                        placeholder="Cafe Name"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Type</label>
                                    <select 
                                        value={newPlaceData.type}
                                        onChange={(e) => setNewPlaceData({...newPlaceData, type: e.target.value as any})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="cafe">Cafe</option>
                                        <option value="restaurant">Restaurant</option>
                                        <option value="fast_food">Fast Food</option>
                                        <option value="bar">Bar</option>
                                        <option value="pub">Pub</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-6 opacity-60">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.latitude}</label>
                                        <input 
                                            type="text" 
                                            disabled
                                            value={newPlaceCoords?.lat.toFixed(6) || ""}
                                            className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 font-mono text-xs font-bold text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.longitude}</label>
                                        <input 
                                            type="text" 
                                            disabled
                                            value={newPlaceCoords?.lng.toFixed(6) || ""}
                                            className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl py-4 px-5 font-mono text-xs font-bold text-gray-500"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Address</label>
                                    <textarea 
                                        required
                                        value={newPlaceData.address}
                                        onChange={(e) => setNewPlaceData({...newPlaceData, address: e.target.value})}
                                        placeholder="Full address of the place..."
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all h-20 resize-none shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.toiletCode}</label>
                                    <input 
                                        type="text" 
                                        value={newPlaceData.toiletPass}
                                        onChange={(e) => setNewPlaceData({...newPlaceData, toiletPass: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.wifiPassword}</label>
                                    <input 
                                        type="text" 
                                        value={newPlaceData.wifiPass}
                                        onChange={(e) => setNewPlaceData({...newPlaceData, wifiPass: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black py-4 rounded-2xl transition-all active:scale-95"
                                >
                                    {t.cancel}
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isAddPlaceLoading}
                                    className="flex-2 bg-amber-500 hover:bg-amber-600 text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isAddPlaceLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                                    {t.submitForApproval}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
