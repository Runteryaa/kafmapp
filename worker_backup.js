const rateLimitMap = new Map();
const failedLoginMap = new Map();

export default {
  async fetch(request, env, ctx) {
    const ORACLE_HOST = "https://gb0abb62e885e33-e57vm4usgodt141x.adb.eu-frankfurt-1.oraclecloudapps.com/ords/admin";
    const ADMIN_TOKEN = env.ADMIN_TOKEN; 

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Token, X-Admin-Role",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const clientIP = request.headers.get("x-forwarded-for");
    const providedToken = request.headers.get('X-Admin-Token');
    const isAdminRole = request.headers.get('X-Admin-Role') === 'true';

    const isBypassLimit = providedToken === ADMIN_TOKEN && isAdminRole;

    if (clientIP && !isBypassLimit) {
      const now = Date.now();
      const ipData = rateLimitMap.get(clientIP) || { count: 0, firstRequestTime: now };

      if (now - ipData.firstRequestTime > 10000) {
        ipData.count = 1;
        ipData.firstRequestTime = now;
      } else {
        ipData.count++;
      }

      rateLimitMap.set(clientIP, ipData);

      if (ipData.count > 5) {
        return new Response(JSON.stringify({ 
          error: "Too many requests. Please try again later." 
        }), { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "10", 
            ...corsHeaders 
          } 
        });
      }
    }

    if (providedToken !== ADMIN_TOKEN) {
      console.error(`Yetkisiz Erişim Denemesi. IP: ${clientIP || 'Bilinmiyor'}, Token: ${providedToken}`);
      return new Response(JSON.stringify({ error: "Access Denied: Invalid security token!" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const url = new URL(request.url);

    const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    if (url.pathname === '/v1/api/login' && request.method === 'POST') {
      try {
        let body;
        try {
          body = await request.json();
        } catch (err) {
          console.error("Login API - JSON Parse Hatası:", err.message);
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const { email, password } = body;

        if (!email || !isValidEmail(email) || !password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Invalid email or password format" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const now = Date.now();
        const lockoutDuration = 10 * 60 * 1000;
        let loginAttempts = failedLoginMap.get(email) || { count: 0, firstFailTime: now };

        if (loginAttempts.count >= 5) {
          if (now - loginAttempts.firstFailTime < lockoutDuration) {
            console.warn(`Kilitli hesaba giriş denemesi engellendi: ${email}`);
            return new Response(JSON.stringify({ 
              error: "Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin." 
            }), { 
              status: 429, 
              headers: { "Content-Type": "application/json", "Retry-After": "900", ...corsHeaders } 
            });
          } else {
            loginAttempts = { count: 0, firstFailTime: now };
          }
        }
        // -------------------------------------------

        const hashedPassword = await hashPassword(password);
        const filter = JSON.stringify({ email });
        const ordsRes = await fetch(`${ORACLE_HOST}/users/?q=${encodeURIComponent(filter)}`);
        const data = await ordsRes.json();
        
        const user = (data.items || []).find(u => u.email === email && u.password === hashedPassword);

        if (user) {
          failedLoginMap.delete(email);

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

        if (loginAttempts.count === 0) {
          loginAttempts.firstFailTime = now;
        }
        loginAttempts.count++;
        failedLoginMap.set(email, loginAttempts);
        console.warn(`Hatalı şifre denemesi (${loginAttempts.count}/5): ${email}`);

        return new Response(JSON.stringify({ error: "Invalid email or password" }), { 
          status: 401, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });

      } catch (e) {
        console.error("Login API - Beklenmeyen Sunucu Hatası:", e.message, e.stack);
        return new Response(JSON.stringify({ error: "Server Error" }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }

    if (url.pathname === '/v1/api/register' && request.method === 'POST') {
      try {
        let body;
        try {
          body = await request.json();
        } catch (err) {
          console.error("Register API - JSON Parse Hatası:", err.message);
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const { email, password, name, createdat } = body;

        if (!email || !isValidEmail(email) || !password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Invalid email or password format. Password must be at least 6 characters." }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const filter = JSON.stringify({ email });
        const checkRes = await fetch(`${ORACLE_HOST}/users/?q=${encodeURIComponent(filter)}`);
        const checkData = await checkRes.json();
        const existingUser = (checkData.items || []).find(u => u.email === email);

        if (existingUser) {
          return new Response(JSON.stringify({ error: "Email already exists" }), { 
            status: 409, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const hashedPassword = await hashPassword(password);
        const secureId = crypto.randomUUID();

        const insertRes = await fetch(`${ORACLE_HOST}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: secureId,
            email: email,
            password: hashedPassword,
            name: name || '',
            createdat: createdat || new Date().toISOString()
          })
        });

        if (!insertRes.ok) {
          console.error("Register API - Oracle DB Kayıt Başarısız. Status:", insertRes.status);
          return new Response(JSON.stringify({ error: "Registration failed" }), { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        return new Response(JSON.stringify({ 
          id: secureId, 
          email: email, 
          name: name || '',
          createdat: createdat || new Date().toISOString(),
          role: 'user', 
          isbanned: 'false' 
        }), { 
          status: 201, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      } catch (e) {
        console.error("Register API - Beklenmeyen Sunucu Hatası:", e.message, e.stack);
        return new Response(JSON.stringify({ error: "Server Error" }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }

    let proxyPath = url.pathname;
    if (proxyPath.startsWith('/v1/')) {
      proxyPath = proxyPath.substring(3);
    }
    const targetUrl = ORACLE_HOST + proxyPath + url.search;
    
    const cache = caches.default;
    const cacheKey = new Request(targetUrl, request);

    const isCacheable = request.method === 'GET' && proxyPath.includes('/places');

    if (isCacheable) {
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        let response = new Response(cachedResponse.body, cachedResponse);
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("X-Cache", "HIT");
        return response;
      }
    }

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    try {
      const response = await fetch(newRequest);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      let finalResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

      if (isCacheable && finalResponse.status === 200) {
        finalResponse.headers.set("X-Cache", "MISS");
        finalResponse.headers.set("Cache-Control", "public, max-age=300");
        ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
      } else {
        finalResponse.headers.set("X-Cache", "BYPASS");
        finalResponse.headers.set("Cache-Control", "no-cache");
      }

      return finalResponse;

    } catch (proxyError) {
      console.error(`Proxy Hatası (${targetUrl}):`, proxyError.message, proxyError.stack);
      return new Response(JSON.stringify({ error: "Veritabanı sunucusuna bağlanılamadı." }), {
        status: 502, 
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  },
};