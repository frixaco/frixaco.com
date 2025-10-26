import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";
import { Drawer } from "@/components/drawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "rustam",
  description: "Rustam's (frixaco) personal website",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isWIP = false;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="overscroll-none scroll-smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-cyber-bg antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="relative flex min-h-screen flex-col items-center justify-start font-mono text-sm">
            <div className="flex size-full max-w-2xl flex-col gap-2 px-8">
              <div className="bg-cyber-bg sticky top-0 flex flex-col gap-4 pt-4">
                <div className="flex items-start justify-between gap-8">
                  <div className="flex h-8 flex-row items-center justify-start gap-8">
                    <h1 className="text-cyber-fg hover:text-cyber-red font-bold tracking-wide">
                      <Link href="/">rustam</Link>
                    </h1>

                    <span className="bg-cyber-bg-alt hidden h-0.5 w-12 rounded-full md:inline-block"></span>

                    <div className="text-cyber-grey flex items-center justify-center gap-6">
                      <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                        <Link href="/">home</Link>
                      </h2>
                      <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                        <Link href="/blog">blog</Link>
                      </h2>
                      <h2 className="hover:text-cyber-fg cursor-pointer transition-colors duration-200">
                        <Link href="/more">more</Link>
                      </h2>
                    </div>
                  </div>

                  <ModeToggle />
                </div>

                <span className="bg-cyber-bg-alt h-0.5 w-full rounded-full"></span>
              </div>

              {children}
            </div>

            {isWIP && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <h1 className="text-center text-4xl font-bold text-white">
                  making some changes
                  <br />
                  will be back soon
                  <br />
                  keyboard navigation is working though
                </h1>
              </div>
            )}

            <Drawer isOpen={false} />

            <div className="absolute right-0 bottom-0 flex gap-4 p-4">
              <span>
                <a
                  className="hover:underline"
                  target="_blank"
                  href="https://frixaco-nncl2ucfa-frixaco-personal.vercel.app/"
                >
                  v1
                </a>
              </span>
              <span>
                <a
                  className="hover:underline"
                  target="_blank"
                  href="https://frixaco-7uw1r14e8-frixaco-personal.vercel.app/"
                >
                  v2
                </a>
              </span>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
