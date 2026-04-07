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

  // 1. TOTAL ALLOWANCE & SATURDAY RESET
  if (parsedUrl.pathname === '/total') {
    // Get all unarchived chores
    const { data: chores, error } = await supabase
      .from('chores')
      .select('*')
      .eq('archived', false);

    if (error) return res.end('DB Error');

    const total = chores.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    let resetMsg = "";

    // If it's Saturday and we have chores, archive them
    if (isSaturday && chores.length > 0) {
      const { error: updateError } = await supabase
        .from('chores')
        .update({ archived: true })
        .eq('archived', false);
      
      if (!updateError) {
        resetMsg = "<p style='color:#ef4444; font-weight:bold;'>Saturday detected: Chores have been reset and moved to history bin.</p>";
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
      <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif; text-align:center; padding:50px 20px; background:#f3f4f6;} .val{font-size:3rem; font-weight:800; color:#10b981;} a{display:block; margin-top:20px; color:#2563eb; text-decoration:none; font-weight:bold;}</style></head>
      <body>
        <h1>Total Allowance</h1>
        <div class="val">$${total.toFixed(2)}</div>
        ${resetMsg}
        <a href="/">← Back to Tracker</a>
      </body>
      </html>`);
  }

  // 2. ADD LOGIC (Always starts as unarchived)
  if (parsedUrl.pathname === '/add') {
    const { chore, amount } = parsedUrl.query;
    if (!chore || !amount) return res.end('Missing data');
    
    await supabase.from('chores').insert([{ 
      chore: String(chore), 
      amount: parseFloat(amount),
      archived: false 
    }]);

    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  // 3. STORAGE (The "Bin" - Shows only archived items)
  if (parsedUrl.pathname === '/storage') {
    const { data: chores } = await supabase
      .from('chores')
      .select('*')
      .eq('archived', true)
      .order('created_at', { ascending: false });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    let rows = chores ? chores.map(c => `<tr><td>${c.chore}</td><td style="text-align:right">$${parseFloat(c.amount).toFixed(2)}</td></tr>`).join('') : '';
    
    return res.end(`
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;padding:20px;} table{width:100%;} td{padding:10px 0; border-bottom:1px solid #eee;}</style></head>
      <body><h2>History Bin</h2><table>${rows || 'No archived chores.'}</table><a href="/">Back</a></body></html>`);
  }

  // 4. HOME (Current Active Chores)
  if (parsedUrl.pathname === '/') {
    const isSuccess = parsedUrl.query.success === 'true';
    const { data: chores } = await supabase
      .from('chores')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });
    
    const currentTotal = chores ? chores.reduce((sum, c) => sum + parseFloat(c.amount), 0) : 0;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          body { font-family:-apple-system,sans-serif; padding:20px; background:#f3f4f6; color:#1f2937; margin:0; text-align:center; }
          .card { background:white; padding:25px; border-radius:20px; box-shadow:0 4px 10px rgba(0,0,0,0.05); max-width:400px; margin:auto; }
          input { width:100%; padding:12px; margin:8px 0; border:1px solid #d1d5db; border-radius:10px; box-sizing:border-box; font-size:16px; }
          button { width:100%; padding:14px; background:#059669; color:white; border:none; border-radius:10px; font-weight:700; cursor:pointer; }
          .total-box { margin: 20px 0; padding:15px; background:#ecfdf5; border-radius:12px; cursor:pointer; text-decoration:none; display:block; color:inherit; }
          .chore-list { text-align:left; font-size:0.9rem; margin-top:20px; }
          .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f9fafb; }
          .links { margin-top:25px; display:flex; justify-content:space-around; font-size:0.85rem; border-top:1px solid #eee; padding-top:15px; }
          a { color:#2563eb; text-decoration:none; font-weight:600; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Chore Tracker</h1>
          <a href="/total" class="total-box">
            <div style="font-size:0.8rem; color:#059669;">Current Balance</div>
            <div style="font-size:1.5rem; font-weight:bold;">$${currentTotal.toFixed(2)}</div>
          </a>
          <form action="/add" method="GET">
            <input type="text" name="chore" placeholder="Chore" required>
            <input type="number" name="amount" step="0.01" placeholder="$ Amount" required>
            <button type="submit">Log Entry</button>
          </form>
          <div class="chore-list">
            ${chores && chores.length > 0 ? chores.map(i => `<div class="row"><span>${i.chore}</span><span>$${parseFloat(i.amount).toFixed(2)}</span></div>`).join('') : '<p style="text-align:center;color:#9ca3af">No active chores.</p>'}
          </div>
          <div class="links">
            <a href="/storage">History Bin 📜</a>
            <a href="/total" style="color:#d97706">Collect / Reset 💰</a>
          </div>
        </div>
      </body>
      </html>`);
  }
});

if (require.main === module) { server.listen(PORT); } else { module.exports = server; }
