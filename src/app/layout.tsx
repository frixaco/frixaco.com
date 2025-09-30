import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";

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
          <main className="flex flex-col items-center justify-start py-8 2xl:py-20 min-h-screen font-mono">
            <div className="size-full max-w-2xl flex flex-col gap-8 px-8 md:px-0">
              <div className="flex items-start gap-8 justify-between relative">
                <div className="flex flex-col md:flex-row md:items-center justify-start gap-8 md:h-8">
                  <h1 className="text-cyber-fg font-bold tracking-wide">
                    rustam
                  </h1>

                  <span className="w-8 rounded-full h-px bg-cyber-bg-alt"></span>

                  <div className="flex gap-6 items-center justify-center">
                    <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/">home</Link>
                    </h2>
                    <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/blog">blog</Link>
                    </h2>
                    <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
                      <Link href="/setup">setup</Link>
                    </h2>
                  </div>
                </div>

                <ModeToggle />
              </div>

              <span className="w-full rounded-full h-px bg-cyber-bg-alt"></span>

              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
