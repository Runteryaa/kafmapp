import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Save, Link, ChevronDown, KeyRound, Wifi, Utensils } from 'lucide-react';
import { databases } from '../lib/appwrite';
import { Place } from '../lib/types';
import { ID } from 'appwrite';

export function UpdateInfoModal({
    isOpen,
    onClose,
    place,
    onSuccess,
    t
}: {
    isOpen: boolean;
    onClose: () => void;
    place: Place | null;
    onSuccess: () => void;
    t: any;
}) {
    const [toiletPass, setToiletPass] = useState("");
    const [wifiPass, setWifiPass] = useState("");
    const [menu, setMenu] = useState<{ item: string, price: string }[]>([{ item: '', price: '' }]);
    const [menuUrl, setMenuUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedSection, setExpandedSection] = useState<'toilet' | 'wifi' | 'menu' | null>('toilet');

    useEffect(() => {
        if (place) {
            setToiletPass(place.toiletPass || '');
            setWifiPass(place.wifiPass || '');
            setMenuUrl(place.menuUrl || '');
            setMenu(place.menu && place.menu.length > 0 ? place.menu : [{ item: '', price: '' }]);
        }
    }, [place]);

    if (!isOpen || !place) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const filteredMenu = menu.filter(m => m.item.trim() !== '' && m.price.trim() !== '');

        // Construct the base payload
        const payload: any = {
            placeId: place.id.toString(),
            name: place.name,
            lat: place.lat.toString(),
            lng: place.lng.toString(),
            type: place.type,
            address: place.address,
            toiletPass: toiletPass.trim() || null,
            wifiPass: wifiPass.trim() || null,
            menuUrl: menuUrl.trim() || null,
            menu: JSON.stringify(filteredMenu),
        };

        try {
            // If the place is not registered yet, register it instantly to show on map, but still queue for moderation
            if (!place.isRegistered) {
                const docId = `place_${place.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
                const instantPayload = { ...payload, isRegistered: true, ratingSum: "0", ratingCount: "0" };
                try {
                    await databases.createDocument('kafmap', 'places', docId, instantPayload);
                } catch (e: any) {
                    if (e.code === 409) await databases.updateDocument('kafmap', 'places', docId, instantPayload);
                }
            }

            // Submit changes to the pending_updates collection for admin moderation
            await databases.createDocument('kafmap', 'pending_updates', ID.unique(), {
                placeId: place.id.toString(),
                placeName: place.name,
                type: 'update',
                payload: JSON.stringify(payload)
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save data. Please check database configuration.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateMenu = (index: number, field: 'item' | 'price', value: string) => {
        const newMenu = [...menu];
        newMenu[index][field] = value;
        setMenu(newMenu);
    };

    const addMenuItem = () => setMenu([...menu, { item: '', price: '' }]);
    const removeMenuItem = (index: number) => setMenu(menu.filter((_, i) => i !== index));

    const toggleSection = (section: 'toilet' | 'wifi' | 'menu') => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="fixed inset-0 z-[4000] flex flex-col items-center justify-center p-4 animate-fade-in bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.updateInfo}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px]">{place.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="update-form" onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        {/* Toilet Code Accordion */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all">
                            <button
                                type="button"
                                onClick={() => toggleSection('toilet')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                                    <KeyRound size={18} className="text-amber-500" /> {t.toiletCode}
                                </div>
                                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${expandedSection === 'toilet' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSection === 'toilet' && (
                                <div className="p-4 bg-white dark:bg-gray-900/50 animate-fade-in">
                                    <input
                                        type="text"
                                        value={toiletPass}
                                        onChange={(e) => setToiletPass(e.target.value)}
                                        placeholder="e.g. 1234, Ask staff"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-sm outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Wifi Password Accordion */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all">
                            <button
                                type="button"
                                onClick={() => toggleSection('wifi')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                                    <Wifi size={18} className="text-blue-500" /> {t.wifiPassword}
                                </div>
                                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${expandedSection === 'wifi' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSection === 'wifi' && (
                                <div className="p-4 bg-white dark:bg-gray-900/50 animate-fade-in">
                                    <input
                                        type="text"
                                        value={wifiPass}
                                        onChange={(e) => setWifiPass(e.target.value)}
                                        placeholder="e.g. freewifi2024"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-sm outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Menu Accordion */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all">
                            <button
                                type="button"
                                onClick={() => toggleSection('menu')}
                                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-200">
                                    <Utensils size={18} className="text-green-500" /> {t.menu}
                                </div>
                                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${expandedSection === 'menu' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedSection === 'menu' && (
                                <div className="p-4 bg-white dark:bg-gray-900/50 animate-fade-in space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                                            <Link size={14} /> {t.fullMenuUrl}
                                        </label>
                                        <input
                                            type="url"
                                            value={menuUrl}
                                            onChange={(e) => setMenuUrl(e.target.value)}
                                            placeholder="https://example.com/menu"
                                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-sm outline-none"
                                        />
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {t.menuItems}
                                            </label>
                                            <button type="button" onClick={addMenuItem} className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:text-amber-700 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-lg transition-colors">
                                                <Plus size={14} /> {t.addItem}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {menu.map((m, idx) => (
                                                <div key={idx} className="flex gap-2 items-start">
                                                    <div className="flex-1">
                                                        <input
                                                            type="text"
                                                            value={m.item}
                                                            onChange={(e) => updateMenu(idx, 'item', e.target.value)}
                                                            placeholder={t.itemPlaceholder}
                                                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-sm outline-none"
                                                        />
                                                    </div>
                                                    <div className="w-24 shrink-0">
                                                        <input
                                                            type="text"
                                                            value={m.price}
                                                            onChange={(e) => updateMenu(idx, 'price', e.target.value)}
                                                            placeholder="$4.50"
                                                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white text-sm outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMenuItem(idx)}
                                                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors shrink-0"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {menu.length === 0 && (
                                                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4 italic border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                                                    No menu items added.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        {t.cancel}
                    </button>
                    <button
                        form="update-form"
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-black text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 dark:disabled:bg-amber-800 rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {t.submitForApproval}
                    </button>
                </div>
            </div>
        </div>
    );
}
