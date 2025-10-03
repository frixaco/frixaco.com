import Link from "next/link";

const entries = [
  {
    id: "1",
    title: "How I use AI",
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
    <div className="flex flex-col gap-10 text-cyber-grey">
      <Link href="/blog/astro-thoughts">
        <article className="flex relative group text-sm gap-12">
          <div className="flex flex-col flex-1 cursor-pointer gap-1">
            <h3 className="line-clamp-1 text-cyber-fg truncate">
              Astro Thoughts
            </h3>
            <p className="">123</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-nowrap">lakjdakldj</span>
            <span className="text-xs text-nowrap">255 words</span>
            <span className="text-xs text-nowrap">12 min read</span>
          </div>

          <div className="absolute top-0 bottom-0 -left-4 w-0.5 scale-y-0 group-hover:scale-y-100 origin-center group-hover:delay-100 transition-transform duration-300 bg-cyber-grey"></div>
          {/* <span className="absolute left-0 bottom-0 -translate-x-5/6 -translate-y-1 -rotate-90 text-cyber-grey text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:delay-100"> */}
          {/*   255 */}
          {/* </span> */}
        </article>
      </Link>

      {entries.map((e) => (
        <article key={e.id} className="flex relative group text-sm gap-12">
          <div className="flex flex-col flex-1 cursor-pointer gap-1">
            <h3 className="line-clamp-1 text-cyber-fg truncate">{e.title}</h3>
            <p className="">{e.description}</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-nowrap">{e.date}</span>
            <span className="text-xs text-nowrap">255 words</span>
            <span className="text-xs text-nowrap">12 min read</span>
          </div>

          <div className="absolute top-0 bottom-0 -left-4 w-0.5 scale-y-0 group-hover:scale-y-100 origin-center group-hover:delay-100 transition-transform duration-300 bg-cyber-grey"></div>
          {/* <span className="absolute left-0 bottom-0 -translate-x-5/6 -translate-y-1 -rotate-90 text-cyber-grey text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:delay-100"> */}
          {/*   255 */}
          {/* </span> */}
        </article>
      ))}
    </div>
  );
}
