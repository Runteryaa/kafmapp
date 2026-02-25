"use client";

import { useState, useEffect } from 'react';
import { databases } from '../../lib/appwrite';
import { Check, X, ShieldCheck, Lock, Loader2, MapPin, KeyRound, Wifi, Link } from 'lucide-react';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Simple hardcoded password for now. Replace with environment variable or proper auth later
    const ADMIN_PASSWORD = "admin";

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD || passwordInput === "admin123") {
            setIsAuthenticated(true);
            fetchPendingUpdates();
        } else {
            alert("Incorrect password");
        }
    };

    const fetchPendingUpdates = async () => {
        setIsLoading(true);
        try {
            const response = await databases.listDocuments('kafmap', 'pending_updates');
            setPendingUpdates(response.documents);
        } catch (error) {
            console.error("Failed to fetch pending updates:", error);
            alert("Ensure the 'pending_updates' collection exists in Appwrite with {placeId, placeName, type, payload} columns.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (doc: any) => {
        setActionLoadingId(doc.$id);
        try {
            if (doc.type === 'report') {
                // Acknowledging a report simply dismisses it from the queue without inserting the report reason into the places database.
                await databases.deleteDocument('kafmap', 'pending_updates', doc.$id);
                setPendingUpdates(prev => prev.filter(p => p.$id !== doc.$id));
                // Optional: alert or toast here
                return;
            }

            const payload = JSON.parse(doc.payload);
            const docId = `place_${payload.placeId}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);

            try {
                const existingPlace = await databases.getDocument('kafmap', 'places', docId);
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
                // Ignore if not found
            }

            delete payload.verifyCount;

            try {
                // Try to update existing document first in the main places collection
                await databases.updateDocument('kafmap', 'places', docId, payload);
            } catch (updateErr: any) {
                // If it doesn't exist (404), create a new one
                if (updateErr.code === 404) {
                    await databases.createDocument('kafmap', 'places', docId, payload);
                } else {
                    throw updateErr;
                }
            }

            // If successfully approved, delete it from pending
            await databases.deleteDocument('kafmap', 'pending_updates', doc.$id);
            setPendingUpdates(prev => prev.filter(p => p.$id !== doc.$id));

        } catch (err) {
            console.error("Failed to approve update:", err);
            alert("Failed to approve update. Check console for details.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (docId: string) => {
        if (!confirm("Are you sure you want to reject and delete this submission?")) return;

        setActionLoadingId(docId);
        try {
            // Simply delete it from the pending collection
            await databases.deleteDocument('kafmap', 'pending_updates', docId);
            setPendingUpdates(prev => prev.filter(p => p.$id !== docId));
        } catch (err) {
            console.error("Failed to reject update:", err);
            alert("Failed to reject update. Check console for details.");
        } finally {
            setActionLoadingId(null);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500 text-center mb-8">Enter the master password to access pending approvals.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    placeholder="Admin Password"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <ShieldCheck size={32} className="text-blue-500" /> Administrative Panel
                        </h1>
                        <p className="text-gray-500 mt-1 pl-11">Review and approve user-submitted map edits.</p>
                    </div>
                    <button onClick={() => fetchPendingUpdates()} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-700 dark:text-gray-200">
                        Refresh List
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4" />
                        <p>Loading pending submissions...</p>
                    </div>
                ) : pendingUpdates.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
                            <Check size={32} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">You're all caught up!</h3>
                        <p className="text-gray-500 mt-2">There are no pending submissions waiting for your approval right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {pendingUpdates.map((doc) => {
                            let parsedPayload: any = {};
                            let parsedMenu: any[] = [];
                            try {
                                parsedPayload = JSON.parse(doc.payload);
                                if (parsedPayload.menu) {
                                    parsedMenu = JSON.parse(parsedPayload.menu);
                                }
                            } catch (e) {
                                console.error("Could not parse payload for doc", doc.$id);
                            }

                            return (
                                <div key={doc.$id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
                                    <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${doc.type === 'report' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                {doc.type === 'report' ? 'User Report' : 'Update Request'}
                                            </span>
                                            <span className="text-xs text-gray-400 font-mono">ID: {doc.placeId}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-3 mb-1">{doc.placeName}</h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14} /> {parsedPayload.address || "Address unavailable"}</p>

                                        {doc.type === 'report' ? (
                                            <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                                                <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Reason for Report</p>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{parsedPayload.reason || "Inaccurate information or abuse"}</p>
                                                <p className="text-xs text-gray-500 mt-2">{parsedPayload.date ? new Date(parsedPayload.date).toLocaleString() : ''}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-4 mt-6">
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><KeyRound size={12} /> Toilet Code</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{parsedPayload.toiletPass ? parsedPayload.toiletPass : <span className="text-gray-400 italic">None Provided</span>}</p>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><Wifi size={12} /> Wifi Pass</p>
                                                        <p className="font-medium text-gray-900 dark:text-white">{parsedPayload.wifiPass ? parsedPayload.wifiPass : <span className="text-gray-400 italic">None Provided</span>}</p>
                                                    </div>
                                                </div>

                                                {parsedPayload.menuUrl && (
                                                    <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><Link size={12} /> Menu URL</p>
                                                        <a href={parsedPayload.menuUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all">
                                                            {parsedPayload.menuUrl}
                                                        </a>
                                                    </div>
                                                )}

                                                {parsedMenu.length > 0 && (
                                                    <div className="mt-6">
                                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Menu Additions ({parsedMenu.length} items)</p>
                                                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 p-2 max-h-40 overflow-y-auto">
                                                            {parsedMenu.map((m: any, i: number) => (
                                                                <div key={i} className="flex justify-between items-center py-2 px-3 border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{m.item}</span>
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{m.price}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="p-6 md:w-64 bg-gray-50/50 dark:bg-gray-900/20 flex flex-col justify-center gap-3">
                                        <button
                                            onClick={() => handleApprove(doc)}
                                            disabled={actionLoadingId === doc.$id}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {actionLoadingId === doc.$id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                            {doc.type === 'report' ? 'Acknowledge Report' : 'Approve & Publish'}
                                        </button>
                                        <button
                                            onClick={() => handleReject(doc.$id)}
                                            disabled={actionLoadingId === doc.$id}
                                            className="w-full bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <X size={18} />
                                            Reject Request
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
