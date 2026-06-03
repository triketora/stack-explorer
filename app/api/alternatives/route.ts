import { NextResponse } from "next/server";
import { AlternativesRequestSchema } from "@/lib/analyze-contract";
import { generateAlternatives } from "@/lib/enrich/alternatives";
import { callAnthropic } from "@/lib/enrich/anthropic";

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
    const alts = await generateAlternatives(parsed.data.tech, parsed.data.contextSummary, callAnthropic);
    return NextResponse.json({ alts });
  } catch {
    return NextResponse.json({ error: "alternatives_failed" }, { status: 502 });
  }
}
