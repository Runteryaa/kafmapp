import { Client, ID, Query } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("kafmap");

const BASE_URL = "https://kafmapdb.runte.workers.dev";
const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN;

async function hashPassword(password: string) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback if subtle crypto is somehow not available
    return btoa(password); 
}

const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
};

const setCookie = (name: string, value: string, days = 7) => {
    if (typeof document === 'undefined') return;
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
};

const deleteCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    document.cookie = name + '=; Max-Age=-99999999; path=/';
};

const account = {
    get: async () => {
        const userData = getCookie('kafmap_auth');
        if (!userData) throw new Error('Not authenticated');

        try {
            const localUser = JSON.parse(decodeURIComponent(userData));
            const userId = localUser.$id || localUser.id || localUser.ID;

            if (!userId) {
                deleteCookie('kafmap_auth');
                throw new Error('Invalid session data');
            }

            // Verify with backend that the user still exists and isn't banned
            const url = `${BASE_URL}/user_accounts/${userId}`;
            const response = await fetch(url);

            if (!response.ok) {
                // If user is deleted or record is gone, clear session
                deleteCookie('kafmap_auth');
                throw new Error('Session expired or account deleted');
            }

            const rawData = await response.json();
            const latestUser = normalizeDoc(Array.isArray(rawData.items) ? rawData.items[0] : rawData);
            
            // Re-normalize $id to ensure consistency
            if (!latestUser.$id) latestUser.$id = latestUser.id || latestUser.ID || userId;

            // Optional: If banned, we could also force logout here or just let the UI handle it
            // if (latestUser.isBanned === 'true') { ... }

            // Update cookie with latest data (roles, name changes, etc)
            setCookie('kafmap_auth', encodeURIComponent(JSON.stringify(latestUser)), 30);
            
            return latestUser;
        } catch(e) {
            deleteCookie('kafmap_auth');
            throw new Error('Not authenticated');
        }
    },
    createEmailPasswordSession: async (email: string, password: string) => {
        const hashedPassword = await hashPassword(password);
        const url = `${BASE_URL}/api/login`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: hashedPassword })
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Invalid email or password');
        }
        
        const user = await response.json();
        
        const normalizedUser = {
            ...user,
            $id: String(user.id || user.ID || Math.random())
        };
        
        setCookie('kafmap_auth', encodeURIComponent(JSON.stringify(normalizedUser)), 30); // 30 days
        return normalizedUser;
    },
    deleteSession: async (sessionId: string) => {
        deleteCookie('kafmap_auth');
        return { success: true };
    },
    create: async (userId: string, email: string, password: string, name?: string) => {
        const hashedPassword = await hashPassword(password);
        const url = `${BASE_URL}/api/register`;
        
        const finalId = userId === 'unique()' ? Math.random().toString(36).substring(2, 15) : userId;
        const payload = {
            id: finalId,
            email: email,
            password: hashedPassword,
            name: name || '',
            createdat: new Date().toISOString()
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to create account in database');
        }
        
        let createdUser: any = payload;
        try {
            createdUser = await response.json();
        } catch (e) {}
        
        return { ...createdUser, $id: finalId };
    }
};

const mapCollectionToTable = (collectionId: string) => {
    return collectionId;
};

const normalizeDoc = (doc: any) => {
    if (!doc) return doc;
    const normalized: any = {};
    
    // Mapping from DB (lowercase) to Frontend (camelCase)
    const mappings: Record<string, string> = {
        placeid: 'placeId',
        userid: 'userId',
        username: 'userName',
        commenttext: 'commentText',
        imageurl: 'imageUrl',
        createdat: 'createdAt',
        toiletpass: 'toiletPass',
        wifipass: 'wifiPass',
        isregistered: 'isRegistered',
        ratingsum: 'ratingSum',
        ratingcount: 'ratingCount',
        menuurl: 'menuUrl',
        wcupdatedat: 'wcUpdatedAt',
        wifiupvotes: 'wifiUpvotes',
        wcupvotes: 'wcUpvotes',
        wifiupdatedat: 'wifiUpdatedAt',
        menuupvotes: 'menuUpvotes',
        menuupdatedat: 'menuUpdatedAt',
        placename: 'placeName',
        reasoncode: 'reasonCode',
        ispremium: 'isPremium',
        premiumuntil: 'premiumUntil',
        premiumcolor: 'premiumColor',
        listtype: 'listType',
        listcolor: 'listColor',
        isspam: 'isSpam',
        role: 'role',
        userrole: 'userRole',
        isbanned: 'isBanned'
    };

    // Copy everything using lowercase mapping check, starting from EMPTY object to avoid duplicates
    Object.keys(doc).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (mappings[lowerKey]) {
            normalized[mappings[lowerKey]] = doc[key];
        } else if (!key.startsWith('links')) {
            // Keep keys that don't have a mapping but aren't ORDS internal links
            normalized[key] = doc[key];
        }
    });

    // Convert string 'null' to actual null and handle types
    for (const key of Object.keys(normalized)) {
        if (normalized[key] === 'null') {
            normalized[key] = null;
        }
        // Ensure booleans are handled correctly
        if (key === 'isPremium' || key === 'isRegistered') {
            const val = normalized[key];
            if (val === 'true' || val === true) normalized[key] = true;
            else if (val === 'false' || val === false) normalized[key] = false;
            else normalized[key] = false; // Default to false for null or other values
        }
    }

    if (!normalized.$id) {
        normalized.$id = String(normalized.id || normalized.ID || normalized.placeId || Math.random());
    }

    return normalized;
};

const denormalizeDoc = (doc: any) => {
    if (!doc) return doc;
    const denormalized: any = {};
    
    // Mapping from Frontend (camelCase) to DB (lowercase)
    const mappings: Record<string, string> = {
        placeId: 'placeid',
        userId: 'userid',
        userName: 'username',
        commentText: 'commenttext',
        imageUrl: 'imageurl',
        createdAt: 'createdat',
        toiletPass: 'toiletpass',
        wifiPass: 'wifipass',
        isRegistered: 'isregistered',
        ratingSum: 'ratingsum',
        ratingCount: 'ratingcount',
        menuUrl: 'menuurl',
        wcUpdatedAt: 'wcupdatedat',
        wifiUpvotes: 'wifiupvotes',
        wcupvotes: 'wcupvotes',
        wifiUpdatedAt: 'wifiupdatedat',
        menuUpvotes: 'menuupvotes',
        menuUpdatedAt: 'menuupdatedat',
        placeName: 'placename',
        reasonCode: 'reasoncode',
        isPremium: 'ispremium',
        premiumUntil: 'premiumuntil',
        premiumColor: 'premiumcolor',
        listType: 'listtype',
        listColor: 'listcolor',
        isSpam: 'isspam',
        role: 'role',
        userRole: 'userrole',
        isBanned: 'isbanned'
    };
    
    // Process input starting from EMPTY object to avoid casing duplicates
    Object.keys(doc).forEach(key => {
        if (mappings[key]) {
            denormalized[mappings[key]] = doc[key];
        } else if (!key.startsWith('$') && key !== 'links') {
            // Lowercase unknown keys for ORDS, skip internal fields
            denormalized[key.toLowerCase()] = doc[key];
        }
    });

    return denormalized;
};

// Mocking Appwrite Databases with REST API
const databases = {
    listDocuments: async (databaseId: string, collectionId: string, queries?: string[]) => {
        const table = mapCollectionToTable(collectionId);
        const url = `${BASE_URL}/${table}/`;
        
        const response = await fetch(url, {
            headers: { 'X-Admin-Token': ADMIN_TOKEN }
        });
        if (!response.ok) throw new Error(`Failed to fetch from ${table}`);
        const data = await response.json();
        
        let items = Array.isArray(data) ? data : (data.items || []);

        if (queries && queries.length > 0) {
            for (const query of queries) {
                if (typeof query === 'string') {
                    try {
                        const qObj = JSON.parse(query);
                        if (qObj.method === 'equal') {
                            const key = qObj.attribute;
                            const val = qObj.values[0];
                            const lowerKey = key.toLowerCase();
                            items = items.filter((item: any) => String(item[lowerKey] || item[key]) === String(val));
                        }
                    } catch (e) {
                        const match = query.match(/equal\("([^"]+)",\s*\["([^"]+)"\]\)/);
                        if (match) {
                            const key = match[1];
                            const val = match[2];
                            const lowerKey = key.toLowerCase();
                            items = items.filter((item: any) => String(item[lowerKey] || item[key]) === String(val));
                        }
                    }
                }
            }
        }
        
        return { 
            documents: items.map((item: any) => {
                const normalized = normalizeDoc(item);
                if (!normalized.$id) {
                    normalized.$id = normalized.id || normalized.ID || normalized.placeId || normalized.placeid;
                }
                return normalized;
            }), 
            total: items.length 
        };
    },
    getDocument: async (databaseId: string, collectionId: string, documentId: string) => {
        const table = mapCollectionToTable(collectionId);
        const ordsId = table === 'places' && documentId.startsWith('place_') ? documentId.replace('place_', '') : documentId;
        const url = `${BASE_URL}/${table}/${ordsId}`;

        const response = await fetch(url, {
            headers: { 'X-Admin-Token': ADMIN_TOKEN }
        });        if (!response.ok) {
            const err: any = new Error(`Failed to fetch document ${documentId}`);
            err.code = response.status;
            throw err;
        }
        const data = await response.json();
        const doc = Array.isArray(data.items) ? data.items[0] : data;
        return normalizeDoc(doc);
    },
    createDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
        const table = mapCollectionToTable(collectionId);
        const url = `${BASE_URL}/${table}/`;
        
        const payload = denormalizeDoc({ ...data });
        const finalId = documentId === 'unique()' ? Math.random().toString(36).substring(2, 15) : documentId;
        payload.id = finalId;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const err: any = new Error(`Failed to create document in ${table}`);
            err.code = response.status;
            throw err;
        }
        
        let createdDoc: any = {};
        try {
            createdDoc = await response.json();
            // Handle both array and object responses from ORDS
            if (Array.isArray(createdDoc.items)) createdDoc = createdDoc.items[0];
        } catch (e) {
            // If response body is empty or invalid, use the payload we sent as base
            createdDoc = { ...payload };
        }
        
        const normalized = normalizeDoc(createdDoc);
        if (!normalized.$id) normalized.$id = normalized.id || normalized.ID || finalId;
        return normalized;
    },
    updateDocument: async (databaseId: string, collectionId: string, documentId: string, data: any) => {
        const table = mapCollectionToTable(collectionId);
        const ordsId = table === 'places' && documentId.startsWith('place_') ? documentId.replace('place_', '') : documentId;
        const url = `${BASE_URL}/${table}/${ordsId}`;

        let mergedNormalized = { ...data };
        try {
            const getRes = await fetch(url, {
                headers: { 'X-Admin-Token': ADMIN_TOKEN }
            });
            if (getRes.ok) {
                const getData = await getRes.json();
                const rawDoc = Array.isArray(getData.items) ? getData.items[0] : getData;
                const existingNormalized = normalizeDoc(rawDoc);
                // Merge existing data with new data (new data takes priority)
                // Both are now normalized to camelCase with no duplicates
                mergedNormalized = { ...existingNormalized, ...data };
            }
        } catch (e) {
            console.error("Fetch existing doc failed during update:", e);
        }

        const finalPayload = denormalizeDoc(mergedNormalized);
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'X-Admin-Token': ADMIN_TOKEN
            },
            body: JSON.stringify(finalPayload)
        });
        if (!response.ok) {
            const err: any = new Error(`Failed to update document ${documentId}`);
            err.code = response.status;
            throw err;
        }
        
        let updatedDoc: any = {};
        try {
            updatedDoc = await response.json();
            if (Array.isArray(updatedDoc.items)) updatedDoc = updatedDoc.items[0];
        } catch (e) {
            updatedDoc = { ...mergedNormalized };
        }

        const normalized = normalizeDoc(updatedDoc);
        if (!normalized.$id) normalized.$id = normalized.id || normalized.ID || documentId;
        return normalized;
    },
    deleteDocument: async (databaseId: string, collectionId: string, documentId: string) => {
        const table = mapCollectionToTable(collectionId);
        const ordsId = table === 'places' && documentId.startsWith('place_') ? documentId.replace('place_', '') : documentId;
        const url = `${BASE_URL}/${table}/${ordsId}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'X-Admin-Token': ADMIN_TOKEN }
        });
        if (!response.ok) {
            const err: any = new Error(`Failed to delete document ${documentId}`);
            err.code = response.status;
            throw err;
        }
        return { success: true };
    }
};

export { client, account, databases, ID, Query };
