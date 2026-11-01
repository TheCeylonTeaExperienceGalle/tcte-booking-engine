import Link from "next/link";
import Image from "next/image";

export default function BookingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#DED7CA] bg-[#F9F6F0]">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/book" className="flex items-center gap-3">
          <Image
            src="/image/logo/logo.png"
            alt="The Ceylon Tea Experience"
            width={160}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="font-serif text-lg font-bold text-[#2D6A2D]">Book</span>
        </Link>
        <Link
          href="/book"
          className="rounded-sm bg-[#2D6A2D] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#1A3D1A]"
        >
          Book now
        </Link>
      </div>
    </header>
  );
}
