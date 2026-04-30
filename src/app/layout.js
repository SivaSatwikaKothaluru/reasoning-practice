import './globals.css'

export const metadata = {
  title: 'Reasoning Practice | AI Aptitude Prep',
  description: 'AI-powered placement prep for verbal and analytical reasoning',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
