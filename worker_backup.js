const rateLimitMap = new Map();

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

    // Detect client IP. We prefer X-Forwarded-For passed by our proxy.
    // CF-Connecting-IP might be our proxy's server IP, so we avoid using it as a fallback
    // for rate limiting to prevent blocking the entire server.
    const clientIP = request.headers.get("x-forwarded-for");
    const providedToken = request.headers.get('X-Admin-Token');
    const isAdminRole = request.headers.get('X-Admin-Role') === 'true';

    // Bypass rate limit for verified admins
    const isBypassLimit = providedToken === ADMIN_TOKEN && isAdminRole;

    // We only apply rate limiting if we have a valid client IP. 
    // If no IP is detected, we skip to avoid blocking the proxy server.
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
      return new Response(JSON.stringify({ error: "Access Denied: Invalid security token." }), { 
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

        const hashedPassword = await hashPassword(password);
        const filter = JSON.stringify({ email });
        const ordsRes = await fetch(`${ORACLE_HOST}/users/?q=${encodeURIComponent(filter)}`);
        const data = await ordsRes.json();
        
        const user = (data.items || []).find(u => u.email === email && u.password === hashedPassword);

        if (user) {
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

        if (!insertRes.ok) return new Response(JSON.stringify({ error: "Registration failed" }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });

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
  },
};