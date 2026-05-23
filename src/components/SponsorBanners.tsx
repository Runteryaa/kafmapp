"use client";

import { useState, useEffect } from "react";
import { getActiveSponsors } from "../lib/sponsors";
import { BannerAd } from "./BannerAd";

export default function SponsorBanners({ isMobile }: { isMobile: boolean }) {
    const [isMounted, setIsMounted] = useState(false);
    const activeSponsors = getActiveSponsors();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted || activeSponsors.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[2001]">
            {activeSponsors.map(sponsor => (
                <BannerAd key={sponsor.id} sponsor={sponsor} isMobile={isMobile} />
            ))}
        </div>
    );
}
