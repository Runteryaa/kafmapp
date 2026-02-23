import { useState } from 'react';
import { databases, ID } from '../lib/appwrite';
import { X, Flag, Loader2 } from 'lucide-react';
import { Place } from '../lib/types';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    place: Place | null;
    t: any;
    onSuccess: () => void;
}

export default function ReportModal({ isOpen, onClose, place, t, onSuccess }: ReportModalProps) {
    const [reason, setReason] = useState<string>('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !place) return null;

    const reportReasons = [
        { value: 'wcPasswordIncorrect', label: t.wcPasswordIncorrect },
        { value: 'wifiPasswordIncorrect', label: t.wifiPasswordIncorrect },
        { value: 'menuPricesOutdated', label: t.menuPricesOutdated },
        { value: 'placeClosed', label: t.placeClosed },
        { value: 'otherReason', label: t.otherReason }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            setError(t.selectReason);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await databases.createDocument('kafmap', 'pending_updates', ID.unique(), {
                placeId: place.id.toString(),
                placeName: place.name,
                type: 'report',
                payload: JSON.stringify({
                    reasonCode: reason,
                    reason: reportReasons.find(r => r.value === reason)?.label || reason,
                    details: details.trim(),
                    date: new Date().toISOString()
                })
            });

            onSuccess();
            onClose();
            // Reset state
            setReason('');
            setDetails('');
        } catch (err: any) {
            console.error(err);
            setError(err.message || t.failedReport);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
                    <h2 className="text-xl font-bold text-red-900 dark:text-red-100 flex items-center gap-2">
                        <Flag size={20} className="text-red-500" />
                        {t.reportReasonTitle}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form id="report-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 uppercase block">
                                {t.selectReason}
                            </label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm"
                                required
                            >
                                <option value="" disabled>{t.selectReason}</option>
                                {reportReasons.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        {reason === 'otherReason' && (
                            <div className="space-y-2 animate-fade-in">
                                <label className="text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 uppercase block">
                                    {t.otherReason}
                                </label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    placeholder="..."
                                    rows={3}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500 outline-none transition-all shadow-sm resize-none"
                                    required
                                />
                            </div>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col-reverse sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {t.cancel}
                    </button>
                    <button
                        type="submit"
                        form="report-form"
                        disabled={isSubmitting || !reason}
                        className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
                        {t.submitReport}
                    </button>
                </div>
            </div>
        </div>
    );
}
