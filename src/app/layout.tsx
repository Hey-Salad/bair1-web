import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bair1 — Know Your Air",
  description: "Real-time air quality monitoring. The bear sniffs the air so you don't have to.",
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
