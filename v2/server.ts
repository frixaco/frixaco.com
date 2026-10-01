import { join } from "node:path";

export function staticHandler(files: Map<string, Bun.BunFile>) {
  return (request: Request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }
    let path: string;
    try {
      path = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const file = files.get(
      path === "/" || path === "/home" ? "/index.html" : path,
    );
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(request.method === "HEAD" ? null : file, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": String(file.size),
        "Cache-Control": path.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  };
}

if (import.meta.main) {
  const root = join(import.meta.dir, "dist");
  if (!(await Bun.file(join(root, "index.html")).exists()))
    throw new Error("Run bun run build before bun start.");
  const files = new Map<string, Bun.BunFile>();
  for await (const name of new Bun.Glob("**/*").scan({
    cwd: root,
    onlyFiles: true,
  }))
    files.set(`/${name}`, Bun.file(join(root, name)));
  const server = Bun.serve({
    port: process.env.PORT || 8080,
    hostname: process.env.HOST || "0.0.0.0",
    fetch: staticHandler(files),
  });
  console.log(`Portfolio running at ${server.url}`);
}
