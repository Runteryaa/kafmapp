export default {
  async fetch(request, env) {
    const ORACLE_HOST = "https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin";
    
    // MUST match the value in Cloudflare Pages Environment Variables
    const ADMIN_TOKEN = env.ADMIN_TOKEN; 

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // SECURITY: Token check for every request (Our proxy sends this automatically)
    const providedToken = request.headers.get('X-Admin-Token');
    if (providedToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Access Denied: Invalid security token." }), { 
        status: 401, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const url = new URL(request.url);

    // 1. LOGIN API - Includes Role and Ban status for frontend compatibility
    if (url.pathname === '/api/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        const ordsRes = await fetch(`${ORACLE_HOST}/users/?q={"email":"${email}"}`);
        const data = await ordsRes.json();
        const user = (data.items || []).find(u => u.email === email && u.password === password);

        if (user) {
          // Send all necessary fields (role, isbanned) so frontend session is valid
          return new Response(JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            isbanned: user.isbanned || 'false',
            createdat: user.createdat
          }), { 
            status: 200, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }
        return new Response(JSON.stringify({ error: "Invalid email or password" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Server Error" }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 2. REGISTER API
    if (url.pathname === '/api/register' && request.method === 'POST') {
      try {
        const body = await request.json();
        const insertRes = await fetch(`${ORACLE_HOST}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: body.id,
            email: body.email,
            password: body.password,
            name: body.name,
            createdat: body.createdat
          })
        });

        if (!insertRes.ok) return new Response(JSON.stringify({ error: "Registration failed" }), { 
          status: 500, 
          headers: corsHeaders 
        });

        return new Response(JSON.stringify({ ...body, role: 'user', isbanned: 'false' }), { 
          status: 201, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Server Error" }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // 3. GENERAL PROXY
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