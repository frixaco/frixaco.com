import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Tabs } from "@/components/tabs";

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
      className="stable overscroll-none scroll-smooth"
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-cyber-bg font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="relative flex min-h-screen flex-col items-center justify-start">
            <div className="flex size-full max-w-4xl flex-col px-8 md:flex-row md:gap-12">
              <Tabs />

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

            {/* <Drawer isOpen={false} /> */}

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
              <span>
                <a
                  target="_blank"
                  href="https://frixaco-gv5t9unyr-frixaco-personal.vercel.app/"
                >
                  v3
                </a>
              </span>
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
