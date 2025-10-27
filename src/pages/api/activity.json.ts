import type { APIRoute } from "astro";
import { getActivity } from "../../lib/get-activity";

export const GET: APIRoute = async () => {
  const activity = await getActivity();

  return new Response(JSON.stringify({ activity }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
