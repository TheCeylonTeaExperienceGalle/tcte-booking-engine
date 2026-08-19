import Link from "next/link";
import { MAIN_WEBSITE_URL } from "@/lib/site";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-xl font-serif font-bold">
              The Ceylon Tea Experience
            </h3>
            <p className="text-sm opacity-90">Booking and reservations</p>
            <a
              href={MAIN_WEBSITE_URL}
              className="inline-block text-sm underline underline-offset-4 opacity-90 hover:opacity-100"
            >
              Back to main website
            </a>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Booking policies</h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li>
                <Link href="/privacy-policy" className="hover:opacity-100">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:opacity-100">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:opacity-100">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Need help?</h4>
            <ul className="space-y-2 text-sm opacity-90">
              <li>
                <a href="tel:+94702900500" className="hover:opacity-100">
                  (+94) 70 290 0500
                </a>
              </li>
              <li>
                <a
                  href="mailto:reservations@theceylonteaexperience.com"
                  className="hover:opacity-100"
                >
                  reservations@theceylonteaexperience.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/20 pt-6 text-center text-sm opacity-75">
          <p>
            &copy; {currentYear} The Ceylon Tea Experience. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
