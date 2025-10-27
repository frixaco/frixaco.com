import { env, serve } from "bun";
import indexpage from "./index.html";
import homepage from "./home.html";
import blogpage from "./blog.html";
import morepage from "./more.html";
import { getActivity } from "./get-activity";

const server = serve({
  routes: {
    // ** HTML imports **
    // Bundle & route index.html to "/". This uses HTMLRewriter to scan
    // the HTML for `<script>` and `<link>` tags, runs Bun's JavaScript
    // & CSS bundler on them, transpiles any TypeScript, JSX, and TSX,
    // downlevels CSS with Bun's CSS parser and serves the result.
    "/": indexpage,
    "/home": homepage,
    "/blog": blogpage,
    "/more": morepage,

    // ** API endpoints ** (Bun v1.2.3+ required)
    "/api/activity": async () => {
      const activity = await getActivity();
      return Response.json(activity);
    },
    "/api/notify": async (req) => {
      const { message } = await req.json();

      const botToken = process.env.TG_BOT_TOKEN;
      const chatId = process.env.TG_CHAT_ID;

      if (!botToken || !chatId) {
        return Response.json(
          { error: "Missing Telegram credentials" },
          { status: 500 },
        );
      }

      try {
        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
            }),
          },
        );

        const data = await response.json();

        if (!data.ok) {
          return Response.json(
            { error: "Failed to send message" },
            { status: 500 },
          );
        }

        return Response.json({ success: true });
      } catch (error) {
        return Response.json(
          { error: "Failed to send notification" },
          { status: 500 },
        );
      }
    },
  },

  // Enable development mode for:
  // - Detailed error messages
  // - Hot reloading (Bun v1.2.3+ required)
  development: Boolean(env.DEV),
});

console.log(`Listening on ${server.url}`);

