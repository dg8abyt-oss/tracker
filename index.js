require('dotenv').config();
const http = require('http');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Get Monday of the week for any given date
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatWeekLabel = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const now = new Date();
  const currentMonday = getMonday(now);

  // 1. RSS FEED
  if (parsedUrl.pathname === '/rss') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false }).limit(30);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    const items = chores ? chores.map(c => `<item><title>${c.chore}: $${c.amount}</title><link>https://${req.headers.host}/storage</link><pubDate>${new Date(c.created_at).toUTCString()}</pubDate><guid isPermaLink="false">${c.id}</guid></item>`).join('') : '';
    return res.end(`<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Chore Log</title>${items}</channel></rss>`);
  }

  // 2. STORAGE (Other Weeks)
  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const weeks = {};
    if (chores) {
      chores.forEach(c => {
        const choreMonday = getMonday(c.created_at);
        // Only include if NOT the current week
        if (choreMonday.getTime() !== currentMonday.getTime()) {
          const label = formatWeekLabel(choreMonday);
          if (!weeks[label]) weeks[label] = { items: [], total: 0 };
          weeks[label].items.push(c);
          weeks[label].total += parseFloat(c.amount);
        }
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
          body{font-family:-apple-system,sans-serif;padding:20px;background:#f9fafb;color:#111827;}
          .week-section{background:white;padding:15px;border-radius:12px;margin: 20px auto;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:500px;}
          h3{margin-top:0;font-size:0.9rem;display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:8px;color:#6b7280;}
          .total{color:#10b981;font-weight:bold;}
          table{width:100%;font-size:0.9rem;}
          td{padding:8px 0;border-bottom:1px solid #f3f4f6;}
          .back{display:block;text-align:center;margin-top:20px;color:#2563eb;text-decoration:none;font-weight:bold;}
        </style>
      </head>
      <body>
        <h2 style="text-align:center">Past History</h2>
        ${content || '<p style="text-align:center">No past history found.</p>'}
        <a href="/" class="back">← Current Week</a>
      </body>
      </html>`);
  }

  // 3. ADD LOGIC
  if (parsedUrl.pathname === '/add') {
    const { chore, amount, type } = parsedUrl.query;
    if (!chore || !amount) { res.statusCode = 400; return res.end('Missing data'); }
    await supabase.from('chores').insert([{ chore, amount: parseFloat(amount) }]);
    if (type === 'json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ success: true })); }
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  // 4. HOME PAGE (Current Week History)
  if (parsedUrl.pathname === '/') {
    const isSuccess = parsedUrl.query.success === 'true';
    const { data: chores } = await supabase.from('chores').select('*').order('created_at', { ascending: false });
    
    let currentWeekItems = [];
    let currentWeekTotal = 0;
    if (chores) {
      chores.forEach(c => {
        if (getMonday(c.created_at).getTime() === currentMonday.getTime()) {
          currentWeekItems.push(c);
          currentWeekTotal += parseFloat(c.amount);
        }
      });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <title>Chore Tracker</title>
        <style>
          body { font-family: -apple-system,sans-serif; padding: 20px; background: #f3f4f6; color: #1f2937; margin: 0; }
          .card { background: white; padding: 25px; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); max-width: 400px; margin: auto; }
          h1 { font-size: 1.5rem; margin-bottom: 20px; text-align: center; }
          input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #d1d5db; border-radius: 10px; box-sizing: border-box; font-size: 16px; }
          button { width: 100%; padding: 14px; background: #059669; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 10px; }
          .msg { color: #059669; font-weight: 600; text-align: center; margin-bottom: 15px; display: ${isSuccess ? 'block' : 'none'}; }
          .week-display { margin-top: 30px; text-align: left; }
          .week-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 0.9rem; border-bottom: 2px solid #f3f4f6; padding-bottom: 5px; margin-bottom: 10px; }
          .chore-row { display: flex; justify-content: space-between; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid #f9fafb; }
          .links { margin-top: 25px; display: flex; justify-content: space-around; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 15px; }
          a { color: #2563eb; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Chore Tracker</h1>
          <div class="msg">✓ Saved</div>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="What did you do?" required autofocus>
            <input type="number" name="amount" step="0.01" placeholder="Amount ($)" required>
            <button type="submit">Log Chore</button>
          </form>

          <div class="week-display">
            <div class="week-header">
              <span>This Week</span>
              <span style="color:#10b981">$${currentWeekTotal.toFixed(2)}</span>
            </div>
            ${currentWeekItems.length > 0 ? currentWeekItems.map(i => `
              <div class="chore-row">
                <span>${i.chore}</span>
                <span>$${parseFloat(i.amount).toFixed(2)}</span>
              </div>
            `).join('') : '<p style="font-size:0.8rem; color:#9ca3af; text-align:center;">No chores this week yet.</p>'}
          </div>

          <div class="links">
            <a href="/storage">Old History 📜</a>
            <a href="/rss" style="color:#d97706">RSS Feed 📡</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
