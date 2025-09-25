import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-start py-8 2xl:py-20 min-h-screen font-mono">
      <div className="size-full max-w-2xl flex flex-col gap-8 px-8 md:px-0">
        <div className="flex items-start gap-8 justify-between relative">
          <div className="flex flex-col md:flex-row md:items-center justify-start gap-8 md:h-8">
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

          <ModeToggle />
        </div>

        <span className="w-8 rounded-full h-px bg-cyber-bg-highlight"></span>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h3 className="text-cyber-grey">about</h3>
            <p className=""></p>
          </div>

          <div className="flex flex-col">
            <h3 className="text-cyber-grey">projects</h3>
          </div>

          <div className="flex flex-col">
            <h3 className="text-cyber-grey">experience</h3>
          </div>
        </div>
      </div>
    </main>
  );
}
