import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bair1 — Know Your Air",
  description: "Real-time air quality monitoring. The bear sniffs the air so you don't have to.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Bair1 — Know Your Air",
    description: "Real-time air quality, honestly delivered.",
    url: "https://bair1.live",
    siteName: "Bair1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-fresh-linen">{children}</body>
    </html>
  );
}
