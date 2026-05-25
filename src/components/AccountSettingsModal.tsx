import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hashPassword, databases } from '../lib/appwrite';
import { getTranslation, Language } from '../lib/translations';
import { X, User, Lock, Trash2, Loader2, Save, ShieldAlert, FileText, Star } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'danger'>('profile');
    
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
            setActiveTab('profile');
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
            // Verify current password first to ensure it's the owner
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
            setActiveTab('profile');
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
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-[32px] w-full max-w-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row my-auto">
                
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-800/50 p-6 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col">
                    <div className="flex items-center justify-between md:mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">{t.accountSettings}</h2>
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px] md:max-w-full">{(user as any).email}</p>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto no-scrollbar md:overflow-visible pb-2 md:pb-0 mt-4 md:mt-0">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap md:whitespace-normal ${activeTab === 'profile' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                        >
                            <User size={18} /> {t.profile}
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap md:whitespace-normal ${activeTab === 'security' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                        >
                            <Lock size={18} /> {t.changePassword}
                        </button>
                        <button 
                            onClick={() => setActiveTab('danger')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap md:whitespace-normal mt-auto ${activeTab === 'danger' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                        >
                            <Trash2 size={18} /> {t.deleteAccount}
                        </button>
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 relative">
                    <button onClick={onClose} className="hidden md:flex absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10">
                        <X size={20} className="text-gray-400" />
                    </button>

                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="animate-fade-in space-y-8">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">{t.profile}</h3>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.name}</label>
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-3.5 px-4 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={isLoading || name === (user as any).name}
                                        className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-black py-3.5 px-8 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                    >
                                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {t.saveChanges}
                                    </button>
                                </form>
                            </div>

                            <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Star size={16} className="text-amber-500" /> {t.myReviews} ({myReviews.length})
                                </h4>
                                {myReviews.length === 0 ? (
                                    <p className="text-sm text-gray-500 font-medium italic bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
                                        {t.noReviewsYetProfile}
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                                        {myReviews.map(review => (
                                            <div key={review.$id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Place ID: {review.placeId}</span>
                                                    <span className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                                                        <Star size={10} fill="currentColor" /> {review.rating}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium line-clamp-2">"{review.commentText}"</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-fade-in">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">{t.changePassword}</h3>
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.currentPassword}</label>
                                    <input 
                                        type="password" 
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-3.5 px-4 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t.newPassword}</label>
                                    <input 
                                        type="password" 
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-amber-500/30 rounded-2xl py-3.5 px-4 outline-none font-bold text-gray-900 dark:text-white transition-all shadow-inner"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading || !currentPassword || !newPassword}
                                    className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-black py-3.5 px-8 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {t.saveChanges}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="animate-fade-in flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6">
                                <ShieldAlert size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">{t.deleteAccount}</h3>
                            <p className="text-gray-500 dark:text-gray-400 font-medium mb-8">
                                {t.deleteAccountWarning}
                            </p>
                            <button 
                                onClick={handleDeleteAccount}
                                disabled={isLoading}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                {t.deleteAccount}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}