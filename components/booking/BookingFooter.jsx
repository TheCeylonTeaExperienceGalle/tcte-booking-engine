import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "https://www.theceylonteaexperience.com/" },
  { label: "About", href: "https://www.theceylonteaexperience.com/#about" },
  { label: "Services", href: "https://www.theceylonteaexperience.com/#services" },
  { label: "Gallery", href: "https://www.theceylonteaexperience.com/#gallery" },
  { label: "Journal", href: "https://www.theceylonteaexperience.com/blog" },
  { label: "Contact", href: "https://www.theceylonteaexperience.com/#contact" },
];

const policyLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

export default function BookingFooter() {
  return (
    <footer className="bg-[#1A3D1A] px-8 pb-4 pt-16 text-sm font-sans text-gray-300">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-4">
        <div>
          <h3 className="mb-4 text-xl font-serif font-bold leading-tight text-[#D3AE24]">
            THE CEYLON TEA
            <br />
            EXPERIENCE
          </h3>
          <p className="mb-6 text-xs leading-relaxed text-gray-400">
            Artisanal Tea Excellence.
            <br />
            Rooted in the Southern Coast of Sri Lanka.
          </p>
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white">Find Us</h4>
            <p className="mb-2 text-xs">146A Sea Street, Galle 80000, Sri Lanka</p>
            <a
              href="https://www.google.com/maps/place/The+Ceylon+Tea+Experience+-+Galle/data=!4m7!3m6!1s0x3ae1736b35262d13:0x993881923260c1bd!8m2!3d6.0371585!4d80.2245897!16s%2Fg%2F11ytzjgzgf!19sChIJEy0mNWtz4ToRvcFgMpKBOJk?authuser=0&hl=en&rclk=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#D3AE24] transition hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              View on Google Maps
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white">Quick Links</h4>
          <ul className="space-y-3 text-xs">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="transition hover:text-[#B8960C]">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white">Policies</h4>
          <ul className="space-y-3 text-xs">
            {policyLinks.map((policy) => (
              <li key={policy.href}>
                <Link href={policy.href} className="transition hover:text-[#B8960C]">
                  {policy.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-white">Contact Us</h4>
          <ul className="mb-8 space-y-5 text-xs">
            <li>
              <a href="tel:+94702900500" className="flex items-center gap-2 transition-colors hover:text-[#B8960C]">
                <svg className="h-4 w-4 text-[#B8960C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                (+94) 702 900 500
              </a>
            </li>
            <li>
              <span className="mb-1 block font-bold text-white">General Inquiries:</span>
              <a
                href="mailto:info@theceylonteaexperience.com"
                className="break-words transition-colors hover:text-[#B8960C]"
              >
                info@theceylonteaexperience.com
              </a>
            </li>
            <li>
              <span className="mb-1 block font-bold text-white">Reservations:</span>
              <a
                href="mailto:reservations@theceylonteaexperience.com"
                className="break-words transition-colors hover:text-[#B8960C]"
              >
                reservations@theceylonteaexperience.com
              </a>
            </li>
            <li>
              <span className="mb-1 block font-bold text-white">Website:</span>
              <a
                href="https://www.theceylonteaexperience.com"
                target="_blank"
                rel="noopener noreferrer"
                className="break-words transition-colors hover:text-[#B8960C]"
              >
                www.theceylonteaexperience.com
              </a>
            </li>
          </ul>

          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white">Follow Us</h4>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/theceylonteaexperience?igsh=dDhtdXIwbzM0OGRh"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 transition-colors hover:text-[#B8960C]"
              aria-label="Instagram"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/theceylonteaexperience?rdid=CssqTtbequqvomYQ&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1C8jGDQwgq%2F#"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 transition-colors hover:text-[#B8960C]"
              aria-label="Facebook"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@theceylonteaexper?_r=1&_t=ZS-92jKpR4JwXa"
              target="_blank"
              rel="noreferrer"
              className="text-gray-400 transition-colors hover:text-[#B8960C]"
              aria-label="TikTok"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-md border-t border-gray-700/50 pt-4 text-center text-[10px] uppercase tracking-widest text-gray-300">
        © {new Date().getFullYear()} EXPACE PVT LTD. All rights reserved.
      </div>
    </footer>
  );
}
