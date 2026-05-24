import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const token = process.env.ADMIN_TOKEN;
    return NextResponse.json({ 
        envTokenExists: !!token,
        tokenLength: token ? token.length : 0,
        // Shows first 2 chars for verification without leaking full secret
        tokenPrefix: token ? token.substring(0, 2) + '***' : 'none',
        nodeEnv: process.env.NODE_ENV
    });
}
