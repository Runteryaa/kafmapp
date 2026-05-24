export default {
  async fetch(request, env) {
    const ORACLE_HOST = "https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin";
    const ADMIN_TOKEN = "ananisikeyim"; // MUST match the value in src/lib/appwrite.ts

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // SECURITY CHECK: Only allow access to user data with valid Token
    if (url.pathname.startsWith('/users') || url.pathname.startsWith('/user_accounts')) {
      const providedToken = request.headers.get('X-Admin-Token');
      if (providedToken !== ADMIN_TOKEN) {
        return new Response(JSON.stringify({ error: "Yetkisiz Erişim! Geçersiz Token." }), { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }

    // 1. LOGIN API
    if (url.pathname === '/api/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        const ordsUrl = `${ORACLE_HOST}/users/?q={"email":"${email}"}`;
        const ordsRes = await fetch(ordsUrl);
        const data = await ordsRes.json();
        const user = (data.items || []).find(u => u.email === email && u.password === password);

        if (user) {
          return new Response(JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            isbanned: user.isbanned || 'false',
            createdat: user.createdat
          }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        return new Response(JSON.stringify({ error: "E-posta veya şifre hatalı!" }), { status: 401, headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Sunucu hatası" }), { status: 500, headers: corsHeaders });
      }
    }

    // 2. REGISTER API
    if (url.pathname === '/api/register' && request.method === 'POST') {
      try {
        const { email, password, name, id, createdat } = await request.json();
        
        const insertRes = await fetch(`${ORACLE_HOST}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, email, password, name, createdat })
        });

        if (!insertRes.ok) {
           return new Response(JSON.stringify({ error: "Kayıt sırasında hata oluştu." }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ id, email, name, role: 'user', isbanned: 'false' }), {
          status: 201,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Sunucu hatası" }), { status: 500, headers: corsHeaders });
      }
    }

    // 3. GENERAL PROXY (Places, Reviews, Favorites, etc.)
    const targetUrl = ORACLE_HOST + url.pathname + url.search;
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    const response = await fetch(newRequest);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  },
};