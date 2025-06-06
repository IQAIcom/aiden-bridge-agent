import { Agent, McpToolset } from "@iqai/adk";
import dedent from "dedent";
import { env } from "../env";

export const getTelegramAgent = async () => {
	const telegramToolSet = new McpToolset({
		name: "Telegram MCP Client",
		description: "Client for Telegram notifications",
		debug: env.DEBUG,
		retryOptions: { maxRetries: 2, initialDelay: 200 },
		transport: {
			mode: "stdio",
			command: "npx",
			args: [
				"-y",
				"@smithery/cli@latest",
				"run",
				"@NexusX-MCP/telegram-mcp-server",
				"--key",
				env.TELEGRAM_SERVER_KEY,
				"--profile",
				env.TELEGRAM_PROFILE_ID,
			],
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID,
				PATH: env.PATH,
			},
		},
	});

	const telegramTools = await telegramToolSet.getTools();

	const agent = new Agent({
		name: "Telegram Agent",
		description: "Shares bridge updates to telegram group",
		model: "gemini-2.0-flash",
		tools: telegramTools,
	});

	return agent;
};

export const sendTelegramMessage = (telegramAgent: Agent, message: string) => {
	const SYSTEM_PROMPT = dedent`
		You are the Aiden Bridge Agent, a specialized Telegram bot that monitors and reports IQ Bridge activities.

		Your role is to forward bridge monitoring messages to the Telegram group with proper formatting and context.

		The messages you receive will contain bridge events such as:
		- 🌉 IQ Bridge detections with token amounts and user addresses
		- ✅ Successful funding operations with FRAX amounts
		- ℹ️ Informational messages about users who already have sufficient funds
		- ⏭️ Skipped funding events
		- 💸 Completed funding transactions

		When forwarding messages:
		1. Preserve all emojis and formatting exactly as provided
		2. Maintain the structure and readability of the original message
		3. Forward the complete message without modification
		4. Ensure proper Telegram formatting for addresses and transaction hashes

		You are monitoring the IQ Bridge system and keeping the community informed about bridge activities and funding operations.
	`;

	telegramAgent.run({
		messages: [
			{
				role: "system",
				content: SYSTEM_PROMPT,
			},
			{
				role: "user",
				content: message,
			},
		],
	});
};
