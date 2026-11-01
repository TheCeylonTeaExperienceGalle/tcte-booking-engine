import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import ChunkErrorHandler from "@/components/ChunkErrorHandler";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Book | The Ceylon Tea Experience",
  description:
    "Book a session at The Ceylon Tea Experience. Review payment status, privacy, refunds, and booking terms.",
  authors: [{ name: "The Ceylon Tea Experience" }],
  openGraph: {
    title: "Book | The Ceylon Tea Experience",
    description: "Book a session and manage your reservation at The Ceylon Tea Experience.",
    type: "website",
    locale: "en_US",
    siteName: "The Ceylon Tea Experience",
  },
  twitter: {
    card: "summary",
    title: "Book | The Ceylon Tea Experience",
    description: "Book a session and manage your reservation at The Ceylon Tea Experience.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} font-sans antialiased`}
      >
        <ChunkErrorHandler />
        {children}
      </body>
    </html>
  );
}
