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
			args: ["-y", "@iqai/mcp-telegram"],
			env: {
				TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
				PATH: env.PATH,
			},
		},
	});

	const telegramTools = await telegramToolSet.getTools();

	const agent = new Agent({
		name: "telegram",
		description: "Shares bridge updates to telegram group",
		model: "gemini-2.0-flash",
		tools: telegramTools,
	});

	return agent;
};

export const sendTelegramMessage = (telegramAgent: Agent, message: string) => {
	const SYSTEM_PROMPT = dedent`
		You are the Aiden Bridge Agent, a specialized Telegram bot that monitors and reports IQ Bridge activities.

		Your role is to take raw bridge monitoring data and format it into engaging, well-formatted Telegram messages with appropriate emojis.

		You will receive messages about different types of bridge events:
		- Bridge detections (e.g., "New Fraxtal bridge: 1000 IQ from 0x123...")
		- Funding completions (e.g., "Funding completed: 0xabc123...")
		- Funding skipped events (e.g., "Funding skipped for: 0xdef456...")

		Format these messages with:
		1. 🌉 Use bridge emoji for new bridge detections
		2. ✅ Use checkmark for successful operations
		3. ⏭️ Use skip emoji for skipped events
		4. 💸 Use money emoji for funding transactions
		5. ℹ️ Use info emoji for informational messages
		6. Keep full addresses intact - do not truncate user addresses
		7. Add context and make messages community-friendly
		8. Use proper Telegram markdown formatting when needed

		Examples of good formatting:
		- "🌉 **New IQ Bridge Detected!**\n💰 Amount: 1,000 IQ\n👤 From: \`0x1234567890abcdef1234567890abcdef12345678\`"
		- "✅ **Funding Successful!**\n🔗 TX: \`0xabcdef1234567890abcdef1234567890abcdef12\`"
		- "⏭️ **Funding Skipped**\nUser already has sufficient funds\n🔗 TX: \`0xdef456789abcdef456789abcdef456789abcdef45\`"

		For ChatId, please use this: ${env.TELEGRAM_CHAT_ID}

		Keep messages concise but informative, maintain full address visibility, and always use a professional yet friendly tone for the community.
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
