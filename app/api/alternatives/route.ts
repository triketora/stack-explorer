import { NextResponse } from "next/server";
import { AlternativesRequestSchema } from "@/lib/analyze-contract";
import { generateDetails } from "@/lib/enrich/alternatives";
import { callDetailsModel } from "@/lib/enrich/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = AlternativesRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  try {
    const details = await generateDetails(parsed.data.tech, parsed.data.contextSummary, callDetailsModel);
    return NextResponse.json(details);   // { rationale, alts }
  } catch {
    return NextResponse.json({ error: "details_failed" }, { status: 502 });
  }
}
