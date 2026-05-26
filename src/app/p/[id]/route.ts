import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    context: any
) {
    const params = await context.params;
    const id = params.id;
    
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('p', id);
    
    return NextResponse.redirect(url);
}