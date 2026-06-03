import Anthropic from "@anthropic-ai/sdk";
import type { CallModel } from "@/lib/enrich/model";

/** Build a CallModel bound to a specific Anthropic model id. */
export function anthropicModel(model: string, maxTokens = 8000): CallModel {
  return async (system, user) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  };
}

// Overview = fast structural pass (Haiku). Per-tech details = quality pass (Sonnet).
export const callOverviewModel: CallModel = anthropicModel("claude-haiku-4-5", 6000);
export const callDetailsModel: CallModel = anthropicModel("claude-sonnet-4-6", 2000);
