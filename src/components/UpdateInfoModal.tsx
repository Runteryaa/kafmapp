import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Save, Link } from 'lucide-react';
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

        // 1. Determine changes
        const currentToiletPass = place.toiletPass || null;
        const currentWifiPass = place.wifiPass || null;
        const currentMenuUrl = place.menuUrl || null;
        const currentMenu = JSON.stringify(place.menu || []);

        const newToiletPass = toiletPass.trim() || null;
        const newWifiPass = wifiPass.trim() || null;
        const newMenuUrl = menuUrl.trim() || null;
        const newMenu = JSON.stringify(filteredMenu);

        const isWcChanged = currentToiletPass !== newToiletPass;
        const isWifiChanged = currentWifiPass !== newWifiPass;
        const isMenuUrlChanged = currentMenuUrl !== newMenuUrl;
        const isMenuChanged = currentMenu !== newMenu;

        // 2. Check for auto-approval (Free/Open)
        const isFree = (val: string | null) => {
            if (!val) return false;
            const lower = val.toLowerCase().trim();
            return ['free', 'open', 'public', 'no password', 'ücretsiz', 'ucretsiz'].includes(lower);
        };

        const wcAuto = isWcChanged && isFree(newToiletPass);
        const wifiAuto = isWifiChanged && isFree(newWifiPass);

        try {
            // 3. Apply Direct Updates
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const directUpdatePayload: any = {};
            if (wcAuto) {
                directUpdatePayload.toiletPass = newToiletPass;
                directUpdatePayload.wcUpvotes = 0;
                directUpdatePayload.wcUpdatedAt = new Date().toISOString();
            }
            if (wifiAuto) {
                directUpdatePayload.wifiPass = newWifiPass;
                directUpdatePayload.wifiUpvotes = 0;
                directUpdatePayload.wifiUpdatedAt = new Date().toISOString();
            }

            if (Object.keys(directUpdatePayload).length > 0) {
                const docId = `place_${place.id}`.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 36);
                try {
                    await databases.updateDocument('kafmap', 'places', docId, directUpdatePayload);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (e: any) {
                    if (e.code === 404) {
                        await databases.createDocument('kafmap', 'places', docId, {
                            placeId: place.id.toString(),
                            name: place.name,
                            lat: place.lat.toString(),
                            lng: place.lng.toString(),
                            type: place.type,
                            address: place.address,
                            ratingSum: "0",
                            ratingCount: "0",
                            ...directUpdatePayload
                        });
                    } else throw e;
                }
            }

            // 4. Send Pending Updates (if non-auto changes exist)
            const needsPending = (isWcChanged && !wcAuto) || (isWifiChanged && !wifiAuto) || isMenuUrlChanged || isMenuChanged;

            if (needsPending) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload: any = {
                    placeId: place.id.toString(),
                    name: place.name,
                    lat: place.lat.toString(),
                    lng: place.lng.toString(),
                    type: place.type,
                    address: place.address,
                    toiletPass: newToiletPass,
                    wifiPass: newWifiPass,
                    menuUrl: newMenuUrl,
                    menu: newMenu,
                };

                await databases.createDocument('kafmap', 'pending_updates', ID.unique(), {
                    placeId: place.id.toString(),
                    placeName: place.name,
                    type: 'update',
                    payload: JSON.stringify(payload)
                });
            }

            onSuccess();
            onClose();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                    <form id="update-form" onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t.toiletCode}
                                </label>
                                <input
                                    type="text"
                                    value={toiletPass}
                                    onChange={(e) => setToiletPass(e.target.value)}
                                    placeholder="e.g. 1234, Ask staff"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t.wifiPassword}
                                </label>
                                <input
                                    type="text"
                                    value={wifiPass}
                                    onChange={(e) => setWifiPass(e.target.value)}
                                    placeholder="e.g. freewifi2024"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                                <Link size={14} /> {t.fullMenuUrl}
                            </label>
                            <input
                                type="url"
                                value={menuUrl}
                                onChange={(e) => setMenuUrl(e.target.value)}
                                placeholder="https://example.com/menu"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                            />
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t.menuItems}
                                </label>
                                <button type="button" onClick={addMenuItem} className="text-xs font-semibold text-amber-600 dark:text-amber-500 hover:text-amber-700 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg transition-colors">
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
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        <div className="w-24 shrink-0">
                                            <input
                                                type="text"
                                                value={m.price}
                                                onChange={(e) => updateMenu(idx, 'price', e.target.value)}
                                                placeholder="$4.50"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeMenuItem(idx)}
                                            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors shrink-0"
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
                        className="px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 dark:disabled:bg-amber-800 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {t.submitForApproval}
                    </button>
                </div>
            </div>
        </div>
    );
}
