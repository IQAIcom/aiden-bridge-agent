import { config } from "dotenv";
import { z } from "zod/v4";

config();

export const envSchema = z.object({
	DEBUG: z.stringbool().default(false),
	GOOGLE_API_KEY: z.string(),
	TELEGRAM_CHAT_ID: z.string(),
	TELEGRAM_SERVER_KEY: z.string(),
	TELEGRAM_PROFILE_ID: z.string(),
	TELEGRAM_BOT_TOKEN: z.string(),
	WALLET_PRIVATE_KEY: z.string(),
	PATH: z.string(),
});

export const env = envSchema.parse(process.env);
