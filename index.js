require('dotenv').config();
const http = require('http');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // 1. RSS FEED (Optimized for Apple Shortcuts & Readers)
  if (parsedUrl.pathname === '/rss') {
    const { data: chores, error } = await supabase
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      res.statusCode = 500;
      return res.end('RSS Error');
    }

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    const items = chores.map(c => `
      <item>
        <title>${c.chore}: $${c.amount}</title>
        <link>https://${req.headers.host}/storage</link>
        <description>Logged ${c.chore} for $${c.amount}</description>
        <pubDate>${new Date(c.created_at).toUTCString()}</pubDate>
        <guid isPermaLink="false">${c.id}</guid>
      </item>`).join('');

    return res.end(`<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Chore Log</title>
          <link>https://${req.headers.host}</link>
          <description>Recent chore activity</description>
          ${items}
        </channel>
      </rss>`);
  }

  // 2. STORAGE (View full history)
  if (parsedUrl.pathname === '/storage') {
    const { data: chores, error } = await supabase
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false });

    res.setHeader('Content-Type', 'text/html');
    let rows = chores ? chores.map(c => `<tr><td>${new Date(c.created_at).toLocaleDateString()}</td><td>${c.chore}</td><td>$${c.amount}</td></tr>`).join('') : '<tr><td colspan="3">No data</td></tr>';
    
    return res.end(`
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:20px;} table{width:100%; border-collapse:collapse;} th,td{padding:10px; border-bottom:1px solid #ddd; text-align:left;}</style></head>
      <body><h2>Log History</h2><table><tr><th>Date</th><th>Chore</th><th>Amount</th></tr>${rows}</table><br><a href="/">Back</a></body>
      </html>`);
  }

  // 3. ADD ENDPOINT (UI + JSON support)
  if (parsedUrl.pathname === '/add') {
    const { chore, amount, type } = parsedUrl.query;
    if (!chore || !amount) { res.statusCode = 400; return res.end('Missing data'); }
    
    const { error } = await supabase.from('chores').insert([{ chore, amount: parseFloat(amount) }]);
    if (error) { res.statusCode = 500; return res.end('DB Error'); }

    if (type === 'json') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true }));
    }
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  // 4. MAIN UI
  if (parsedUrl.pathname === '/') {
    const isSuccess = parsedUrl.query.success === 'true';
    res.setHeader('Content-Type', 'text/html');
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; padding: 20px; background: #f0f2f5; text-align: center;}
          .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
          input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; font-size: 16px; }
          button { width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; }
          .msg { color: #059669; font-weight: bold; display: ${isSuccess ? 'block' : 'none'}; }
          .links { margin-top: 20px; display: flex; justify-content: space-around; font-size: 0.8rem; }
          a { color: #3b82f6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>💸 Tracker</h1>
          <p class="msg">Success! Logged to DB.</p>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="Chore" required>
            <input type="number" name="amount" step="0.01" placeholder="$ Amount" required>
            <button type="submit">Log Entry</button>
          </form>
          <div class="links">
            <a href="/storage">View History 📜</a>
            <a href="/rss" style="color:#ea580c">RSS Feed 📡</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
