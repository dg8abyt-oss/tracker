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

  // 1. TOTAL RSS (For Apple Shortcuts)
  if (parsedUrl.pathname === '/total') {
    const { data: chores } = await supabase.from('chores').select('amount').eq('archived', false);
    const total = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    const formattedTotal = total.toFixed(2);

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
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

    if (isSaturday && chores && chores.length > 0) {
      await supabase.from('chores').update({ archived: true }).eq('archived', false);
    }
    return;
  }

  // 2. LIST ENDPOINT (Full current week list)
  if (parsedUrl.pathname === '/list') {
    const { data: chores } = await supabase
      .from('chores')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const total = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    let rows = chores && chores.length > 0 
      ? chores.map(c => `<tr><td>${c.chore}</td><td style="text-align:right">$${parseFloat(c.amount).toFixed(2)}</td></tr>`).join('') 
      : '<tr><td colspan="2" style="text-align:center">No chores yet this week</td></tr>';

    return res.end(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{font-family:-apple-system,sans-serif;padding:20px;background:#f9fafb;color:#111827;}
          .card{background:white;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:500px;margin:auto;}
          table{width:100%; border-collapse:collapse; margin-top:15px;}
          td{padding:10px 0; border-bottom:1px solid #f3f4f6;}
          .header{display:flex; justify-content:space-between; border-bottom:2px solid #eee; padding-bottom:10px;}
          .total{color:#10b981; font-weight:bold;}
          .back{display:block; text-align:center; margin-top:20px; color:#2563eb; text-decoration:none; font-weight:bold;}
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <span>This Week's List</span>
            <span class="total">$${total.toFixed(2)}</span>
          </div>
          <table>${rows}</table>
        </div>
        <a href="/" class="back">← Back to Tracker</a>
      </body>
      </html>`);
  }

  // 3. STORAGE (Archive Bin)
  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', true).order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let rows = chores ? chores.map(c => `<tr><td>${c.chore}</td><td>$${parseFloat(c.amount).toFixed(2)}</td></tr>`).join('') : '';
    return res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;padding:20px;"><h2>Archive Bin</h2><table border="1" style="width:100%">${rows || '<tr><td>Empty</td></tr>'}</table><br><a href="/">Back</a></body></html>`);
  }

  // 4. ADD LOGIC
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
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>body{font-family:-apple-system,sans-serif;padding:20px;background:#f3f4f6;text-align:center;}.card{background:white;padding:25px;border-radius:20px;box-shadow:0 4px 10px rgba(0,0,0,0.05);max-width:400px;margin:auto;}input{width:100%;padding:12px;margin:5px 0;border:1px solid #ddd;border-radius:10px;box-sizing:border-box;font-size:16px;}button{width:100%;padding:15px;background:#059669;color:white;border:none;border-radius:10px;font-weight:bold;margin-top:10px;font-size:16px;cursor:pointer;}.balance{margin:20px 0;padding:15px;background:#ecfdf5;border-radius:12px;text-decoration:none;display:block;color:#059669;}.links{margin-top:20px;display:flex;justify-content:space-around;font-size:0.85rem;}</style></head>
      <body>
        <div class="card">
          <h1>Chore Tracker</h1>
          <a href="/list" class="balance">
            <div style="font-size:0.8rem;">Current Week Total</div>
            <div style="font-size:2rem; font-weight:bold;">$${currentTotal.toFixed(2)}</div>
            <div style="font-size:0.7rem; margin-top:5px;">Tap to view full list 📋</div>
          </a>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="Chore name" required autofocus>
            <input type="number" name="amount" step="0.01" placeholder="Amount ($)" required>
            <button type="submit">Log Chore</button>
          </form>
          <div class="links">
            <a href="/storage">History 📜</a>
            <a href="/total">Shortcuts RSS 💰</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
