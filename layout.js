export const metadata = {
  title: 'Chores',
  description: 'Track chores and earnings',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chores',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/512px-Apple_logo_black.svg.png" />
      </head>
      <body style={{ 
        margin: 0, 
        backgroundColor: '#f2f2f7', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }}>
        {children}
      </body>
    </html>
  )
}
