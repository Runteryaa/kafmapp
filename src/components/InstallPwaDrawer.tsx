import React from 'react';
import { X, MapPin, Download } from 'lucide-react';

interface InstallPwaDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
}

export const InstallPwaDrawer: React.FC<InstallPwaDrawerProps> = ({ isOpen, onClose, onInstall, t }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-end justify-center sm:items-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer/Modal */}
            <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl transform transition-transform animate-slide-up sm:animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">

                {/* Header with Close Button */}
                <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 pt-10 flex flex-col items-center text-center">
                    {/* App Icon */}
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-amber-600 dark:text-amber-500">
                        <MapPin size={40} className="stroke-[2.5]" />
                    </div>

                    {/* Title & Subtitle */}
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {t.installTitle || "Install kaf'map"}
                    </h2>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-4">
                        {t.installSubtitle || "Get the full experience"}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
                        {t.installDescription || "Add to your home screen for faster access, offline maps, and a better experience."}
                    </p>

                    {/* Screenshots Scroll Area */}
                    <div className="w-full overflow-x-auto pb-4 mb-4 scrollbar-hide">
                        <div className="flex gap-3 px-1">
                            {/* Mock Screenshot 1 - Map View */}
                            <div className="w-32 h-56 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col overflow-hidden relative shadow-sm">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 w-full mb-1"></div>
                                <div className="flex-1 relative p-2">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <MapPin size={16} className="text-amber-500" />
                                    </div>
                                    <div className="w-6 h-6 bg-white dark:bg-gray-600 rounded-full absolute bottom-4 right-2 shadow-sm"></div>
                                </div>
                                <div className="h-12 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"></div>
                            </div>

                            {/* Mock Screenshot 2 - List View */}
                            <div className="w-32 h-56 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col overflow-hidden relative shadow-sm">
                                <div className="h-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-2"></div>
                                <div className="px-2 space-y-2">
                                    <div className="h-10 bg-white dark:bg-gray-700 rounded-md w-full shadow-sm"></div>
                                    <div className="h-10 bg-white dark:bg-gray-700 rounded-md w-full shadow-sm"></div>
                                    <div className="h-10 bg-white dark:bg-gray-700 rounded-md w-full shadow-sm"></div>
                                </div>
                            </div>

                             {/* Mock Screenshot 3 - Dark Mode */}
                             <div className="w-32 h-56 bg-gray-800 rounded-lg border-2 border-gray-600 flex-shrink-0 flex flex-col overflow-hidden relative shadow-sm">
                                <div className="h-4 bg-gray-700 w-full mb-1"></div>
                                <div className="flex-1 relative p-2">
                                    <div className="absolute top-1/3 left-1/3">
                                        <MapPin size={16} className="text-amber-500" />
                                    </div>
                                </div>
                                <div className="h-12 bg-gray-900 border-t border-gray-700"></div>
                            </div>
                        </div>
                    </div>

                    {/* Install Button */}
                    <button
                        onClick={onInstall}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                    >
                        <Download size={20} />
                        {t.installBtnLong || "Add to Home Screen"}
                    </button>

                    <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                        {t.installInstructions}
                    </p>
                </div>
            </div>
        </div>
    );
};
