import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const geistSans = IBM_Plex_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

const geistThai = IBM_Plex_Sans_Thai({
  variable: "--font-geist-thai",
  subsets: ["thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pix | Resize • Convert • Optimize",
  description: "Professional browser-based image editor. Resize, convert, and optimize images 100% locally. No server uploads, total privacy.",
  keywords: ["image resizer", "image converter", "heic to jpg", "browser-based editor", "privacy focused", "batch image processing"],
  authors: [{ name: "Craft Operation Group" }],

  openGraph: {
    title: "Pix | Resize • Convert • Optimize",
    description: "Edit your images with total privacy. 100% client-side processing.",
    url: "https://pix.54621325.xyz",
    siteName: "Pix",
    locale: "th_TH",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Pix | Resize • Convert • Optimize",
    description: "Fast, secure, and private image processing in your browser.",
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistThai.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
