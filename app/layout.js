import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const META_PIXEL_ID = "1621799072361353";

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
  title: {
    default: "Book Your Ceylon Tea Experience | TCTE",
    template: "%s | TCTE Booking",
  },
  description:
    "Book The Ceylon Tea Experience: choose a session, enter guest details, and complete payment.",
  authors: [{ name: "The Ceylon Tea Experience" }],
  openGraph: {
    title: "Book Your Ceylon Tea Experience | TCTE",
    description:
      "Transactional booking and payment for The Ceylon Tea Experience.",
    type: "website",
    locale: "en_US",
    siteName: "TCTE Booking",
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
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* Facebook tracking pixel must remain a raw img; next/image would break the beacon. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
        <a
          href="https://wa.me/94702900500"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M20.52 3.48A11.83 11.83 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.14 1.58 5.95L0 24l6.35-1.66a11.82 11.82 0 0 0 5.73 1.46h.01c6.55 0 11.88-5.33 11.88-11.88a11.8 11.8 0 0 0-3.45-8.44Zm-8.43 18.3h-.01a9.8 9.8 0 0 1-4.99-1.36l-.36-.21-3.77.99 1.01-3.67-.23-.38a9.8 9.8 0 0 1-1.5-5.26c0-5.41 4.4-9.81 9.82-9.81a9.74 9.74 0 0 1 6.95 2.88 9.74 9.74 0 0 1 2.87 6.95c0 5.41-4.41 9.81-9.79 9.81Zm5.38-7.35c-.3-.15-1.77-.88-2.04-.98-.27-.1-.47-.15-.66.15-.2.3-.76.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.78-1.48-1.74-1.65-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.66-1.6-.91-2.2-.24-.57-.48-.5-.66-.51l-.56-.01c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.5s1.07 2.91 1.22 3.11c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.5 1.71.64.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35Z" />
          </svg>
        </a>
      </body>
    </html>
  );
}
