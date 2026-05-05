import { Place } from "./types";

const WORKER_URL = "https://kafmapdb.runte.workers.dev";

export async function getPlaces(filters?: {
    bounds?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
    search?: string;
}): Promise<Place[]> {
    let url = `${WORKER_URL}/places/`;

    if (filters?.search) {
        // Appending limit=100
        const query = JSON.stringify({ name: { $instrument: filters.search } });
        url += `?q=${encodeURIComponent(query)}&limit=100`;
    } else if (filters?.bounds) {
        const { minLat, maxLat, minLng, maxLng } = filters.bounds;
        const query = JSON.stringify({ lat: { $between: [minLat, maxLat] }, lng: { $between: [minLng, maxLng] } });
        url += `?q=${encodeURIComponent(query)}&limit=100`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch places: ${response.statusText}`);
    }
    const data = await response.json();

    if (!data || !data.items) {
        return [];
    }

    return data.items.map((item: any): Place => {
        let parsedMenu = [];
        if (item.menu) {
            try {
                // The API might return menu as a string, try parsing
                parsedMenu = typeof item.menu === 'string' ? JSON.parse(item.menu) : item.menu;
            } catch (e) {
                console.error("Failed to parse menu JSON:", e);
            }
        }

        const ratingSum = Number(item.ratingsum) || 0;
        const ratingCount = Number(item.ratingcount) || 0;
        const rating = ratingCount > 0 ? ratingSum / ratingCount : 0;

        return {
            id: Number(item.placeid),
            name: item.name || '',
            lat: Number(item.lat) || 0,
            lng: Number(item.lng) || 0,
            type: item.type || 'restaurant',
            address: item.address || '',
            toiletPass: item.toiletpass || null,
            wifiPass: item.wifipass || null,
            menuUrl: item.menuurl || null,
            rating,
            menu: parsedMenu,
            isRegistered: true,
            wcUpdatedAt: item.wcupdatedat,
            wcUpvotes: item.wcupvotes,
            wifiUpdatedAt: item.wifiupdatedat,
            wifiUpvotes: item.wifiupvotes,
            menuUpdatedAt: item.menuupdatedat,
            menuUpvotes: item.menuupvotes,
        };
    });
}

export async function createUpdate(payload: any): Promise<void> {
    const response = await fetch(`${WORKER_URL}/pending_updates/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Failed to create update: ${response.statusText}`);
    }
}
