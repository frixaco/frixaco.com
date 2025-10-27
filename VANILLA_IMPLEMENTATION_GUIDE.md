# Comprehensive Guide: Building a Vanilla JS/HTML Multi-Page Application with Bun

## 1. Project Initialization & Tooling

**Setting Up the Bun Project**

Initialize a new Bun project and configure it as an ES module by setting `"type": "module"` in package.json. Install three key dependencies: PostCSS for CSS processing, Tailwind CSS v4 (the newest version with native PostCSS support), and the Tailwind PostCSS plugin. For development, include Bun types and TypeScript.

**Package Scripts Strategy**

Create two npm scripts: a `dev` script that uses Bun's `--watch` flag to automatically restart the server on file changes (pointing to src/server.ts), and a `build` script for production bundling. The dev script enables a rapid development workflow where any server-side changes are immediately reflected.

**TypeScript Configuration Principles**

Configure TypeScript to target ES2022 with ES2022 modules and bundler-style module resolution. This modern configuration aligns with Bun's native capabilities. Include DOM types for browser-side TypeScript files while maintaining strict type checking. Set the include path to src/**/* to encompass all source files.

**Tailwind v4 Custom Theme Architecture**

Tailwind v4 uses a fundamentally different approach than v3. Instead of a tailwind.config.js file, all configuration lives directly in CSS using the `@theme` directive. Define your color palette as CSS custom properties (e.g., `--color-cyber-bg`, `--color-cyber-pink`) within `@theme` blocks.

For dark mode support, use a custom variant strategy: define `@custom-variant dark (&:is(.dark *))` at the top of your styles file. Then create a `.dark` class selector where you redefine all color variables with their dark mode values. This allows toggling between light and dark by adding/removing the `dark` class on the document root element.

**Important Custom Utilities**

Use the `@layer utilities` directive to define custom animations and interactive effects. For example, define keyframe animations that can be applied on hover states. These utilities integrate seamlessly with Tailwind's utility-first approach while giving you complete control over custom behaviors.

## 2. The Bun Server Architecture (src/server.ts)

**Core Server Pattern**

Use `Bun.serve()` to create a development server with a single async `fetch` handler. This handler receives every HTTP request and must return appropriate responses based on the URL pathname. Extract the pathname from the request URL and use it for routing logic.

**Multi-Route HTML Serving Strategy**

Implement explicit pathname matching for each route. For the root path (/), serve index.html. For /blog, serve blog.html. For /more, serve more.html. For dynamic blog posts (/blog/:slug), serve blog-post.html regardless of the slug—the client-side JavaScript will handle parsing the slug and rendering the appropriate content.

**On-Demand CSS Compilation Pipeline**

When a request comes in for /styles.css, read the source CSS file, process it through PostCSS with the Tailwind plugin, and return the compiled CSS with the appropriate content-type header. This happens on every request in development, ensuring changes to your CSS or Tailwind classes are immediately reflected without a build step.

The PostCSS processing requires both a `from` path (source file) and a `to` path (output name) for proper source map generation and plugin behavior, even though you're serving the result directly without writing to disk.

**Dynamic TypeScript Bundling**

Create a mapping object that associates public JS paths (like /app.js) with source TypeScript files (like app.ts). When a request matches a .js extension and exists in your mapping, use `Bun.build()` to compile the TypeScript file on-the-fly.

Configure Bun.build with the appropriate entrypoint, target set to 'browser', and format set to 'esm'. Check if the build succeeded, and if so, extract the first output and stream its contents back with an application/javascript content-type. Handle build failures gracefully by logging errors and returning a 500 status.

**Static File Serving Security**

For all other requests, attempt to serve files from a public directory. Crucially, verify that the resolved file path starts with your public directory path to prevent directory traversal attacks. Use `await file.exists()` to check file existence before serving. If no route matches, return a 404.

**Path Resolution Best Practices**

Use `fileURLToPath` and `dirname` from Node's path utilities to get the current directory in an ES module context (since `__dirname` isn't available). Use `join()` for all path concatenation to ensure cross-platform compatibility.

## 3. HTML Structure & Page Entry Points

**Single-Template Architecture**

Each HTML page should follow an identical structure: a semantic HTML skeleton with a header containing navigation and a theme toggle, a main content area, and script tag loading the page-specific JavaScript bundle. The header remains consistent across all pages to provide a unified navigation experience.

**Strategic ID Placement**

Instead of rendering entire sections in HTML, place empty div elements with specific IDs (like `#activity`, `#socials`, `#projects`, `#experience`, `#theme-toggle`) where dynamic content will be mounted. This creates a clean separation between static structure and dynamic content.

**Page-Specific Entry Points**

Create a separate TypeScript entry file for each HTML page. The index.html page loads app.ts, the blog page loads blog.ts, and the blog post page loads blog-post.ts. Each entry file imports and calls only the render functions needed for that specific page.

For example, the home page might render activity, socials, projects, experience, and theme toggle components, while the blog post page only needs the theme toggle and blog post content renderer.

**Shared vs. Page-Specific Components**

The theme toggle component is used on every page, so it's imported by all entry files. Other components are page-specific. This modular approach reduces the JavaScript bundle size for each page since users only download the code they need.

**Header Sticky Positioning**

Apply sticky positioning to the header section so it remains visible during scrolling. Use background color classes that match the page background to prevent content from showing through the sticky header.

## 4. Component Conversion Strategy (React to Vanilla TS)

**The Render Function Pattern**

Each component should be a named function (like `renderThemeToggle`) that accepts a single parameter: the container HTMLElement where it will be rendered. This function is responsible for both creating the DOM structure and attaching all necessary event listeners.

**Initial DOM Creation with Template Literals**

Use template literals to define the component's HTML structure as a string, then set `container.innerHTML` to this string. Template literals are ideal because they allow multi-line strings and embedded expressions. Include all necessary Tailwind classes, data attributes for event targeting, and aria attributes for accessibility.

**Critical Anti-Pattern: Avoiding Re-renders**

Unlike React, which can efficiently re-render components, replacing innerHTML destroys and recreates all DOM elements, breaking CSS transitions and animations in progress. After the initial innerHTML assignment, never replace the entire innerHTML again. Instead, query specific elements and update only their classes, attributes, or text content.

**State Management Without Frameworks**

Declare state variables (like the current theme) as local variables within your render function's scope. These create a closure that persists for event handlers. When state changes, update localStorage for persistence and selectively update only the DOM elements that depend on that state.

**Event Listener Attachment Pattern**

After setting innerHTML, use `container.querySelector()` or `container.querySelectorAll()` to select elements that need interactivity. Attach event listeners directly to these elements. Use data attributes (like `data-theme="dark"`) to store metadata that event handlers can read via `getAttribute()`.

**Selective Class Updates for Animations**

When a state change requires visual updates (like repositioning animated elements), compute the new class string and replace the entire className property. This is more efficient than manipulating classList for multiple simultaneous class changes. Store all static classes along with the dynamic class in a template string.

**System Preference Integration**

Use `window.matchMedia('(prefers-color-scheme: dark)')` to detect the user's system theme preference. Add an event listener to the media query to react when the user changes their system theme. If the user has selected "system" mode, apply the appropriate theme based on the current system preference.

**Initialization Sequence**

After defining all helper functions and event listeners, call your initialization logic at the end of the render function. This typically means reading from localStorage, applying the initial theme, and setting up any polling or media query listeners.

## 5. Implementing Core Features

**Global Keyboard Shortcut Architecture**

Add a single `keydown` event listener to the document object. In the handler, first call a utility function that determines whether the keystroke should be ignored (if it occurred in an input field, involved modifier keys, or is a repeated key event).

**Input Detection Logic**

The ignore function should check if the event target is or is within an editable element (input, textarea, contenteditable). Use `closest()` to check if the target or any ancestor matches specific selectors. Also ignore events where metaKey, ctrlKey, altKey, isComposing, or repeat properties are true.

**Shortcut Routing Pattern**

After filtering out ignored keys, use a switch statement or if-else chain on `event.key` to route specific keys to specific actions. For navigation shortcuts, use `window.location.href` to navigate to different pages. Prevent default browser behavior when a shortcut is handled.

**Activity Polling Implementation**

For the activity component, set up a `setInterval()` that runs at a reasonable frequency (e.g., every 60 seconds). In the interval callback, fetch fresh data from your API endpoint. When the data arrives, update only the specific DOM elements displaying that data—don't re-render the entire component.

Store the interval ID in a variable so you can potentially clear it later if needed (though in this architecture, intervals typically run for the page's lifetime).

**Transition-Friendly Updates**

When updating content that has CSS transitions, ensure you're only changing the properties that need to change. For example, if an activity badge changes from green to yellow, update only its background color class rather than replacing the entire element.

**Building Lists Dynamically**

For lists of items (like projects or experience entries), it's acceptable to build the entire list HTML using map() and join(), then set innerHTML once during initial render. For truly dynamic lists that change after page load, consider maintaining the list state in a variable and implementing an update function that diffs the old and new lists.

## 6. Multi-Page Content Handling

**Static Content Pages Strategy**

For pages with purely static content (like an "about me" or "more" page), write the entire content directly in the HTML file within the appropriate semantic tags. Use Tailwind classes for styling. No JavaScript rendering is required—just load the theme toggle component for consistent UX.

**Dynamic Content Data Structure**

For dynamic content like blog posts, create a data structure in your TypeScript file that maps slugs to post objects. Each post object should contain metadata (title, date) and content (as an HTML string). This structure serves as your content database.

**URL Slug Extraction**

Use `window.location.pathname` to get the current URL path, then use string methods like `split('/')` and `pop()` to extract the slug portion. Handle edge cases like trailing slashes or empty strings with a fallback default.

**Conditional Content Rendering**

After extracting the slug, look it up in your data structure. If found, render the post by setting the content container's innerHTML to a template that includes the post title, metadata, and content. If not found, render a "not found" message with a link back to the blog listing page.

**Content HTML Formatting**

Store blog post content as HTML strings within your data object. Use semantic HTML tags (h2, p, article) and apply Tailwind typography classes. For embedded media like images, use proper src paths that resolve to your public directory.

**SEO Considerations**

For better SEO, you'd eventually want to pre-render blog posts at build time or use server-side rendering. In this vanilla approach, search engines will see only the empty blog-post.html template. Consider this a prototype—production applications might generate static HTML files for each post during a build step.

**Navigation Between Posts**

Implement previous/next navigation by determining the current post's position in your posts array and rendering links to adjacent posts. Store posts in an array (not just a Record) to maintain order, or add an index/order property to each post object.
