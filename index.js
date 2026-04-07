require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'tracker.log');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Route: Add a chore to the log
  if (parsedUrl.pathname === '/add') {
    const chore = parsedUrl.query.chore;
    const amount = parsedUrl.query.amount;
    const msg = parsedUrl.query.msg; // Fallback for the old route
    
    let logEntry = '';
    const timestamp = new Date().toISOString();

    if (chore && amount) {
      logEntry = `[${timestamp}] Chore: ${chore} | Earned: $${amount}\n`;
    } else if (msg) {
      logEntry = `[${timestamp}] Log: ${msg}\n`;
    } else {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Bad Request: Missing data.\n');
    }
    
    fs.appendFile(LOG_FILE, logEntry, (err) => {
      if (err) {
        console.error('File write error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        return res.end('Failed to write to the log.\n');
      }
      console.log(`Logged: ${logEntry.trim()}`);
      
      // Redirect back to the UI with a success flag
      if (chore && amount) {
        res.writeHead(302, { 'Location': '/?success=true' });
        res.end();
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end(`Successfully logged.\n`);
      }
    });
    return;
  }

  // Route: Mobile-friendly UI on the root page
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
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
          padding: 20px; 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #f3f4f6; 
          color: #1f2937;
        }
        .card { 
          background: white; 
          padding: 24px; 
          border-radius: 16px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
        }
        h1 { 
          font-size: 1.5rem; 
          text-align: center; 
          margin-top: 0;
          color: #111827; 
        }
        label { 
          display: block; 
          margin-top: 16px; 
          font-weight: 600; 
          font-size: 0.9rem;
        }
        input { 
          width: 100%; 
          padding: 12px; 
          margin-top: 8px; 
          border: 1px solid #d1d5db; 
          border-radius: 8px; 
          box-sizing: border-box; 
          font-size: 1rem; 
        }
        input:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px solid #3b82f6;
        }
        button { 
          width: 100%; 
          padding: 14px; 
          margin-top: 24px; 
          background-color: #10b981; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-size: 1.1rem; 
          font-weight: 600;
          cursor: pointer; 
          transition: background-color 0.2s;
        }
        button:hover { background-color: #059669; }
        .success-banner { 
          background-color: #d1fae5; 
          color: #065f46; 
          padding: 12px; 
          border-radius: 8px; 
          text-align: center; 
          margin-bottom: 20px; 
          font-weight: 500;
          display: ${isSuccess ? 'block' : 'none'}; 
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>💸 Track a Chore</h1>
        <div class="success-banner">Awesome! Chore saved to your log.</div>
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

  // 404 Catch-all
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('404: Not Found\n');
});

server.listen(PORT, () => {
  console.log(`Server initialized and running on port ${PORT}`);
});
