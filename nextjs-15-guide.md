# Next.js 15: Understanding Server/Client Components, Caching, and PPR

A comprehensive guide from first principles.

---

## Table of Contents

1. [The Foundation: Server vs Client](#the-foundation-server-vs-client)
2. [Server Components](#server-components)
3. [Client Components](#client-components)
4. [Async/Await in Components](#asyncawait-in-components)
5. [The "use cache" Directive](#the-use-cache-directive)
6. [Partial Prerendering (PPR)](#partial-prerendering-ppr)
7. [Practical Patterns](#practical-patterns)
8. [Common Pitfalls](#common-pitfalls)

---

## The Foundation: Server vs Client

### What's the Problem Being Solved?

Traditional React applications run entirely in the browser (client-side). This means:

- The browser downloads JavaScript bundles
- React executes and renders components
- Data fetching happens in the browser
- Users wait for all of this before seeing content

**The fundamental shift:** Next.js 15 allows React components to run on the **server** by default, sending pre-rendered HTML to the browser.

### The Mental Model

Think of your application as having two execution environments:

1. **Server Environment** (Node.js)
   - Has direct database access
   - Can use secret API keys safely
   - Executes during the request or build time
   - Sends HTML to the browser

2. **Client Environment** (Browser)
   - Has user interactions (clicks, typing)
   - Can use browser APIs (localStorage, geolocation)
   - Runs JavaScript for interactivity
   - Limited to what's sent from the server

---

## Server Components

### What Are Server Components?

**Server Components are React components that run exclusively on the server.** They never send JavaScript to the browser.

```tsx
// app/page.tsx
// This is a Server Component by default in Next.js 15

export default async function Page() {
  // This runs on the SERVER
  const data = await fetch("https://api.example.com/data");
  const result = await data.json();

  return (
    <div>
      <h1>Data from Server</h1>
      <p>{result.message}</p>
    </div>
  );
}
```

### Key Characteristics

**✅ What Server Components CAN do:**

- Directly access databases
- Read environment variables (secrets)
- Use async/await at the component level
- Import and use server-only libraries
- Reduce JavaScript bundle size (code doesn't go to browser)

**❌ What Server Components CANNOT do:**

- Use React hooks (`useState`, `useEffect`, etc.)
- Handle user interactions directly (onClick, onChange)
- Access browser APIs (localStorage, window)
- Maintain state across renders

### When to Use Server Components

Use Server Components (the default) when you need to:

- Fetch data from APIs or databases
- Keep sensitive logic on the server
- Reduce JavaScript sent to the browser
- Leverage server resources (CPU, memory)

---

## Client Components

### What Are Client Components?

**Client Components are React components that run in the browser.** They're marked with the `'use client'` directive.

```tsx
// components/Counter.tsx
"use client";

import { useState } from "react";

export function Counter() {
  // This runs in the BROWSER
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### Important: Client Components Also Render on Server First

**This is crucial to understand:** Client Components are rendered on the server for the initial page load, then "hydrated" in the browser to become interactive.

**The process:**

1. Server renders Client Component to HTML
2. HTML is sent to browser (user sees it immediately)
3. JavaScript for the component is downloaded
4. React "hydrates" the HTML (attaches event handlers, initializes state)
5. Component becomes interactive

### Key Characteristics

**✅ What Client Components CAN do:**

- Use all React hooks
- Handle user interactions
- Access browser APIs
- Maintain client-side state
- Use third-party libraries that depend on browser features

**❌ What Client Components CANNOT do:**

- Use async/await at the component level (must use useEffect)
- Directly access server-only resources

### When to Use Client Components

Use Client Components when you need:

- Interactivity (clicks, forms, animations)
- React hooks (useState, useEffect, useContext)
- Browser APIs (localStorage, geolocation, media)
- Event listeners
- State management

---

## Async/Await in Components

### The New Paradigm: Async Server Components

**One of the biggest changes in modern Next.js:** Server Components can be async functions.

```tsx
// This is VALID in Next.js 15 Server Components
export default async function UserProfile({ userId }: { userId: string }) {
  // You can await directly in the component
  const user = await db.users.findUnique({ where: { id: userId } });
  const posts = await db.posts.findMany({ where: { authorId: userId } });

  return (
    <div>
      <h1>{user.name}</h1>
      <PostList posts={posts} />
    </div>
  );
}
```

### Why This Matters

**Traditional React (Client Components):**

```tsx
"use client";

export function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}
```

**Modern Next.js (Server Component):**

```tsx
export default async function UserProfile({ userId }) {
  const user = await fetch(`/api/users/${userId}`).then((r) => r.json());
  return <div>{user.name}</div>;
}
```

**Benefits:**

- Simpler code (no useState, useEffect, loading states)
- Faster initial page load (data fetched on server)
- Automatic error boundaries
- Better SEO (content rendered on server)

### Data Fetching Patterns

**Sequential Fetching (Waterfall):**

```tsx
export default async function Page() {
  const user = await fetchUser(); // Wait for user
  const posts = await fetchPosts(); // Then wait for posts
  // Total time: user time + posts time
}
```

**Parallel Fetching:**

```tsx
export default async function Page() {
  const userPromise = fetchUser();
  const postsPromise = fetchPosts();

  const [user, posts] = await Promise.all([userPromise, postsPromise]);
  // Total time: max(user time, posts time)
}
```

---

## The "use cache" Directive

### What is "use cache"?

**"use cache" is an experimental directive in Next.js 15** that explicitly marks components, functions, or routes as cacheable.

### Enabling "use cache"

First, enable it in your config:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
};

export default nextConfig;
```

### How It Works

When you add `'use cache'` to a component or function, Next.js caches the **return value** based on the **inputs** (props or arguments).

**Caching a Component:**

```tsx
export async function ProductCard({ productId }: { productId: string }) {
  "use cache";

  const product = await db.products.findUnique({
    where: { id: productId },
  });

  return (
    <div>
      <h2>{product.name}</h2>
      <p>${product.price}</p>
    </div>
  );
}
```

**What happens:**

1. First render with `productId="123"`: Fetches from database, caches result
2. Second render with `productId="123"`: Returns cached result (no database query)
3. First render with `productId="456"`: Fetches from database (different cache key)

### Cache Key Generation

The cache key is automatically generated from:

- Build ID (unique per deployment)
- Function/component identifier
- **All serializable arguments/props**

```tsx
// Different cache entries:
<ProductCard productId="123" />  // Cache key: build_id + component_id + "123"
<ProductCard productId="456" />  // Cache key: build_id + component_id + "456"
```

### Caching Functions

You can also cache standalone functions:

```tsx
// lib/data.ts
export async function getUser(userId: string) {
  "use cache";

  console.log("Fetching user from database..."); // Only logs once per userId
  return await db.users.findUnique({ where: { id: userId } });
}

// Used in multiple places:
// app/profile/page.tsx
const user = await getUser("123"); // Fetches and caches

// app/settings/page.tsx
const user = await getUser("123"); // Returns cached value
```

### Cache Revalidation

**Default behavior:** Cache entries revalidate after **15 minutes**.

**Custom revalidation:**

```tsx
import { cacheLife } from "next/cache";

export async function getData() {
  "use cache";
  cacheLife("minutes", 5); // Revalidate after 5 minutes

  return await fetch("https://api.example.com/data").then((r) => r.json());
}
```

**Tag-based revalidation:**

```tsx
import { cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheTag('products') // Tag this cache entry

  return await db.products.findMany()
}

// In a server action or API route:
import { revalidateTag } from 'next/cache'

export async function updateProduct() {
  await db.products.update(...)
  revalidateTag('products') // Invalidate all caches with this tag
}
```

### Important Limitations

**❌ Cannot use with dynamic APIs:**

```tsx
import { cookies } from "next/headers";

export async function Page() {
  "use cache"; // ❌ ERROR!

  const session = cookies().get("session"); // Dynamic API
  return <div>...</div>;
}
```

If you use `cookies()`, `headers()`, `searchParams` (that change), the route becomes dynamic and cannot be fully cached.

---

## Partial Prerendering (PPR)

### What is PPR?

**Partial Prerendering (PPR) is a rendering strategy that combines static and dynamic content in a single route.**

### The Problem PPR Solves

Traditional approaches force you to choose:

**Fully Static:**

- Fast initial load ✅
- Can't personalize content ❌

**Fully Dynamic:**

- Can personalize ✅
- Slower initial load (waits for all data) ❌

**PPR gives you both:**

- Fast initial load (static shell) ✅
- Personalized content (dynamic parts) ✅

### How PPR Works

PPR uses React Suspense to create a "shell" with "holes":

1. **Static shell** (header, layout, skeleton) renders immediately
2. **Dynamic holes** (user-specific content) stream in as they're ready
3. All within a single HTTP request

### Enabling PPR

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    ppr: "incremental",
  },
};
```

Then opt-in per route:

```tsx
// app/page.tsx
export const experimental_ppr = true;

export default function Page() {
  return <div>{/* Static content */}</div>;
}
```

### Using PPR with Suspense

**The key pattern:** Wrap dynamic components in `<Suspense>`:

```tsx
import { Suspense } from "react";

export const experimental_ppr = true;

export default function Dashboard() {
  return (
    <div>
      {/* This is STATIC - renders immediately */}
      <header>
        <h1>Dashboard</h1>
        <nav>...</nav>
      </header>

      {/* This is DYNAMIC - streams in after */}
      <Suspense fallback={<UserSkeleton />}>
        <UserProfile />
      </Suspense>

      {/* This is DYNAMIC - streams in after */}
      <Suspense fallback={<PostsSkeleton />}>
        <RecentPosts />
      </Suspense>
    </div>
  );
}
```

**What happens:**

1. User requests `/dashboard`
2. Server immediately sends HTML with header + skeletons
3. User sees header and skeletons instantly
4. Server starts fetching `<UserProfile>` and `<RecentPosts>` in parallel
5. As each finishes, it streams to the browser and replaces its skeleton
6. All in one HTTP request using streaming

### Dynamic APIs Trigger Dynamic Rendering

Components using these APIs become dynamic:

```tsx
import { cookies } from "next/headers";

async function UserProfile() {
  const sessionToken = cookies().get("session")?.value; // Dynamic API
  const user = await fetchUser(sessionToken);

  return <div>Welcome, {user.name}!</div>;
}
```

When wrapped in Suspense, this becomes a "dynamic hole" in PPR.

### PPR Mental Model

Think of PPR as:

- **Static shell:** What's the same for all users? (layout, navigation, skeletons)
- **Dynamic holes:** What's personalized? (user data, recommendations, location-based content)

```tsx
export default function Page() {
  return (
    <>
      {/* Static: Same for everyone */}
      <Header />
      <Navigation />

      {/* Dynamic: Personalized per user */}
      <Suspense fallback={<Skeleton />}>
        <PersonalizedContent />
      </Suspense>

      {/* Static: Same for everyone */}
      <Footer />
    </>
  );
}
```

---

## Practical Patterns

### Pattern 1: Server Component → Client Component Data Flow

**The most common pattern:** Fetch on server, pass to client for interactivity.

```tsx
// app/page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData();

  return <InteractiveComponent initialData={data} />;
}

// components/InteractiveComponent.tsx (Client Component)
("use client");

export function InteractiveComponent({ initialData }) {
  const [data, setData] = useState(initialData);

  // Client-side updates
  const refresh = async () => {
    const fresh = await fetch("/api/data").then((r) => r.json());
    setData(fresh);
  };

  return <div onClick={refresh}>{data.value}</div>;
}
```

### Pattern 2: Polling with Initial Server Data

**Your specific use case:** Server render + client polling every 10 seconds.

```tsx
// app/page.tsx
export const experimental_ppr = true;

export default function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DataDisplay />
    </Suspense>
  );
}

// components/DataDisplay.tsx (Server Component)
async function DataDisplay() {
  "use cache"; // Cache the initial fetch

  const initialData = await fetchData();

  return <PollingWrapper initialData={initialData} />;
}

// components/PollingWrapper.tsx (Client Component)
("use client");

export function PollingWrapper({ initialData }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await fetch("/api/data").then((r) => r.json());
      setData(updated);
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>{data.title}</h2>
      <p>Last updated: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}
```

**Why this works:**

1. Page loads → PPR sends static shell + skeleton immediately
2. Server fetches initial data (cached with `'use cache'`)
3. Data streams to browser, replacing skeleton
4. Client component hydrates and starts polling interval
5. Every 10 seconds, client fetches fresh data and updates

### Pattern 3: Parallel Data Fetching

```tsx
export default async function Page() {
  // Start all fetches in parallel
  const userPromise = getUser();
  const postsPromise = getPosts();
  const analyticsPromise = getAnalytics();

  // Wait for all together
  const [user, posts, analytics] = await Promise.all([
    userPromise,
    postsPromise,
    analyticsPromise,
  ]);

  return (
    <div>
      <UserCard user={user} />
      <PostsList posts={posts} />
      <AnalyticsDashboard data={analytics} />
    </div>
  );
}
```

### Pattern 4: Composition with Suspense

**Stream different parts independently:**

```tsx
export default function Page() {
  return (
    <div>
      {/* Fast data - shows quickly */}
      <Suspense fallback={<QuickSkeleton />}>
        <QuickData />
      </Suspense>

      {/* Slow data - doesn't block fast data */}
      <Suspense fallback={<SlowSkeleton />}>
        <SlowData />
      </Suspense>
    </div>
  );
}

async function QuickData() {
  const data = await fetchQuick(); // 100ms
  return <div>{data}</div>;
}

async function SlowData() {
  const data = await fetchSlow(); // 2000ms
  return <div>{data}</div>;
}
```

Result: QuickData appears at 100ms, SlowData appears at 2000ms. User sees content progressively.

---

## Common Pitfalls

### 1. Using Hooks in Server Components

```tsx
// ❌ ERROR
export default async function Page() {
  const [count, setCount] = useState(0); // ❌ Can't use hooks
  return <div>{count}</div>;
}

// ✅ CORRECT
export default async function Page() {
  const data = await fetchData();
  return <ClientCounter initialValue={data.count} />;
}
```

### 2. Async Client Components

```tsx
// ❌ ERROR
"use client";
export default async function Page() {
  // ❌ Client components can't be async
  const data = await fetch("/api/data");
  return <div>{data}</div>;
}

// ✅ CORRECT
("use client");
export default function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return <div>{data}</div>;
}
```

### 3. Importing Server Components into Client Components

```tsx
// ❌ ERROR
"use client";
import ServerComponent from "./ServerComponent"; // ❌ Can't import Server into Client

export default function Client() {
  return <ServerComponent />;
}

// ✅ CORRECT: Pass as children
export default function Page() {
  return (
    <ClientWrapper>
      <ServerComponent />
    </ClientWrapper>
  );
}
```

### 4. Using "use cache" with Dynamic APIs

```tsx
// ❌ ERROR
import { cookies } from "next/headers";

export async function Page() {
  "use cache"; // ❌ Can't cache when using dynamic APIs
  const session = cookies().get("session");
  return <div>...</div>;
}

// ✅ CORRECT: Separate cached and dynamic parts
export async function Page() {
  const session = cookies().get("session"); // Dynamic
  const staticData = await getCachedData(); // Cached separately
  return <div>...</div>;
}

async function getCachedData() {
  "use cache";
  return await fetch("...");
}
```

### 5. Forgetting Suspense Boundaries with PPR

```tsx
// ❌ BAD: Dynamic component without Suspense
export const experimental_ppr = true;

export default function Page() {
  return (
    <div>
      <Header />
      <DynamicUserData /> {/* ❌ Blocks entire route */}
    </div>
  );
}

// ✅ GOOD: Wrap dynamic in Suspense
export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DynamicUserData /> {/* ✅ Streams independently */}
      </Suspense>
    </div>
  );
}
```

---

## Summary

### Key Takeaways

1. **Server Components (default):**
   - Can be async
   - Fetch data directly
   - Don't send JavaScript to browser
   - Can't use hooks or interactivity

2. **Client Components (`'use client'`):**
   - Can use hooks and interactivity
   - Render on server first, then hydrate
   - Can't be async (use useEffect instead)

3. **"use cache":**
   - Explicitly cache component/function output
   - Cache key based on inputs (props/args)
   - Default 15min revalidation
   - Can't use with dynamic APIs

4. **PPR (Partial Prerendering):**
   - Combines static shell + dynamic holes
   - Uses Suspense to define boundaries
   - Streams content as it's ready
   - Single HTTP request

5. **The Golden Pattern:**
   - Fetch on server (fast, secure, cached)
   - Pass to client for interactivity
   - Use Suspense for loading states
   - Combine for optimal UX

### Mental Model Checklist

When building a component, ask:

- **Does it need interactivity?** → Client Component
- **Does it fetch data?** → Server Component (if possible)
- **Should it be cached?** → Add `'use cache'`
- **Is it slow to fetch?** → Wrap in Suspense
- **Is the route mixed static/dynamic?** → Enable PPR

This mental model will guide you to the right pattern for any scenario.
