export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="prose-invert prose-img:mx-auto prose-headings:pb-4 prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-a:hover:text-pink-500 prose-a:underline">
      {children}
    </div>
  );
}
