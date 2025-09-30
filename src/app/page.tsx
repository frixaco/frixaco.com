const sections = ["about", "projects", "experience"];

export default function Page() {
  return (
    <div className="flex flex-col gap-10 text-sm text-cyber-grey">
      {sections.map((s) => (
        <section
          key={s}
          className="flex flex-col items-start justify-start gap-2"
        >
          <h3 className="font-semibold text-xs text-cyber-bg-highlight">{s}</h3>
          <p className="">
            Lorem ipsum dolor sit, amet consectetur adipisicing elit. Veritatis
            eveniet, libero iure nobis animi tempora porro excepturi cumque
            asperiores corrupti debitis recusandae temporibus eum aspernatur
            odit eligendi expedita perspiciatis perferendis?
          </p>
        </section>
      ))}
    </div>
  );
}
