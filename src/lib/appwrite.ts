import { Client, Account } from "appwrite";

const client = new Client()
    .setEndpoint("https://fra.cloud.appwrite.io/v1")
    .setProject("kafmap");

const account = new Account(client);

// Mock Query class to replicate Appwrite's Query.equal
class Query {
    static equal(attribute: string, value: any) {
        return { type: 'equal', attribute, value };
    }
}

// Mock ID class to replicate Appwrite's ID.unique
class ID {
    static unique() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

const PLACES_URL = "https://kafmapdb.runte.workers.dev/places/";
const PENDING_UPDATES_URL = "https://kafmapdb.runte.workers.dev/pending_places/";

// Mock Databases class to replace Appwrite's database and use REST DB
class MockDatabases {
    constructor(_client: any) {}

    async listDocuments(databaseId: string, collectionId: string, queries: any[] = []) {
        const baseUrl = collectionId === 'places' ? PLACES_URL : PENDING_UPDATES_URL;
        let url = baseUrl;

        if (queries && queries.length > 0) {
            const queryObj: any = {};
            queries.forEach(q => {
                if (q.type === 'equal') {
                    const key = q.attribute.toLowerCase(); // e.g. placeId -> placeid
                    const value = (collectionId === 'places' && key === 'placeid') ? Number(q.value) : q.value;
                    queryObj[key] = value;
                }
            });
            url += `?q=${encodeURIComponent(JSON.stringify(queryObj))}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!data.items) {
             return { documents: [], total: 0 } as any;
        }

        const documents = data.items.map((item: any) => {
            const selfLink = item.links?.find((l: any) => l.rel === 'self')?.href;
            const rowId = selfLink ? selfLink.split('/').pop() : item.placeid;

            const mappedItem = { ...item, $id: rowId };

            // Map common properties back to camelCase for the frontend
            if ('placeid' in item) mappedItem.placeId = item.placeid;
            if ('placename' in item) mappedItem.placeName = item.placename;
            if ('toiletpass' in item) mappedItem.toiletPass = item.toiletpass;
            if ('wifipass' in item) mappedItem.wifiPass = item.wifipass;
            if ('menuurl' in item) mappedItem.menuUrl = item.menuurl;
            if ('wcupdatedat' in item) mappedItem.wcUpdatedAt = item.wcupdatedat;
            if ('wcupvotes' in item) mappedItem.wcUpvotes = item.wcupvotes;
            if ('wifiupdatedat' in item) mappedItem.wifiUpdatedAt = item.wifiupdatedat;
            if ('wifiupvotes' in item) mappedItem.wifiUpvotes = item.wifiupvotes;
            if ('menuupdatedat' in item) mappedItem.menuUpdatedAt = item.menuupdatedat;
            if ('menuupvotes' in item) mappedItem.menuUpvotes = item.menuupvotes;
            if ('isregistered' in item) {
                if (item.isregistered === "true") mappedItem.isRegistered = true;
                else if (item.isregistered === "false") mappedItem.isRegistered = false;
                else mappedItem.isRegistered = item.isregistered;
            }

            return mappedItem;
        });

        return { documents, total: data.count || documents.length } as any;
    }

    async getDocument(databaseId: string, collectionId: string, documentId: string) {
        const baseUrl = collectionId === 'places' ? PLACES_URL : PENDING_UPDATES_URL;

        let url = baseUrl;

        // Let's assume documentId might be ROWID or placeId.
        if (documentId.startsWith('AA')) {
            url += documentId;
        } else {
            const queryObj = collectionId === 'places' ? { placeid: Number(documentId) } : { placeid: documentId };
            url += `?q=${encodeURIComponent(JSON.stringify(queryObj))}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        let item = null;
        if (data.items && data.items.length > 0) {
            item = data.items[0];
        } else if (data.placeid || data.links) { // Direct response for ROWID usually returns object, not items array
            item = data;
        }

        if (item) {
            const selfLink = item.links?.find((l: any) => l.rel === 'self')?.href;
            const rowId = selfLink ? selfLink.split('/').pop() : item.placeid;
            const mappedItem = { ...item, $id: rowId };

            if ('placeid' in item) mappedItem.placeId = item.placeid;
            if ('placename' in item) mappedItem.placeName = item.placename;
            if ('toiletpass' in item) mappedItem.toiletPass = item.toiletpass;
            if ('wifipass' in item) mappedItem.wifiPass = item.wifipass;
            if ('menuurl' in item) mappedItem.menuUrl = item.menuurl;
            if ('wcupdatedat' in item) mappedItem.wcUpdatedAt = item.wcupdatedat;
            if ('wcupvotes' in item) mappedItem.wcUpvotes = item.wcupvotes;
            if ('wifiupdatedat' in item) mappedItem.wifiUpdatedAt = item.wifiupdatedat;
            if ('wifiupvotes' in item) mappedItem.wifiUpvotes = item.wifiupvotes;
            if ('menuupdatedat' in item) mappedItem.menuUpdatedAt = item.menuupdatedat;
            if ('menuupvotes' in item) mappedItem.menuUpvotes = item.menuupvotes;
            if ('isregistered' in item) {
                if (item.isregistered === "true") mappedItem.isRegistered = true;
                else if (item.isregistered === "false") mappedItem.isRegistered = false;
                else mappedItem.isRegistered = item.isregistered;
            }

            return mappedItem;
        }

        const err: any = new Error("Document with the requested ID could not be found.");
        err.code = 404;
        throw err;
    }

    async createDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
        const baseUrl = collectionId === 'places' ? PLACES_URL : PENDING_UPDATES_URL;

        const payload: any = {};
        for (const key in data) {
            payload[key.toLowerCase()] = data[key];
        }

        if (data.placeId) payload.placeid = collectionId === 'places' ? Number(data.placeId) : String(data.placeId);
        if (collectionId === 'places' && !payload.placeid && !isNaN(Number(documentId)) && documentId !== 'unique()') {
            payload.placeid = Number(documentId);
        }

        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Failed to create document: ${res.statusText}`);
        }

        const resData = await res.json();
        const selfLink = resData.links?.find((l: any) => l.rel === 'self')?.href;
        const rowId = selfLink ? selfLink.split('/').pop() : resData.placeid;

        return { ...resData, $id: rowId };
    }

    async updateDocument(databaseId: string, collectionId: string, documentId: string, data: any) {
        const baseUrl = collectionId === 'places' ? PLACES_URL : PENDING_UPDATES_URL;

        let rowId = documentId;
        if (!documentId.startsWith('AA')) {
            const queryObj = collectionId === 'places' ? { placeid: Number(documentId) } : { placeid: documentId };
            const getRes = await fetch(`${baseUrl}?q=${encodeURIComponent(JSON.stringify(queryObj))}`);
            const getData = await getRes.json();
            if (getData.items && getData.items.length > 0) {
                rowId = getData.items[0].links?.find((l: any) => l.rel === 'self')?.href.split('/').pop();
            } else {
                const err: any = new Error("Not Found");
                err.code = 404;
                throw err;
            }
        }

        const payload: any = {};
        for (const key in data) {
            payload[key.toLowerCase()] = data[key];
        }

        const res = await fetch(`${baseUrl}${rowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Failed to update document: ${res.statusText}`);
        }

        const resData = await res.json();
        return { ...resData, $id: rowId };
    }

    async deleteDocument(databaseId: string, collectionId: string, documentId: string) {
        const baseUrl = collectionId === 'places' ? PLACES_URL : PENDING_UPDATES_URL;

        let rowId = documentId;
        if (!documentId.startsWith('AA')) {
            const queryObj = collectionId === 'places' ? { placeid: Number(documentId) } : { placeid: documentId };
            const getRes = await fetch(`${baseUrl}?q=${encodeURIComponent(JSON.stringify(queryObj))}`);
            const getData = await getRes.json();
            if (getData.items && getData.items.length > 0) {
                rowId = getData.items[0].links?.find((l: any) => l.rel === 'self')?.href.split('/').pop();
            } else {
                return; // already gone or not found
            }
        }

        const res = await fetch(`${baseUrl}${rowId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            throw new Error(`Failed to delete document: ${res.statusText}`);
        }
        return true;
    }
}

const databases = new MockDatabases(client);

export { client, account, databases, ID, Query };
