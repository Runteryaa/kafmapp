"use client";

import { useState, useEffect, useMemo } from 'react';
import { databases, ID } from '../../lib/appwrite';
import { getTranslation } from '../../lib/translations';
import { useAuth } from '../../context/AuthContext';
import { 
    Check, X, ShieldCheck, Loader2, MapPin, KeyRound, Wifi, 
    Link, Pencil, Trash2, Search, Plus, Coffee, Utensils, 
    Pizza, Beer, Star, ExternalLink, AlertCircle, RefreshCw, LayoutDashboard, Store, MessageSquare,
    Ban
} from 'lucide-react';
import { Place, MenuItem } from '../../lib/types';
import { User } from 'lucide-react';

type Tab = 'submissions' | 'venues' | 'reviews' | 'users';

export default function AdminPage() {
    const { user, logout, loading: authLoading } = useAuth();
    const [language, setLanguage] = useState<'tr' | 'en'>('tr');
    const t = getTranslation(language);
    const [activeTab, setActiveTab] = useState<Tab>('submissions');
    const [submissionSubTab, setSubmissionSubTab] = useState<'all' | 'reports' | 'additions' | 'updates' | 'spam'>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    
    // Data states
    const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
    const [allVenues, setAllVenues] = useState<Place[]>([]);
    const [allReviews, setAllReviews] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [venueSearchQuery, setVenueSearchQuery] = useState("");
    const [reviewSearchQuery, setReviewSearchQuery] = useState("");
    const [userSearchQuery, setUserSearchQuery] = useState("");
    
    // Action states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [editingVenue, setEditingVenue] = useState<Place | null>(null);
    const [isSavingVenue, setIsSavingVenue] = useState(false);

    const filteredSubmissions = useMemo(() => {
        // 'all' tab should NOT show spam by default to keep it clean
        if (submissionSubTab === 'all') return pendingUpdates.filter(s => s.isSpam !== 'true');
        if (submissionSubTab === 'spam') return pendingUpdates.filter(s => s.isSpam === 'true');
        
        // Other tabs show non-spam items of that type
        const nonSpam = pendingUpdates.filter(s => s.isSpam !== 'true');
        if (submissionSubTab === 'reports') return nonSpam.filter(s => s.type === 'report');
        if (submissionSubTab === 'additions') return nonSpam.filter(s => s.type === 'add');
        if (submissionSubTab === 'updates') return nonSpam.filter(s => s.type === 'update');
        return nonSpam;
    }, [pendingUpdates, submissionSubTab]);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchPendingUpdates(),
                fetchVenues(),
                fetchReviews(),
                fetchUsers()
            ]);
        } catch (error) {
            console.error("Fetch all failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && user && (user as any).role === 'admin') {
            fetchAllData();
        }
    }, [user, authLoading]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-amber-500" />
            </div>
        );
    }

    if (!user || (user as any).role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck size={48} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Access Denied</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 max-w-md">
                    You do not have the required administrative privileges to view this page.
                </p>
                <a href="/" className="bg-amber-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-transform active:scale-95">
                    Return to Map
                </a>
            </div>
        );
    }

    const fetchPendingUpdates = async () => {
        try {
            const response = await databases.listDocuments('kafmap', 'pending_updates');
            setPendingUpdates(response.documents);
        } catch (error) {
            console.error("Failed to fetch pending updates:", error);
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await databases.listDocuments('kafmap', 'reviews');
            setAllReviews(response.documents);
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await databases.listDocuments('kafmap', 'users');
            setAllUsers(response.documents);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 2500);
    };

    const handleUpdateUserRole = async (userId: string, newRole: string) => {
        setActionLoadingId(userId);
        try {
            await databases.updateDocument('kafmap', 'users', userId, { role: newRole });
            setAllUsers(prev => prev.map(u => u.$id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Failed to update user role:", error);
            alert("Failed to update user role.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleBan = async (user: any) => {
        const isCurrentlyBanned = user.isBanned === 'true';
        const newStatus = isCurrentlyBanned ? 'false' : 'true';
        
        if (!confirm(`${user.name || 'User'} isimli kullanıcıyı ${isCurrentlyBanned ? 'banını kaldırmak' : 'banlamak'} istediğinize emin misiniz?`)) return;

        setActionLoadingId(user.$id);
        try {
            await databases.updateDocument('kafmap', 'users', user.$id, { isBanned: newStatus });
            setAllUsers(prev => prev.map(u => u.$id === user.$id ? { ...u, isBanned: newStatus } : u));
            showToast(`User ${isCurrentlyBanned ? 'unbanned' : 'banned'} successfully`);
        } catch (error) {
            console.error("Failed to toggle ban:", error);
            alert("İşlem başarısız.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteUser = async (user: any) => {
        if (!confirm(`${user.name || 'User'} kullanıcısının hesabını tamamen silmek istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ.`)) return;

        setActionLoadingId(user.$id);
        try {
            await databases.deleteDocument('kafmap', 'users', user.$id);
            setAllUsers(prev => prev.filter(u => u.$id !== user.$id));
            showToast("Account deleted successfully");
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Silme işlemi başarısız.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => 
            (u.name || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(userSearchQuery.toLowerCase()) ||
            u.$id.includes(userSearchQuery)
        );
    }, [allUsers, userSearchQuery]);

    const fetchVenues = async () => {
        try {
            const response = await databases.listDocuments('kafmap', 'places');
            console.log("Admin: Fetched Venues Raw Response:", response.documents);
            // Mapping Appwrite docs to Place type
            const venues = response.documents.map((doc: any) => ({
                id: Number(doc.placeId),
                name: doc.name,
                lat: Number(doc.lat),
                lng: Number(doc.lng),
                type: doc.type,
                address: doc.address,
                toiletPass: doc.toiletPass,
                wifiPass: doc.wifiPass,
                rating: doc.ratingCount > 0 ? Number(doc.ratingSum) / Number(doc.ratingCount) : 0,
                menu: doc.menu ? JSON.parse(doc.menu) : [],
                menuUrl: doc.menuUrl,
                isRegistered: doc.isRegistered,
                wcUpdatedAt: doc.wcUpdatedAt,
                wifiUpdatedAt: doc.wifiUpdatedAt,
                menuUpdatedAt: doc.menuUpdatedAt,
                wcUpvotes: doc.wcUpvotes,
                wifiUpvotes: doc.wifiUpvotes,
                menuUpvotes: doc.menuUpvotes,
                isPremium: doc.isPremium === true || doc.isPremium === 'true',
                premiumUntil: doc.premiumUntil,
                premiumColor: doc.premiumColor,
                ratingSum: doc.ratingSum,
                ratingCount: doc.ratingCount,
                $id: doc.$id // Store the Appwrite doc ID for updates
            })) as any[];
            setAllVenues(venues);
        } catch (error) {
            console.error("Failed to fetch venues:", error);
        }
    };

    const handleApprove = async (doc: any) => {
        console.log("Admin: Approving submission", doc.$id, doc);
        setActionLoadingId(doc.$id);
        try {
            if (doc.type === 'report') {
                console.log("Admin: Deleting report record", doc.$id);
                await databases.deleteDocument('kafmap', 'pending_updates', doc.$id);
                setPendingUpdates(prev => prev.filter((p: any) => p.$id !== doc.$id));
                return;
            }

            const payload = JSON.parse(doc.payload);
            const docId = `place_${payload.placeId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
            console.log("Admin: Target place docId", docId);

            try {
                const existingPlace = await databases.getDocument('kafmap', 'places', docId);
                console.log("Admin: Existing place found", existingPlace);
                if (payload.toiletPass !== undefined && payload.toiletPass !== existingPlace.toiletPass) {
                    payload.wcUpvotes = 0;
                    payload.wcUpdatedAt = new Date().toISOString();
                }
                if (payload.wifiPass !== undefined && payload.wifiPass !== existingPlace.wifiPass) {
                    payload.wifiUpvotes = 0;
                    payload.wifiUpdatedAt = new Date().toISOString();
                }
                if (payload.menu !== undefined && payload.menu !== existingPlace.menu) {
                    payload.menuUpvotes = 0;
                    payload.menuUpdatedAt = new Date().toISOString();
                }
            } catch (e) {
                console.log("Admin: Existing place not found or fetch failed", e);
            }

            delete payload.verifyCount;
            
            // Appwrite stored everything as strings mostly in this project's schema
            const finalPayload: any = { ...payload };
            if (payload.lat) finalPayload.lat = payload.lat.toString();
            if (payload.lng) finalPayload.lng = payload.lng.toString();
            if (payload.placeId) finalPayload.placeId = payload.placeId.toString();

            try {
                console.log("Admin: Updating/Creating place with payload", finalPayload);
                await databases.updateDocument('kafmap', 'places', docId, finalPayload);
            } catch (updateErr: any) {
                if (updateErr.code === 404) {
                    console.log("Admin: Place 404, creating new");
                    await databases.createDocument('kafmap', 'places', docId, finalPayload);
                } else {
                    throw updateErr;
                }
            }

            console.log("Admin: Deleting pending update record", doc.$id);
            await databases.deleteDocument('kafmap', 'pending_updates', doc.$id);
            setPendingUpdates(prev => prev.filter((p: any) => p.$id !== doc.$id));
            fetchVenues(); // Refresh venues list

        } catch (err) {
            console.error("Failed to approve update:", err);
            alert("Failed to approve update.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (docId: string) => {
        if (!confirm("Are you sure you want to reject this submission?")) return;
        console.log("Admin: Rejecting submission", docId);
        setActionLoadingId(docId);
        try {
            await databases.deleteDocument('kafmap', 'pending_updates', docId);
            setPendingUpdates(prev => prev.filter((p: any) => p.$id !== docId));
        } catch (err) {
            console.error("Failed to reject update:", err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleEditVenue = (venue: Place) => {
        setEditingVenue({ ...venue });
    };

    const handleAddNewVenue = () => {
        const newVenue: Place = {
            id: Date.now(), // Temporary ID until saved
            name: "",
            lat: 0,
            lng: 0,
            type: "cafe",
            address: "",
            toiletPass: "",
            wifiPass: "",
            rating: 0,
            menu: [],
            menuUrl: "",
            isRegistered: true
        };
        setEditingVenue(newVenue);
    };

    const handleSaveVenue = async () => {
        if (!editingVenue) return;
        
        if (!editingVenue.address || editingVenue.address.trim() === "") {
            alert("Mekan adresi boş olamaz!");
            return;
        }

        setIsSavingVenue(true);
        try {
            // Check if it's a new venue (no $id) or an existing one
            const isNew = !(editingVenue as any).$id;
            const appwriteId = (editingVenue as any).$id || `place_${editingVenue.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
            
            const payload = {
                name: editingVenue.name,
                type: editingVenue.type,
                address: editingVenue.address,
                toiletPass: editingVenue.toiletPass,
                wifiPass: editingVenue.wifiPass,
                menuUrl: editingVenue.menuUrl,
                menu: JSON.stringify(editingVenue.menu),
                isRegistered: true,
                lat: editingVenue.lat.toString(),
                lng: editingVenue.lng.toString(),
                placeId: editingVenue.id.toString(),
                ratingSum: editingVenue.ratingSum?.toString() || "0",
                ratingCount: editingVenue.ratingCount?.toString() || "0",
                isPremium: editingVenue.isPremium ? "true" : "false",
                premiumUntil: editingVenue.premiumUntil || "",
                premiumColor: editingVenue.premiumColor || ""
            };

            if (isNew) {
                await databases.createDocument('kafmap', 'places', appwriteId, payload);
            } else {
                await databases.updateDocument('kafmap', 'places', appwriteId, payload);
            }

            setEditingVenue(null);
            fetchVenues();
        } catch (error) {
            console.error("Save venue failed", error);
            alert("Failed to save changes");
        } finally {
            setIsSavingVenue(false);
        }
    };

    const handleDeleteVenue = async (venue: any) => {
        if (!confirm(`Are you sure you want to delete "${venue.name}"? This cannot be undone.`)) return;
        setActionLoadingId(venue.$id);
        try {
            await databases.deleteDocument('kafmap', 'places', venue.$id);
            setAllVenues(prev => prev.filter(v => (v as any).$id !== venue.$id));
        } catch (error) {
            console.error("Delete failed", error);
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredVenues = useMemo(() => {
        return allVenues.filter(v => 
            (v.name || "").toLowerCase().includes(venueSearchQuery.toLowerCase()) ||
            (v.address || "").toLowerCase().includes(venueSearchQuery.toLowerCase()) ||
            (v.id || "").toString().includes(venueSearchQuery)
        );
    }, [allVenues, venueSearchQuery]);

    const filteredReviews = useMemo(() => {
        return allReviews.filter(r => 
            (r.userName || "").toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
            (r.commentText || "").toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
            (r.placeId || "").toString().includes(reviewSearchQuery)
        );
    }, [allReviews, reviewSearchQuery]);

    const handleDeleteReviewByAdmin = async (review: any) => {
        if (!confirm(`Delete review by "${review.userName}"?`)) return;
        setActionLoadingId(review.$id);
        try {
            await databases.deleteDocument('kafmap', 'reviews', review.$id);
            setAllReviews(prev => prev.filter(r => r.$id !== review.$id));
        } catch (error) {
            console.error("Delete review failed", error);
        } finally {
            setActionLoadingId(null);
        }
    };

    const getPlaceIcon = (type: string) => {
        switch (type) {
            case 'cafe': return <Coffee size={18} />;
            case 'restaurant': return <Utensils size={18} />;
            case 'fast_food': return <Pizza size={18} />;
            case 'bar':
            case 'pub': return <Beer size={18} />;
            default: return <MapPin size={18} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="w-full md:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col shrink-0">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Admin</h2>
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">KafMap Manager</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    <button 
                        onClick={() => setActiveTab('submissions')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'submissions' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <LayoutDashboard size={20} /> Submissions
                        {pendingUpdates.length > 0 && <span className="ml-auto bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingUpdates.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('venues')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'venues' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <Store size={20} /> Manage Venues
                    </button>
                    <button 
                        onClick={() => setActiveTab('reviews')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'reviews' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <MessageSquare size={20} /> Reviews
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                        <User size={20} /> Manage Users
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 px-2">
                    {user && (
                        <div className="mb-4 px-2">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Logged in as</p>
                            <p className="text-xs font-black text-gray-600 dark:text-gray-300 truncate" title={user.email}>{user.email}</p>
                        </div>
                    )}
                    <button 
                        onClick={() => logout()}
                        className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors w-full px-2 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                        <X size={18} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white capitalize">
                                {activeTab === 'submissions' ? 'Pending Submissions' : 'Venue Directory'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
                                {activeTab === 'submissions' ? 'Review and manage user-submitted updates and reports.' : 'Search, edit and manage all venues in your database.'}
                            </p>
                        </div>
                        <button 
                            onClick={fetchAllData} 
                            disabled={isLoading}
                            className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={`text-gray-600 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <Loader2 size={48} className="animate-spin text-amber-500 mb-6" />
                            <p className="text-lg font-bold tracking-tight">Syncing with database...</p>
                        </div>
                    )}

                    {!isLoading && activeTab === 'submissions' && (
                        <>
                            {/* Sub-tabs for Submissions */}
                            <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-gray-800 p-2 rounded-[20px] border border-gray-100 dark:border-gray-800 shadow-sm">
                                <button 
                                    onClick={() => setSubmissionSubTab('all')}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${submissionSubTab === 'all' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    All ({pendingUpdates.filter(s => s.isSpam !== 'true').length})
                                </button>
                                <button 
                                    onClick={() => setSubmissionSubTab('reports')}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${submissionSubTab === 'reports' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    User Reports ({pendingUpdates.filter(s => s.type === 'report' && s.isSpam !== 'true').length})
                                </button>
                                <button 
                                    onClick={() => setSubmissionSubTab('additions')}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${submissionSubTab === 'additions' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    New Venues ({pendingUpdates.filter(s => s.type === 'add' && s.isSpam !== 'true').length})
                                </button>
                                <button 
                                    onClick={() => setSubmissionSubTab('updates')}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${submissionSubTab === 'updates' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    Info Updates ({pendingUpdates.filter(s => s.type === 'update' && s.isSpam !== 'true').length})
                                </button>
                                <button 
                                    onClick={() => setSubmissionSubTab('spam')}
                                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${submissionSubTab === 'spam' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    Suspicious / Spam ({pendingUpdates.filter(s => s.isSpam === 'true').length})
                                </button>
                            </div>

                            {filteredSubmissions.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-16 text-center border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${submissionSubTab === 'reports' ? 'bg-red-50 dark:bg-red-900/20' : submissionSubTab === 'additions' ? 'bg-emerald-50 dark:bg-emerald-900/20' : submissionSubTab === 'updates' ? 'bg-blue-50 dark:bg-blue-900/20' : submissionSubTab === 'spam' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                                        <Check size={48} className={submissionSubTab === 'reports' ? 'text-red-500' : submissionSubTab === 'additions' ? 'text-emerald-500' : submissionSubTab === 'updates' ? 'text-blue-500' : submissionSubTab === 'spam' ? 'text-orange-500' : 'text-green-500'} />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{submissionSubTab === 'spam' ? 'No Spam Detected!' : 'Clean Slate!'}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">No {submissionSubTab === 'all' ? 'pending' : submissionSubTab === 'spam' ? 'suspicious' : submissionSubTab.slice(0, -1)} submissions found in this category.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6">
                                    {filteredSubmissions.map((doc) => {
                                        let parsedPayload: any = {};
                                        let parsedMenu: any[] = [];
                                        try {
                                            parsedPayload = JSON.parse(doc.payload);
                                            if (parsedPayload.menu) parsedMenu = JSON.parse(parsedPayload.menu);
                                        } catch (e) {}

                                        return (
                                            <div key={doc.$id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/20 dark:shadow-none border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col lg:flex-row group transition-all hover:border-amber-200">
                                                <div className="p-8 flex-1">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${doc.type === 'report' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : doc.type === 'add' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                                            {doc.type === 'report' ? 'User Report' : doc.type === 'add' ? 'New Venue Registration' : 'Update Request'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono font-bold bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded-xl"># {doc.placeId}</span>
                                                    </div>
                                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{doc.placeName}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium"><MapPin size={16} className="text-amber-500" /> {parsedPayload.address || "Address unavailable"}</p>

                                                    {doc.type === 'report' ? (
                                                        <div className="mt-8 bg-red-50/50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                                                            <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <AlertCircle size={14} /> Reason for Report
                                                            </p>
                                                            <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed">&ldquo;{parsedPayload.reason || "Inaccurate information"}&rdquo;</p>
                                                            {parsedPayload.contactInfo && (
                                                                <div className="mt-4 pt-4 border-t border-red-100 dark:border-red-900/30">
                                                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 italic">Contact Info (Business Owner)</p>
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{parsedPayload.contactInfo}</p>
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-gray-400 mt-4 font-bold">{parsedPayload.date ? new Date(parsedPayload.date).toLocaleString() : ''}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><KeyRound size={12} className="text-amber-500" /> Toilet Code</p>
                                                                <p className="text-lg font-black text-gray-900 dark:text-white">{parsedPayload.toiletPass || <span className="text-gray-400 italic font-medium opacity-50">Empty</span>}</p>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Wifi size={12} className="text-blue-500" /> Wifi Password</p>
                                                                <p className="text-lg font-black text-gray-900 dark:text-white">{parsedPayload.wifiPass || <span className="text-gray-400 italic font-medium opacity-50">Empty</span>}</p>
                                                            </div>
                                                            {parsedPayload.menuUrl && (
                                                                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Link size={12} className="text-green-500" /> External Menu URL</p>
                                                                    <a href={parsedPayload.menuUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-amber-600 hover:underline break-all block">
                                                                        {parsedPayload.menuUrl} <ExternalLink size={12} className="inline ml-1" />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-8 lg:w-72 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-center gap-4">
                                                    <button
                                                        onClick={() => handleApprove(doc)}
                                                        disabled={actionLoadingId === doc.$id}
                                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                                    >
                                                        {actionLoadingId === doc.$id ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                                                        {doc.type === 'report' ? 'Dismiss' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(doc.$id)}
                                                        disabled={actionLoadingId === doc.$id}
                                                        className="w-full bg-white dark:bg-gray-800 text-red-500 border-2 border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                                    >
                                                        <Trash2 size={18} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {!isLoading && activeTab === 'venues' && (
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/10 dark:shadow-none flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={venueSearchQuery}
                                        onChange={(e) => setVenueSearchQuery(e.target.value)}
                                        placeholder="Search by name, address or ID..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-transparent focus:border-amber-500/30 rounded-2xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={handleAddNewVenue}
                                    className="px-6 py-3.5 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <Plus size={18} strokeWidth={3} /> Add New Venue
                                </button>
                            </div>

                            {/* Table-like List */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/10 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 text-left">
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Venue</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Type</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden lg:table-cell">Rating</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Premium</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {filteredVenues.map((venue: any) => (
                                                <tr key={venue.$id} className="hover:bg-amber-50/10 dark:hover:bg-amber-900/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${venue.isRegistered ? 'bg-amber-50 text-amber-500' : 'bg-gray-100 text-gray-400'}`}>
                                                                {getPlaceIcon(venue.type)}
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-black text-gray-900 dark:text-white leading-tight">{venue.name}</p>
                                                                <p className="text-xs text-gray-500 font-medium mt-1 max-w-[200px] truncate">{venue.address}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 hidden md:table-cell">
                                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 capitalize">{venue.type.replace('_', ' ')}</span>
                                                    </td>
                                                    <td className="px-6 py-5 hidden lg:table-cell">
                                                        <div className="flex items-center gap-1">
                                                            <Star size={14} className="text-amber-400 fill-amber-400" />
                                                            <span className="text-sm font-black text-gray-900 dark:text-white">{venue.rating?.toFixed(1) || '0.0'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {venue.isPremium ? (
                                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1 w-fit">
                                                                <Star size={10} fill="currentColor" /> Premium
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 w-fit">
                                                                Standard
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${venue.isRegistered ? 'bg-green-50 text-green-600 dark:bg-green-900/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                                                            {venue.isRegistered ? 'Registered' : 'OSM Only'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleEditVenue(venue)}
                                                                className="p-2.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all active:scale-90"
                                                                title="Edit Venue"
                                                            >
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteVenue(venue)}
                                                                disabled={actionLoadingId === venue.$id}
                                                                className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                                                                title="Delete Venue"
                                                            >
                                                                {actionLoadingId === venue.$id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredVenues.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-gray-400 font-bold">No venues match your search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isLoading && activeTab === 'reviews' && (
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/10 dark:shadow-none flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={reviewSearchQuery}
                                        onChange={(e) => setReviewSearchQuery(e.target.value)}
                                        placeholder="Search by user, comment or place ID..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-transparent focus:border-amber-500/30 rounded-2xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Reviews List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredReviews.map((review: any) => (
                                    <div key={review.$id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs uppercase">
                                                    {review.userName ? review.userName.substring(0, 2) : 'U'}
                                                </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-black text-gray-900 dark:text-white">{review.userName || 'User'}</p>
                                                            {(review.userRole === 'admin' || review.userRole === 'explorer') && (
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${review.userRole === 'admin' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                                                    {review.userRole === 'admin' ? 'ADMIN' : 'GEZGİN'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Place ID: {review.placeId}</p>
                                                    </div>
                                            </div>
                                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">
                                                <Star size={12} className="text-amber-500 fill-amber-500" />
                                                <span className="text-xs font-black text-amber-700 dark:text-amber-400">{review.rating}</span>
                                            </div>
                                        </div>
                                        
                                        {review.commentText ? (
                                            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed mb-6 italic">
                                                &ldquo;{review.commentText}&rdquo;
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400 dark:text-gray-600 font-medium italic mb-6">No comment provided.</p>
                                        )}

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                            <span className="text-[10px] text-gray-400 font-bold">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            <button 
                                                onClick={() => handleDeleteReviewByAdmin(review)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredReviews.length === 0 && (
                                <div className="py-20 text-center">
                                    <p className="text-gray-400 font-bold">No reviews found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!isLoading && activeTab === 'users' && (
                        <div className="space-y-6">
                            {/* Toolbar */}
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/10 dark:shadow-none flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 group">
                                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        placeholder="Search by name, email or ID..."
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border border-transparent focus:border-amber-500/30 rounded-2xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/10 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 text-left">
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                            {filteredUsers.map((u: any) => (
                                                <tr key={u.$id} className="hover:bg-amber-50/10 dark:hover:bg-amber-900/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-black text-xs uppercase text-gray-500">
                                                                {u.name ? u.name.substring(0, 2) : 'U'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{u.name || 'Anonymous'}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono font-bold">ID: {u.$id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{u.email}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${u.role === 'admin' ? 'bg-red-50 text-red-600 dark:bg-red-900/30' : u.role === 'explorer' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                                                                {u.role === 'admin' ? 'admin' : u.role === 'explorer' ? 'explorer' : (u.role || 'user')}
                                                            </span>
                                                            {u.isBanned === 'true' && (
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-black text-white flex items-center gap-1">
                                                                    <Ban size={10} /> Banned
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <select 
                                                                value={u.role || 'user'}
                                                                onChange={(e) => handleUpdateUserRole(u.$id, e.target.value)}
                                                                disabled={actionLoadingId === u.$id}
                                                                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold py-1.5 px-2 outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <option value="user">Set as User</option>
                                                                <option value="explorer">Set as Explorer</option>
                                                                <option value="admin">Set as Admin</option>
                                                            </select>
                                                            <button 
                                                                onClick={() => handleToggleBan(u)}
                                                                disabled={actionLoadingId === u.$id}
                                                                className={`p-2 rounded-xl transition-all ${u.isBanned === 'true' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                                                title={u.isBanned === 'true' ? 'Unban User' : 'Ban User'}
                                                            >
                                                                {actionLoadingId === u.$id ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteUser(u)}
                                                                disabled={actionLoadingId === u.$id}
                                                                className="p-2 bg-gray-50 text-gray-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredUsers.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-gray-400 font-bold">No users found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Venue Modal */}
            {editingVenue && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto py-10">
                    <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-auto">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                                    <Pencil size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Edit Venue</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">#{editingVenue.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingVenue(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Venue Name</label>
                                    <input 
                                        type="text" 
                                        value={editingVenue.name}
                                        onChange={(e) => setEditingVenue({...editingVenue, name: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Type</label>
                                    <select 
                                        value={editingVenue.type}
                                        onChange={(e) => setEditingVenue({...editingVenue, type: e.target.value as any})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="cafe">Cafe</option>
                                        <option value="restaurant">Restaurant</option>
                                        <option value="fast_food">Fast Food</option>
                                        <option value="bar">Bar</option>
                                        <option value="pub">Pub</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Address</label>
                                    <textarea 
                                        value={editingVenue.address}
                                        onChange={(e) => setEditingVenue({...editingVenue, address: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all h-24 resize-none shadow-inner"
                                    />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Latitude</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            value={editingVenue.lat}
                                            onChange={(e) => setEditingVenue({...editingVenue, lat: parseFloat(e.target.value)})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Longitude</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            value={editingVenue.lng}
                                            onChange={(e) => setEditingVenue({...editingVenue, lng: parseFloat(e.target.value)})}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Toilet Code</label>
                                    <input 
                                        type="text" 
                                        value={editingVenue.toiletPass || ""}
                                        onChange={(e) => setEditingVenue({...editingVenue, toiletPass: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Wifi Password</label>
                                    <input 
                                        type="text" 
                                        value={editingVenue.wifiPass || ""}
                                        onChange={(e) => setEditingVenue({...editingVenue, wifiPass: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Menu URL</label>
                                    <input 
                                        type="text" 
                                        value={editingVenue.menuUrl || ""}
                                        onChange={(e) => setEditingVenue({...editingVenue, menuUrl: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-4 px-5 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                
                                {/* Premium Sponsorship Section */}
                                <div className="md:col-span-2 pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-6 px-1 flex items-center gap-2">
                                        <Star size={16} fill="currentColor" /> Premium Sponsorship Settings
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50/30 dark:bg-amber-900/5 p-6 rounded-[2rem] border border-amber-100/50 dark:border-amber-900/20">
                                        <div className="flex items-center gap-3 px-1">
                                            <input 
                                                type="checkbox" 
                                                id="isPremium"
                                                checked={editingVenue.isPremium || false}
                                                onChange={(e) => setEditingVenue({...editingVenue, isPremium: e.target.checked})}
                                                className="w-6 h-6 rounded-lg border-2 border-amber-300 text-amber-500 focus:ring-amber-500/20 transition-all cursor-pointer"
                                            />
                                            <label htmlFor="isPremium" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                                                Enable Premium Highlighting
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Sponsorship Ends On</label>
                                            <input 
                                                type="date" 
                                                value={editingVenue.premiumUntil ? new Date(editingVenue.premiumUntil).toISOString().split('T')[0] : ""}
                                                onChange={(e) => setEditingVenue({...editingVenue, premiumUntil: e.target.value ? new Date(e.target.value).toISOString() : ""})}
                                                className="w-full bg-white dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-xl py-3 px-4 outline-none font-bold text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Glow / Highlight Color (Optional)</label>
                                            <div className="flex gap-3 items-center">
                                                <input 
                                                    type="color" 
                                                    value={editingVenue.premiumColor || "#d97706"}
                                                    onChange={(e) => setEditingVenue({...editingVenue, premiumColor: e.target.value})}
                                                    className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer p-0"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="#RRGGBB"
                                                    value={editingVenue.premiumColor || ""}
                                                    onChange={(e) => setEditingVenue({...editingVenue, premiumColor: e.target.value})}
                                                    className="flex-1 bg-white dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-xl py-3 px-4 outline-none font-bold text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                                                />
                                                <button 
                                                    onClick={() => setEditingVenue({...editingVenue, premiumColor: ""})}
                                                    className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Reset to default"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 px-1 italic">Leave empty to use the venue type's default color.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex gap-4">
                            <button 
                                onClick={() => setEditingVenue(null)}
                                className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-black py-4 rounded-2xl transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveVenue}
                                disabled={isSavingVenue}
                                className="flex-2 bg-amber-500 hover:bg-amber-600 text-white font-black py-4 px-10 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSavingVenue ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            <div className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-2xl shadow-2xl z-[9000] flex items-center gap-3 transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <ShieldCheck size={18} className="text-amber-400" />
                <span className="text-sm font-black tracking-wide">{toastMessage}</span>
            </div>
        </div>
    );
}
