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
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/rss') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false }).limit(30);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    const items = chores ? chores.map(c => `<item><title>${c.chore}: $${c.amount}</title><link>https://${req.headers.host}/storage</link><pubDate>${new Date(c.created_at).toUTCString()}</pubDate><guid isPermaLink="false">${c.id}</guid></item>`).join('') : '';
    return res.end(`<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Chore Log</title>${items}</channel></rss>`);
  }

  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

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
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:20px;background:#f9fafb;color:#111827;line-height:1.5;}
          h2{text-align:center;color:#374151;}
          .week-section{background:white;padding:20px;border-radius:12px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:500px;margin-left:auto;margin-right:auto;}
          h3{margin-top:0;font-size:1rem;display:flex;justify-content:space-between;border-bottom:2px solid #f3f4f6;padding-bottom:10px;color:#4b5563;}
          .total{color:#059669;font-weight:bold;}
          table{width:100%;font-size:0.95rem;margin-top:10px;}
          td{padding:8px 0;border-bottom:1px solid #f3f4f6;}
          .back{display:block;text-align:center;margin-top:20px;color:#2563eb;text-decoration:none;font-weight:600;}
        </style>
      </head>
      <body>
        <h2>Chore History</h2>
        ${content || '<p style="text-align:center;">No chores logged yet.</p>'}
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
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <title>Chore Tracker</title>
        <style>
          body { font-family: -apple-system,BlinkMacSystemFont,sans-serif; padding: 40px 20px; background: #f3f4f6; color: #1f2937; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-width: 400px; margin: auto; }
          h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 24px; color: #111827; text-align: center; letter-spacing: -0.025em; }
          .input-group { text-align: left; margin-bottom: 16px; }
          label { display: block; font-size: 0.875rem; font-weight: 600; color: #4b5563; margin-bottom: 6px; }
          input { width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; box-sizing: border-box; font-size: 16px; transition: border-color 0.2s; }
          input:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb; }
          button { width: 100%; padding: 14px; background: #059669; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 10px; transition: background 0.2s; }
          button:hover { background: #047857; }
          .msg { color: #059669; font-weight: 600; margin-bottom: 20px; text-align: center; padding: 10px; background: #ecfdf5; border-radius: 8px; display: ${isSuccess ? 'block' : 'none'}; }
          .links { margin-top: 32px; display: flex; justify-content: space-around; border-top: 1px solid #f3f4f6; padding-top: 20px; }
          a { color: #2563eb; text-decoration: none; font-size: 0.9rem; font-weight: 600; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Chore Tracker</h1>
          <div class="msg">✓ Entry Saved Successfully</div>
          <form action="/add" method="GET">
            <div class="input-group">
              <label>What chore did you do?</label>
              <input type="text" name="chore" placeholder="e.g. Cleaned kitchen" required autofocus>
            </div>
            <div class="input-group">
              <label>Amount Earned</label>
              <input type="number" name="amount" step="0.01" placeholder="0.00" required>
            </div>
            <button type="submit">Log Activity</button>
          </form>
          <div class="links">
            <a href="/storage">History 📜</a>
            <a href="/rss" style="color:#d97706">RSS Feed 📡</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
