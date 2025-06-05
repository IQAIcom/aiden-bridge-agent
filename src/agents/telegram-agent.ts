import { Agent, McpToolset } from "@iqai/adk";
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
		tools: [...telegramTools],
	});

	return agent;
};
