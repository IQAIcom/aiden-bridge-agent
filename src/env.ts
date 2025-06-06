import { config } from "dotenv";
import { parseEther } from "viem";
import { z } from "zod/v4";

config();

export const BRIDGE_ADDRESS = "0x34c0bd5877a5ee7099d0f5688d65f4bb9158bde2";
export const FUNDING_AMOUNT = parseEther("0.01");
export const DEPOSIT_ERC20_METHOD_ID = "0x58a997f6";

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
