import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";

export function Tabs() {
  return (
    <div className="bg-cyber-bg sticky top-0 flex items-center justify-between gap-8 py-4 md:h-screen md:flex-col md:justify-center md:py-0">
      <div className="text-cyber-fg flex items-end justify-center gap-6 font-bold tracking-wide md:flex-col">
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link
            href="/"
            className="rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            Home
          </Link>
        </h2>
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link
            href="/blog"
            className="rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            Blog
          </Link>
        </h2>
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link
            href="/more"
            className="rounded px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            More
          </Link>
        </h2>
      </div>

      <ModeToggle />
    </div>
  );
}
