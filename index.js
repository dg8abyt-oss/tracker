require('dotenv').config();
const http = require('http');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const getWeekStart = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(date.setDate(diff));
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/rss') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false }).limit(30);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    const items = chores ? chores.map(c => `<item><title>${c.chore}: $${c.amount}</title><link>https://${req.headers.host}/storage</link><description>Logged ${c.chore}</description><pubDate>${new Date(c.created_at).toUTCString()}</pubDate><guid isPermaLink="false">${c.id}</guid></item>`).join('') : '';
    return res.end(`<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Chore Log</title>${items}</channel></rss>`);
  }

  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html');

    // Grouping logic
    const weeks = {};
    if (chores) {
      chores.forEach(c => {
        const week = getWeekStart(c.created_at);
        if (!weeks[week]) weeks[week] = { items: [], total: 0 };
        weeks[week].items.push(c);
        weeks[week].total += parseFloat(c.amount);
      });
    }

    let content = Object.keys(weeks).map(week => `
      <div class="week-section">
        <h3>Week of ${week} <span class="total">Total: $${weeks[week].total.toFixed(2)}</span></h3>
        <table>
          ${weeks[week].items.map(i => `<tr><td>${i.chore}</td><td style="text-align:right">$${parseFloat(i.amount).toFixed(2)}</td></tr>`).join('')}
        </table>
      </div>
    `).join('');

    return res.end(`
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{font-family:-apple-system,sans-serif;padding:20px;background:#f9fafb;color:#111827;}
          .week-section{background:white;padding:15px;border-radius:12px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);}
          h3{margin-top:0;font-size:1rem;display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:8px;}
          .total{color:#10b981;}
          table{width:100%;font-size:0.9rem;}
          td{padding:6px 0;border-bottom:1px solid #f3f4f6;}
          .back{display:inline-block;margin-top:10px;color:#3b82f6;text-decoration:none;font-weight:bold;}
        </style>
      </head>
      <body>
        <h2>History by Week</h2>
        ${content || '<p>No chores logged yet.</p>'}
        <a href="/" class="back">← Back to Tracker</a>
      </body>
      </html>`);
  }

  if (parsedUrl.pathname === '/add') {
    const { chore, amount, type } = parsedUrl.query;
    if (!chore || !amount) { res.statusCode = 400; return res.end('Missing data'); }
    await supabase.from('chores').insert([{ chore, amount: parseFloat(amount) }]);
    if (type === 'json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: true })); }
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  if (parsedUrl.pathname === '/') {
    const isSuccess = parsedUrl.query.success === 'true';
    res.setHeader('Content-Type', 'text/html');
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; background: #f0f2f5; text-align: center;}
          .card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
          input { width: 100%; padding: 14px; margin: 10px 0; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; font-size: 16px; }
          button { width: 100%; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; }
          .msg { color: #059669; font-weight: bold; margin-bottom: 10px; display: ${isSuccess ? 'block' : 'none'}; }
          .links { margin-top: 24px; display: flex; justify-content: space-around; font-size: 0.9rem; }
          a { color: #3b82f6; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>💸 Tracker</h1>
          <p class="msg">Chore Logged!</p>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="Chore name" required autofocus>
            <input type="number" name="amount" step="0.01" placeholder="Amount ($)" required>
            <button type="submit">Add to Log</button>
          </form>
          <div class="links">
            <a href="/storage">Weekly History 📜</a>
            <a href="/rss" style="color:#ea580c">RSS Feed 📡</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
