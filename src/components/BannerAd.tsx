"use client";

import { useState } from "react";
import { Sponsor } from "../lib/types";
import { X, ExternalLink, Megaphone } from "lucide-react";

interface BannerAdProps {
    sponsor: Sponsor;
    isMobile: boolean;
}

export function BannerAd({ sponsor, isMobile }: BannerAdProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    if (!isVisible) return null;

    // Dinamik Konumlandırma Hesaplamaları
    const isTop = sponsor.position === 'top';
    
    // Banner Durumu (Küçük)
    const bannerClasses = `
        ${isTop ? 'top-20' : isMobile ? 'bottom-24' : 'bottom-6'}
        ${isMobile ? 'w-[calc(100%-160px)]' : 'w-full max-w-[400px]'}
        h-[110px] rounded-2xl
    `;

    // Drawer Durumu (Genişlemiş)
    const expandedClasses = `
        bottom-0 w-[95%] max-w-lg
        h-[60vh] sm:h-[550px] rounded-t-[2.5rem]
    `;

    return (
        <>
            {/* Arka Plan Karartma (Sadece genişlediğinde) */}
            <div 
                className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-500
                    ${isExpanded ? 'opacity-100 z-[2000] pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsExpanded(false)}
            />

            {/* Morphing Container */}
            <div 
                className={`fixed left-1/2 transform -translate-x-1/2 z-[2001] pointer-events-auto
                    bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 shadow-2xl
                    transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden
                    ${isExpanded ? expandedClasses : bannerClasses}`}
            >
                {/* 1. BANNER GÖRÜNÜMÜ (KÜÇÜK) */}
                <div 
                    className={`absolute inset-0 transition-opacity duration-300 flex items-center
                        ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => setIsExpanded(true)}
                >
                    <div className="relative w-full h-full flex items-center p-4 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 cursor-pointer group">
                        {/* Kapatma Butonu */}
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsVisible(false);
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/50 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-10"
                        >
                            <X size={14} />
                        </button>

                        {/* Sol İkon */}
                        <div className="flex-shrink-0 w-14 h-14 sm:w-12 sm:h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {sponsor.imageUrl ? (
                                <img src={sponsor.imageUrl} alt={sponsor.title} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Megaphone size={28} className="sm:w-6 sm:h-6" />
                            )}
                        </div>

                        {/* Banner Metinleri */}
                        <div className="flex-1 pr-2">
                            <div className="flex flex-col gap-1 mb-1">
                                <div className="w-fit text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 sm:px-2 py-0.5 rounded-md">
                                    Sponsorlu
                                </div>
                                <h4 className="text-sm sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                                    {sponsor.title}
                                </h4>
                            </div>
                            <p className="text-xs sm:text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-tight">
                                {sponsor.description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. DRAWER GÖRÜNÜMÜ (GENİŞLEMİŞ) */}
                <div 
                    className={`absolute inset-0 transition-opacity duration-500 flex flex-col
                        ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {/* Drawer Header */}
                    <div className="relative h-28 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-4 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="absolute -bottom-8 w-24 h-24 rounded-2xl bg-white shadow-2xl flex items-center justify-center text-blue-600 border-4 border-white dark:border-gray-900">
                            {sponsor.imageUrl ? (
                                <img src={sponsor.imageUrl} alt={sponsor.title} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <Megaphone size={40} />
                            )}
                        </div>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 mt-12 px-8 pb-6 text-center overflow-y-auto scrollbar-hide">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2 block">
                            Sponsorlu İçerik
                        </span>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                            {sponsor.title}
                        </h3>
                        
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 mb-8 text-gray-600 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-gray-800 text-left">
                            {sponsor.description}
                        </div>
                        
                            <div className="flex flex-col gap-3">
                                <a 
                                    href={sponsor.linkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group"
                                >
                                    Fırsatı Gör
                                    <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                                </a>
                            </div>
                    </div>
                </div>
            </div>
        </>
    );
}
