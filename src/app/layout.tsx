// src/app/layout.tsx
import type { Metadata } from 'next';
import '@/app/globals.css'; // Ensure globals.css is imported
import { AuthProvider } from '@/contexts/AuthContext'; // Corrected to AuthProvider
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'DDO Character Vault',
  description: 'Manage your Dungeons & Dragons Online characters efficiently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* className="dark" removed from html tag, globals.css handles it via :root and .dark selector */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn("font-body antialiased min-h-screen flex flex-col")}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
