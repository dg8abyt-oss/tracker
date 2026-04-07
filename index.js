require('dotenv').config();
const http = require('http');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;

// Initialize Supabase using the Vercel-injected environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/add') {
    const chore = parsedUrl.query.chore;
    const amount = parsedUrl.query.amount;

    if (!chore || !amount) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Bad Request: Missing data.\n');
    }
    
    // Write directly to Supabase instead of a local file
    const { error } = await supabase
      .from('chores')
      .insert([{ chore: chore, amount: parseFloat(amount) }]);

    if (error) {
      console.error('Supabase insert error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Failed to save to database.\n');
    }
    
    console.log(`Saved to DB: ${chore} | $${amount}`);
    res.writeHead(302, { 'Location': '/?success=true' });
    return res.end();
  }

  if (parsedUrl.pathname === '/') {
    const isSuccess = parsedUrl.query.success === 'true';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Chore Tracker</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f3f4f6; color: #1f2937; }
        .card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        h1 { font-size: 1.5rem; text-align: center; margin-top: 0; }
        label { display: block; margin-top: 16px; font-weight: 600; font-size: 0.9rem; }
        input { width: 100%; padding: 12px; margin-top: 8px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
        button { width: 100%; padding: 14px; margin-top: 24px; background-color: #10b981; color: white; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
        button:hover { background-color: #059669; }
        .success-banner { background-color: #d1fae5; color: #065f46; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px; font-weight: 500; display: ${isSuccess ? 'block' : 'none'}; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>💸 Track a Chore</h1>
        <div class="success-banner">Awesome! Saved to Database.</div>
        <form action="/add" method="GET">
          <label for="chore">What did you do?</label>
          <input type="text" id="chore" name="chore" placeholder="e.g., Washed the car" required autocomplete="off">
          
          <label for="amount">Amount Earned ($)</label>
          <input type="number" id="amount" name="amount" step="0.01" min="0" placeholder="e.g., 20.00" required>
          
          <button type="submit">Log Chore</button>
        </form>
      </div>
    </body>
    </html>
    `;
    return res.end(html);
  }

  res.statusCode = 404;
  res.end('404: Not Found\n');
});

// Vercel serverless function export compatibility
if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  module.exports = server;
}
