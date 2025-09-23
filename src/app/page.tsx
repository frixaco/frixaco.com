import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start py-20 min-h-screen">
      <main className="relative w-full flex items-center gap-8 max-w-4xl justify-start font-mono px-8">
        <ModeToggle />

        <div className="flex items-center justify-start gap-8 h-8">
          <h1 className="text-cyber-fg font-bold tracking-wide">rustam</h1>

          <span className="w-8 rounded-full h-px bg-cyber-bg-highlight"></span>

          <div className="flex gap-4 items-center justify-center">
            <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
              home
            </h2>
            <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
              blog
            </h2>
            <h2 className="text-cyber-grey cursor-pointer hover:text-cyber-fg duration-200 transition-colors">
              setup
            </h2>
          </div>
        </div>
      </main>
    </div>
  );
}
