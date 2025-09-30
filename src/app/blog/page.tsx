const entries = [
  {
    id: "1",
    title:
      "How I use AIHow I use AIHow I use AIHow I use AIHow I use AIHow I use AIHow I use AIHow I use AIHow I use AI",
    description:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Debitis, repellendus.",
    date: "Nov 25, 2025",
  },
  {
    id: "2",
    title: "Next.js - The Framework",
    description:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Debitis, repellendus.",
    date: "Mar 1, 2024",
  },
  {
    id: "3",
    title: "React State Management Tutorial",
    description:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Debitis, repellendus.",
    date: "Mar 1, 2024",
  },
];

export default function Page() {
  return (
    <div className="flex flex-col gap-8 text-cyber-grey">
      {entries.map((e) => (
        <article
          key={e.id}
          className="flex flex-col relative group cursor-pointer text-sm"
        >
          <span className="text-cyber-bg-highlight text-xs">{e.date}</span>
          <h3 className="font-semibold line-clamp-1 truncate">{e.title}</h3>
          <p className="text-xs">{e.description}</p>

          <div className="absolute top-0 bottom-0 -left-4 w-0.5 scale-y-0 group-hover:scale-y-100 origin-center group-hover:delay-100 transition-transform duration-300 bg-cyber-grey"></div>
          {/* <span className="absolute left-0 bottom-0 -translate-x-5/6 -translate-y-1 -rotate-90 text-cyber-grey text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:delay-100"> */}
          {/*   255 */}
          {/* </span> */}
        </article>
      ))}
    </div>
  );
}
