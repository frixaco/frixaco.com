import { getActivity } from "@/lib/get-activity";

export async function GET() {
  const activity = await getActivity();

  return Response.json({ activity });
}
