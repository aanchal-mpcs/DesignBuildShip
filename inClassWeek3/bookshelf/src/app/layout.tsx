import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import { Bodoni_Moda, EB_Garamond } from "next/font/google";
import SyncUser from "@/components/SyncUser";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Book Club",
  description: "A shared class book club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <nav className="sticky top-0 z-50 backdrop-blur-md bg-[var(--background)]/85 border-b border-[var(--grey-light)]">
            <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
              <div className="flex items-center gap-8">
                <a
                  href="/"
                  className="font-display text-xl font-bold tracking-tight italic text-[var(--foreground)]"
                >
                  Book Club
                </a>
                <NavLinks />
              </div>
              <div className="flex items-center gap-3">
                <Show when="signed-out">
                  <SignInButton>
                    <button className="px-4 py-1.5 text-sm font-body text-[var(--grey)] transition-colors hover:text-[var(--foreground)]">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="rounded-none border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-1.5 text-sm font-body italic text-[var(--background)] transition-colors hover:bg-transparent hover:text-[var(--foreground)]">
                      Sign up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </nav>
          <SyncUser />
          {children}
          <footer className="border-t border-[var(--grey-light)] py-8 text-center">
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--grey)]">
              ❧ Book Club ❧
            </p>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
