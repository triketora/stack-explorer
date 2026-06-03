import { NextResponse } from "next/server";
import { OverviewRequestSchema } from "@/lib/analyze-contract";
import { runOverview } from "@/lib/enrich/overview";
import { callAnthropic } from "@/lib/enrich/anthropic";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = OverviewRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  try {
    const analysis = await runOverview(parsed.data, callAnthropic);
    return NextResponse.json(analysis);
  } catch {
    // Keep the client's skeleton usable; signal that mapping failed.
    return NextResponse.json({ error: "overview_failed" }, { status: 502 });
  }
}
