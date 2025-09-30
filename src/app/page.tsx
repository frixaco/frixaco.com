export default function Page() {
  return (
    <div className="flex flex-col gap-10 text-sm text-cyber-grey">
      <section className="flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-xs text-cyber-fg">about</h3>
        <p className="">
          software engineer, interested in pretty much everything, currently{" "}
          {/* TODO: add whatmedoin stats */}
          <span></span>
        </p>
      </section>

      <section className="flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-xs text-cyber-fg">projects</h3>
        <div></div>
      </section>

      <section className="flex flex-col items-start justify-start gap-2">
        <h3 className="font-semibold text-xs text-cyber-fg">experience</h3>
        <div></div>
      </section>
    </div>
  );
}
