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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-cyber-bg`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="text-sm relative overflow-hidden flex flex-col items-center justify-start py-12 2xl:py-20 min-h-screen font-mono">
            <div className="size-full max-w-2xl flex flex-col gap-8 px-8 md:px-0">
              <div className="flex items-start gap-8 justify-between relative">
                <div className="flex flex-col md:flex-row md:items-center justify-start gap-8 md:h-8">
                  <h1 className="text-cyber-fg font-bold tracking-wide hover:text-cyber-red">
                    <Link href="/">rustam</Link>
                  </h1>

                  <span className="w-12 rounded-full h-0.5 bg-cyber-bg-alt"></span>

                  <div className="flex gap-6 items-center justify-center text-cyber-grey">
                    <h2 className="cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/">home</Link>
                    </h2>
                    <h2 className="cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/blog">blog</Link>
                    </h2>
                    <h2 className="cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/more">more</Link>
                    </h2>
                  </div>
                </div>

                <ModeToggle />
              </div>

              <span className="w-full rounded-full h-0.5 bg-cyber-bg-alt"></span>

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

            <div className="absolute right-0 bottom-0 p-4 flex gap-4">
              <span>
                <a
                  className="hover:underline"
                  href="https://frixaco-nncl2ucfa-frixaco-personal.vercel.app/"
                >
                  v1
                </a>
              </span>
              <span>
                <a
                  className="hover:underline"
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
