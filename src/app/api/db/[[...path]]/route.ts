import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const WORKER_URL = "https://kafmapdb.runte.workers.dev";
// Use ADMIN_TOKEN (Private) for server-side proxy
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function GET(req: NextRequest, segmentData: { params: Promise<{ path?: string[] }> }) {
    return handleProxy(req, segmentData);
}

export async function POST(req: NextRequest, segmentData: { params: Promise<{ path?: string[] }> }) {
    return handleProxy(req, segmentData);
}

export async function PUT(req: NextRequest, segmentData: { params: Promise<{ path?: string[] }> }) {
    return handleProxy(req, segmentData);
}

export async function DELETE(req: NextRequest, segmentData: { params: Promise<{ path?: string[] }> }) {
    return handleProxy(req, segmentData);
}

async function handleProxy(req: NextRequest, segmentData: { params: Promise<{ path?: string[] }> }) {
    const params = await segmentData.params;
    const pathArray = params.path || [];
    let path = pathArray.join('/');
    
    // Crucial: Oracle ORDS requires trailing slashes for collection endpoints (e.g. /reviews/)
    // but returns 404 if a trailing slash is added to an item endpoint (e.g. /reviews/123/)
    // pathArray length 2 means collection (e.g. ['v1', 'reviews'])
    // pathArray length 3 means item (e.g. ['v1', 'reviews', '123'])
    if (pathArray.length === 2 && !path.endsWith('/')) {
        path += '/';
    } else if (req.nextUrl.pathname.endsWith('/') && path && !path.endsWith('/') && pathArray.length !== 3) {
        path += '/';
    }

    const url = new URL(`${WORKER_URL}/${path}`);
    req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

    // Get current user from cookie for internal auth checks
    const authCookie = req.cookies.get('kafmap_auth')?.value;
    let currentUser: any = null;
    if (authCookie) {
        try { currentUser = JSON.parse(decodeURIComponent(authCookie)); } catch (e) {}
    }

    // --- REFINED SECURITY CHECK ---
    // Handle versioning prefix (e.g., v1/) for internal checks
    let checkPath = path;
    if (checkPath.startsWith('v1/')) {
        checkPath = checkPath.substring(3);
    }

    const isUserRelated = checkPath === 'users' || checkPath.startsWith('users/');

    if (isUserRelated) {
        const isListRequest = checkPath === 'users' || checkPath === 'users/';
        const isAdmin = currentUser && currentUser.role === 'admin';

        if (isListRequest) {
            // Global list (GET or POST): Admin only. (POST /users/ is for registration but that goes through Worker /api/register)
            if (!isAdmin && req.method !== 'POST') return NextResponse.json({ error: 'Forbidden: Admin access required for user list' }, { status: 403 });
        } else {
            // Individual lookup/modify (/users/ID): Allow if Admin OR self
            const pathParts = checkPath.split('/');
            const requestedId = pathParts[1];
            const isSelf = currentUser && (currentUser.$id === requestedId || currentUser.id === requestedId);
            
            if (!isAdmin && !isSelf) {
                return NextResponse.json({ error: 'Forbidden: You can only access or modify your own session' }, { status: 403 });
            }
        }
    }

    const headers = new Headers();
    ['content-type', 'accept', 'accept-language'].forEach(h => {
        const val = req.headers.get(h);
        if (val) headers.set(h, val);
    });

    if (ADMIN_TOKEN) {
        headers.set('X-Admin-Token', ADMIN_TOKEN);
    }

    try {
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: headers,
            redirect: 'follow'
        };

        // Only read body for methods that typically have one and if content-length > 0
        const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);
        if (hasBody) {
            fetchOptions.body = await req.arrayBuffer();
        }

        const proxyRes = await fetch(url.toString(), fetchOptions);
        const data = await proxyRes.text();
        
        return new Response(data, {
            status: proxyRes.status,
            headers: {
                'Content-Type': proxyRes.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: 'Internal Proxy Error' }, { status: 500 });
    }
}
