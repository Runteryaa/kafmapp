import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hashPassword, databases } from '../lib/appwrite';
import { getTranslation, Language } from '../lib/translations';
import { X, User, Lock, Trash2, Loader2, Save, ShieldAlert, Star, ChevronRight } from 'lucide-react';
import { Query } from 'appwrite';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    showToast: (msg: string) => void;
}

export default function AccountSettingsModal({ isOpen, onClose, language, showToast }: AccountSettingsModalProps) {
    const { user, updateAccount, deleteAccount } = useAuth();
    const t = getTranslation(language);
    
    // Form states
    const [name, setName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // User data
    const [myReviews, setMyReviews] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && user) {
            setName((user as any).name || '');
            setCurrentPassword('');
            setNewPassword('');
            setError('');
            fetchMyReviews();
        }
    }, [isOpen, user]);

    const fetchMyReviews = async () => {
        if (!user || !(user as any).$id) return;
        try {
            const response = await databases.listDocuments('kafmap', 'reviews', [
                Query.equal('userId', (user as any).$id)
            ]);
            setMyReviews(response.documents);
        } catch (error) {
            console.error("Failed to fetch user reviews", error);
        }
    };

    if (!isOpen || !user) return null;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await updateAccount({ name });
            showToast(t.updateSuccess || "Updated successfully");
        } catch (err: any) {
            setError(err.message || t.updateFailed || "Update failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const hashedCurrent = await hashPassword(currentPassword);
            if (hashedCurrent !== (user as any).password) {
                throw new Error("Mevcut şifre yanlış / Current password incorrect");
            }
            
            if (newPassword.length < 8) {
                throw new Error("Şifre en az 8 karakter olmalı / Password must be at least 8 chars");
            }
            
            const hashedNew = await hashPassword(newPassword);
            await updateAccount({ password: hashedNew });
            setCurrentPassword('');
            setNewPassword('');
            showToast(t.updateSuccess || "Updated successfully");
        } catch (err: any) {
            setError(err.message || t.updateFailed || "Update failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm(t.deleteAccountConfirm)) return;
        
        setIsLoading(true);
        try {
            await deleteAccount();
            showToast(t.deleteSuccess || "Account deleted");
            onClose();
        } catch (err: any) {
            setError(err.message || t.deleteFailed || "Delete failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col my-auto max-h-[95vh]">
                
                {/* Header - Matches Settings Modal */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-black text-lg text-gray-900 dark:text-white tracking-tight">{t.accountSettings}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 no-scrollbar">
                    
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {/* Profile Section */}
                    <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <User size={12} /> {t.profile}
                        </h4>
                        <form onSubmit={handleUpdateProfile} className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.name}</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-amber-500/50 rounded-lg py-2.5 px-4 outline-none font-bold text-sm text-gray-900 dark:text-white transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading || name === (user as any).name}
                                className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-black py-2.5 px-6 rounded-lg text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t.saveChanges}
                            </button>
                        </form>
                    </section>

                    {/* Security Section */}
                    <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Lock size={12} /> {t.changePassword}
                        </h4>
                        <form onSubmit={handleUpdatePassword} className="space-y-4 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.currentPassword}</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-amber-500/50 rounded-lg py-2.5 px-4 outline-none font-bold text-sm text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.newPassword}</label>
                                    <input 
                                        type="password" 
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-amber-500/50 rounded-lg py-2.5 px-4 outline-none font-bold text-sm text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isLoading || !currentPassword || !newPassword}
                                className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-black py-2.5 px-6 rounded-lg text-xs transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t.saveChanges}
                            </button>
                        </form>
                    </section>

                    {/* Activity Section */}
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Star size={12} /> {t.myReviews} ({myReviews.length})
                        </h4>
                        {myReviews.length === 0 ? (
                            <p className="text-xs text-gray-500 font-medium italic bg-gray-50 dark:bg-gray-800/40 p-4 rounded-lg border border-gray-100 dark:border-gray-800">
                                {t.noReviewsYetProfile}
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {myReviews.map(review => (
                                    <div key={review.$id} className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">ID: {review.placeId}</span>
                                            <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                                                <Star size={10} fill="currentColor" /> {review.rating}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium line-clamp-2">"{review.commentText}"</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Danger Zone */}
                    <section className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <h5 className="text-xs font-black text-red-500 uppercase tracking-wider">{t.deleteAccount}</h5>
                            <p className="text-[10px] text-gray-500 font-medium mt-1">{t.deleteAccountConfirm}</p>
                        </div>
                        <button 
                            onClick={handleDeleteAccount}
                            disabled={isLoading}
                            className="w-full sm:w-auto bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 font-black py-2.5 px-6 rounded-lg text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            {t.deleteAccount}
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
}