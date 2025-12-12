import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  p: ({ children }) => <p className="mb-6">{children}</p>,
  pre: ({ children, ...props }) => (
    <pre
      className="bg-cyber-bg-alt mx-auto my-6 max-w-2xl overflow-x-auto rounded-lg p-4"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, ...props }) => {
    // Check if this is inline code (not inside a pre block)
    // rehype-pretty-code adds data-language to code blocks
    const isInline = !("data-language" in props);
    if (isInline) {
      return (
        <code
          className="bg-cyber-bg-alt text-cyber-pink rounded px-1.5 py-0.5 text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <code {...props}>{children}</code>;
  },
  blockquote: ({ children }) => (
    <blockquote className="border-cyber-pink bg-cyber-bg-alt mx-auto my-6 max-w-2xl border-l-4 py-2 pl-4 italic">
      {children}
    </blockquote>
  ),
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="mx-auto my-6 block max-w-2xl rounded-lg"
      alt=""
      {...props}
    />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
