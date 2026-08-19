"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MAIN_WEBSITE_URL } from "@/lib/site";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/book" className="flex items-center space-x-3">
            <Image
              src="/image/logo/logo.png"
              alt="The Ceylon Tea Experience"
              width={180}
              height={180}
              className="object-contain drop-shadow-md filter brightness-0"
              priority
              quality={70}
            />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/book"
              className="text-sm font-medium text-foreground hover:text-primary"
            >
              Book
            </Link>
            <a
              href={MAIN_WEBSITE_URL}
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Back to main website
            </a>
          </nav>

          <button
            className="p-2 md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="border-t py-4 md:hidden">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/book"
                className="text-sm font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Book
              </Link>
              <a
                href={MAIN_WEBSITE_URL}
                className="text-sm font-medium text-muted-foreground"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Back to main website
              </a>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
