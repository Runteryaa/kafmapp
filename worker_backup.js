// Worker hafızasında IP'leri ve istek sayılarını tutacağımız yer (Sunucu bazlı çalışır)
const rateLimitMap = new Map();

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

    // --- RATE LIMITING (İSTEK SINIRLANDIRMA) ---
    const clientIP = request.headers.get("CF-Connecting-IP");
    
    if (clientIP) {
      const now = Date.now();
      const ipData = rateLimitMap.get(clientIP) || { count: 0, firstRequestTime: now };

      // Eğer ilk isteğin üzerinden 10 saniye (10000 ms) geçtiyse sayacı sıfırla
      if (now - ipData.firstRequestTime > 10000) {
        ipData.count = 1;
        ipData.firstRequestTime = now;
      } else {
        ipData.count++;
      }

      rateLimitMap.set(clientIP, ipData);

      // 10 saniye içinde 5'ten fazla istek atıldıysa engelle
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
    // -------------------------------------------

    // SECURITY: Token check for every request
    const providedToken = request.headers.get('X-Admin-Token');
    if (providedToken !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Access Denied: Invalid security token." }), { 
        status: 401, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const url = new URL(request.url);

    // --- UTILITY FUNCTIONS ---
    // Fix 2: Password Hashing (Web Crypto API SHA-256)
    const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Fix 3: Input Validation
    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // 1. LOGIN API
    if (url.pathname === '/v1/api/login' && request.method === 'POST') {
      try {
        // Fix 4: Secure JSON Parsing
        let body;
        try {
          body = await request.json();
        } catch (err) {
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const { email, password } = body;

        // Fix 3: Input Validation Check
        if (!email || !isValidEmail(email) || !password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Invalid email or password format" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        // Hash the incoming password for comparison
        const hashedPassword = await hashPassword(password);
        const ordsRes = await fetch(`${ORACLE_HOST}/users/?q={"email":"${email}"}`);
        const data = await ordsRes.json();
        
        // Compare with hashedPassword
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

    // 2. REGISTER API
    if (url.pathname === '/v1/api/register' && request.method === 'POST') {
      try {
        // Fix 4: Secure JSON Parsing
        let body;
        try {
          body = await request.json();
        } catch (err) {
          return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const { id, email, password, name, createdat } = body;

        // Fix 3: Input Validation Check
        if (!email || !isValidEmail(email) || !password || password.length < 6) {
          return new Response(JSON.stringify({ error: "Invalid email or password format. Password must be at least 6 characters." }), { 
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        // Check if user already exists
        const checkRes = await fetch(`${ORACLE_HOST}/users/?q={"email":"${email}"}`);
        const checkData = await checkRes.json();
        const existingUser = (checkData.items || []).find(u => u.email === email);

        if (existingUser) {
          return new Response(JSON.stringify({ error: "Email already exists" }), { 
            status: 409, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        // Fix 2: Hash Password before saving
        const hashedPassword = await hashPassword(password);

        const insertRes = await fetch(`${ORACLE_HOST}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            email: email,
            password: hashedPassword,
            name: name,
            createdat: createdat
          })
        });

        if (!insertRes.ok) return new Response(JSON.stringify({ error: "Registration failed" }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });

        // Fix 1: Do not leak password in response
        return new Response(JSON.stringify({ 
          id: id, 
          email: email, 
          name: name,
          createdat: createdat,
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

    // 3. GENERAL PROXY
    let proxyPath = url.pathname;
    if (proxyPath.startsWith('/v1/')) {
      proxyPath = proxyPath.substring(3);
    }
    const targetUrl = ORACLE_HOST + proxyPath + url.search;
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