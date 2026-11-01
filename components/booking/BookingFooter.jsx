import Link from "next/link";

const policyLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/terms-and-conditions", label: "Terms & Conditions" },
];

export default function BookingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1A3D1A] text-gray-300">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div>
          <p className="font-serif text-lg font-bold text-[#D3AE24]">The Ceylon Tea Experience</p>
          <p className="mt-1 text-sm">Bookings and reservations</p>
        </div>
        <nav aria-label="Policies" className="flex flex-col gap-2 text-sm">
          {policyLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[#B8960C]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 text-sm">
          <a className="block hover:text-[#B8960C]" href="tel:+94702900500">
            (+94) 70 290 0500
          </a>
          <a
            className="block hover:text-[#B8960C]"
            href="mailto:reservations@theceylonteaexperience.com"
          >
            reservations@theceylonteaexperience.com
          </a>
          <a
            className="block hover:text-[#B8960C]"
            href="https://www.theceylonteaexperience.com"
          >
            theceylonteaexperience.com
          </a>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs text-gray-400">
        &copy; {year} The Ceylon Tea Experience
      </p>
    </footer>
  );
}
