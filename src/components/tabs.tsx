import { ModeToggle } from "@/components/mode-toggle";
import Link from "next/link";

export function Tabs() {
  return (
    <div className="bg-cyber-bg sticky top-0 flex items-center justify-between gap-8 py-4 md:h-screen md:flex-col md:justify-center md:py-0">
      <div className="text-cyber-fg flex items-center justify-center gap-6 font-bold tracking-wide md:flex-col">
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link href="/">home</Link>
        </h2>
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link href="/blog">blog</Link>
        </h2>
        <h2 className="cursor-pointer transition-colors hover:underline">
          <Link href="/more">more</Link>
        </h2>
      </div>

      <ModeToggle />
    </div>
  );
}
