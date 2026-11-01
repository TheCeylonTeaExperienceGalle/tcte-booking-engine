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
  title: "THE CEYLON TEA | Discover The Art Of Ceylon Tea Experience",
  description: "Immerse yourself in the world of tea with THE CEYLON TEA. Experience authentic tea plucking, black tea and green tea experiences, and professional tea tasting sessions in our scenic tea estates.",
  keywords: "ceylon tea, tea tourism, tea tours, tea plucking, tea tasting, black tea experience, green tea experience, tea estates",
  authors: [{ name: "THE CEYLON TEA" }],
  openGraph: {
    title: "THE CEYLON TEA | Discover The Art Of Ceylon Tea Experience",
    description: "Immerse yourself in the world of tea with authentic Ceylon tea tourism experiences",
    type: "website",
    locale: "en_US",
    siteName: "THE CEYLON TEA",
  },
  twitter: {
    card: "summary_large_image",
    title: "THE CEYLON TEA | Discover The Art Of Ceylon Tea Experience",
    description: "Immerse yourself in the world of tea with authentic Ceylon tea tourism experiences",
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
