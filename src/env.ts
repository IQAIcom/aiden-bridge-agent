import {
	type LanguageModelV1,
	createOpenRouter,
} from "@openrouter/ai-sdk-provider";
import { config } from "dotenv";
import { parseEther } from "viem";
import { z } from "zod/v4";

config();

export const BRIDGE_ADDRESS = "0x34c0bd5877a5ee7099d0f5688d65f4bb9158bde2";
export const FUNDING_AMOUNT = parseEther("0.01");
export const DEPOSIT_ERC20_METHOD_ID = "0x58a997f6";

export const envSchema = z.object({
	DEBUG: z.stringbool().default(false),
	TELEGRAM_CHAT_ID: z.string(),
	TELEGRAM_TOPIC_ID: z.string(),
	TELEGRAM_BOT_TOKEN: z.string(),
	WALLET_PRIVATE_KEY: z.string(),
	PATH: z.string(),
	LLM_MODEL: z.string().default("gemini-2.5-flash"),
	OPEN_ROUTER_KEY: z
		.string()
		.optional()
		.describe("When given, agents use open-router endpoint instead"),
});

export const env = envSchema.parse(process.env);
export const model: string | LanguageModelV1 = (() => {
	if (env.OPEN_ROUTER_KEY) {
		console.log("🚀 AGENT WILL USE OPENROUTER 🚀");
		const openrouter = createOpenRouter({
			apiKey: env.OPEN_ROUTER_KEY,
		});
		return openrouter(env.LLM_MODEL);
	}
	return env.LLM_MODEL;
})();
