import Link from "next/link";
import Image from "next/image";

export default function BookingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
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
          <span className="font-serif text-sm font-semibold">Book</span>
        </Link>
        <Link
          href="/book"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Book now
        </Link>
      </div>
    </header>
  );
}
