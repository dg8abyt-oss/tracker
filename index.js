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

  if (parsedUrl.pathname === '/total') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', false);
    const total = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    
    // Return the total FIRST, then archive if it's Saturday
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.write(`<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Total Balance</title>
          <item>
            <title>$${total.toFixed(2)}</title>
            <description>Allowance Request for ${new Date().toLocaleDateString()}</description>
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

  if (parsedUrl.pathname === '/add') {
    const { chore, amount } = parsedUrl.query;
    if (chore && amount) await supabase.from('chores').insert([{ chore, amount: parseFloat(amount), archived: false }]);
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', true).order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let rows = chores ? chores.map(c => `<tr><td>${c.chore}</td><td>$${parseFloat(c.amount).toFixed(2)}</td></tr>`).join('') : '';
    return res.end(`<html><body><h2>History Bin</h2><table border="1">${rows || 'Empty'}</table><br><a href="/">Back</a></body></html>`);
  }

  if (parsedUrl.pathname === '/') {
    const { data: chores } = await supabase.from('chores').select('*').eq('archived', false).order('created_at', { ascending: false });
    const currentTotal = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:sans-serif; text-align:center; padding:20px; background:#f3f4f6;">
        <div style="background:white; padding:25px; border-radius:20px; max-width:400px; margin:auto;">
          <h1>Chore Tracker</h1>
          <div style="margin:20px 0; padding:15px; background:#ecfdf5; border-radius:12px;">
            <div style="font-size:0.8rem; color:#059669;">Unpaid Balance</div>
            <div style="font-size:2rem; font-weight:bold;">$${currentTotal.toFixed(2)}</div>
          </div>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="What did you do?" style="width:100%; padding:10px; margin-bottom:10px;" required>
            <input type="number" name="amount" step="0.01" placeholder="Amount ($)" style="width:100%; padding:10px; margin-bottom:10px;" required>
            <button type="submit" style="width:100%; padding:15px; background:#059669; color:white; border:none; border-radius:10px; font-weight:bold;">Log Chore</button>
          </form>
          <p><a href="/storage">View History 📜</a> | <a href="/total">Manual Reset (Saturday Only) 💰</a></p>
        </div>
      </body></html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
