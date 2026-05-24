import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const WORKER_URL = "https://kafmapdb.runte.workers.dev";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function handleProxy(req: NextRequest, { params }: { params: any }) {
    const pathArray = await params.path || [];
    const path = pathArray.join('/');
    const url = new URL(`${WORKER_URL}/${path}`);
    
    // Copy search params (queries like ?q=...)
    req.nextUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
    });

    // Check if the endpoint is sensitive (users management)
    const isSensitive = path.startsWith('users') || path.startsWith('user_accounts');

    if (isSensitive) {
        // --- SERVER-SIDE AUTH CHECK ---
        // Verify user from cookie without trusting the client
        const authCookie = req.cookies.get('kafmap_auth')?.value;
        if (!authCookie) {
            return NextResponse.json({ error: 'Unauthorized: No session found' }, { status: 401 });
        }

        try {
            const user = JSON.parse(decodeURIComponent(authCookie));
            // Only allow admins to access these endpoints via proxy
            if (user.role !== 'admin') {
                return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
            }
        } catch (e) {
            return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
        }
    }

    // Forward the request to the worker with the hidden ADMIN_TOKEN
    const headers = new Headers(req.headers);
    headers.set('X-Admin-Token', ADMIN_TOKEN || '');
    
    // Remove host header to avoid SSL/Routing issues
    headers.delete('host');

    try {
        const proxyRes = await fetch(url.toString(), {
            method: req.method,
            headers: headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined,
            redirect: 'follow'
        });

        const data = await proxyRes.text();
        
        return new Response(data, {
            status: proxyRes.status,
            headers: {
                'Content-Type': proxyRes.headers.get('Content-Type') || 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json({ error: 'Database Proxy Error', details: error.message }, { status: 500 });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
