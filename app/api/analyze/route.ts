import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, type AnalyzeRequest } from "@/lib/analyze-contract";
import { detect } from "@/lib/detect";
import { enrich, type CallModel } from "@/lib/enrich";
import { callAnthropic } from "@/lib/enrich/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function analyzeRequest(body: AnalyzeRequest, callModel: CallModel) {
  return enrich(body, detect(body.manifests), callModel);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const analysis = await analyzeRequest(parsed.data, callAnthropic);
  return NextResponse.json(analysis);
}
