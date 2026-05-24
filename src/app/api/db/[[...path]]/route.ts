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
    
    // Crucial: Restore trailing slash if the original request had one
    // Oracle ORDS is very sensitive to trailing slashes
    if (req.nextUrl.pathname.endsWith('/') && path && !path.endsWith('/')) {
        path += '/';
    }

    const url = new URL(`${WORKER_URL}/${path}`);
    
    // Copy all search params
    req.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
    });

    // --- REFINED SECURITY CHECK ---
    // Only block the GLOBAL LIST fetch for non-admins. 
    // Individual lookups (/users/ID) are allowed for session verification.
    const isUserList = path === 'users' || path === 'users/' || path === 'user_accounts' || path === 'user_accounts/';

    if (isUserList) {
        const authCookie = req.cookies.get('kafmap_auth')?.value;
        if (!authCookie) {
            return NextResponse.json({ error: 'Unauthorized: No session' }, { status: 401 });
        }

        try {
            const user = JSON.parse(decodeURIComponent(authCookie));
            if (user.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden: Admin access required for user list' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
        }
    }

    // Prepare headers for the Worker
    const headers = new Headers();
    // Copy essential headers from original request
    const headersToCopy = ['content-type', 'accept', 'accept-language'];
    headersToCopy.forEach(h => {
        const val = req.headers.get(h);
        if (val) headers.set(h, val);
    });

    // SECURELY inject the token on the server
    if (ADMIN_TOKEN) {
        headers.set('X-Admin-Token', ADMIN_TOKEN);
    } else {
        console.error("PROXY ERROR: ADMIN_TOKEN environment variable is missing!");
    }

    try {
        const fetchOptions: RequestInit = {
            method: req.method,
            headers: headers,
            redirect: 'follow'
        };

        // Forward body for non-GET requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            fetchOptions.body = await req.arrayBuffer();
        }

        const proxyRes = await fetch(url.toString(), fetchOptions);
        const data = await proxyRes.text();
        
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', proxyRes.headers.get('Content-Type') || 'application/json');
        // Add CORS for flexibility, though same-origin is preferred
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(data, {
            status: proxyRes.status,
            headers: responseHeaders
        });
    } catch (error: any) {
        console.error("Proxy failure:", error);
        return NextResponse.json({ 
            error: 'Database connection failed', 
            details: error.message 
        }, { status: 500 });
    }
}
