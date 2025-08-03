import './globals.css'
import { ThemeProvider } from 'next-themes'

export const metadata = {
  title: 'AutoLearn JP - Apprentissage du Japonais',
  description: 'Apprenez le japonais avec vos fichiers Obsidian',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}