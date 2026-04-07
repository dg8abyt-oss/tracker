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
  const now = new Date();
  const isSaturday = now.getDay() === 6;

  // 1. TOTAL RSS (Modified to ensure the amount is the primary data)
  if (parsedUrl.pathname === '/total') {
    const { data: chores } = await supabase.from('chores').select('amount').eq('archived', false);
    const total = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    const formattedTotal = total.toFixed(2);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    // We put the raw number in the Title and Description to ensure the Shortcut finds it
    res.write(`<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Current Allowance</title>
          <item>
            <title>${formattedTotal}</title>
            <description>${formattedTotal}</description>
            <pubDate>${new Date().toUTCString()}</pubDate>
            <guid>${new Date().getTime()}</guid>
          </item>
        </channel>
      </rss>`);
    res.end();

    // Archive after sending the total if it's Saturday
    if (isSaturday && chores && chores.length > 0) {
      await supabase.from('chores').update({ archived: true }).eq('archived', false);
    }
    return;
  }

  // 2. STANDARD CHORE RSS
  if (parsedUrl.pathname === '/rss') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false }).limit(20);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    const items = chores ? chores.map(c => `<item><title>${c.chore}: $${c.amount}</title><pubDate>${new Date(c.created_at).toUTCString()}</pubDate><guid>${c.id}</guid></item>`).join('') : '';
    return res.end(`<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Chore Log</title>${items}</channel></rss>`);
  }

  // 3. STORAGE
  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', true).order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let rows = chores ? chores.map(c => `<tr><td>${c.chore}</td><td>$${parseFloat(c.amount).toFixed(2)}</td></tr>`).join('') : '';
    return res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h2>Archive Bin</h2><table border="1" style="width:100%">${rows || '<tr><td>Empty</td></tr>'}</table><br><a href="/">Back</a></body></html>`);
  }

  // 4. ADD
  if (parsedUrl.pathname === '/add') {
    const { chore, amount } = parsedUrl.query;
    if (chore && amount) await supabase.from('chores').insert([{ chore, amount: parseFloat(amount), archived: false }]);
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  // 5. HOME UI
  if (parsedUrl.pathname === '/') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', false).order('created_at', { ascending: false });
    const currentTotal = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:20px;background:#f3f4f6;text-align:center;}.card{background:white;padding:25px;border-radius:20px;max-width:400px;margin:auto;}input{width:100%;padding:10px;margin:5px 0;border:1px solid #ddd;border-radius:8px;}button{width:100%;padding:15px;background:#059669;color:white;border:none;border-radius:10px;font-weight:bold;margin-top:10px;}</style></head>
      <body>
        <div class="card">
          <h1>Chore Tracker</h1>
          <div style="margin:20px 0; padding:15px; background:#ecfdf5; border-radius:12px;">
            <div style="font-size:0.8rem; color:#059669;">Current Total</div>
            <div style="font-size:2rem; font-weight:bold;">$${currentTotal.toFixed(2)}</div>
          </div>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="Chore" required style="width:100%">
            <input type="number" name="amount" step="0.01" placeholder="Amount ($)" required style="width:100%">
            <button type="submit">Log It</button>
          </form>
          <div style="margin-top:20px; font-size:0.8rem;">
            <a href="/storage">History</a> | <a href="/total">Test RSS Total</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
