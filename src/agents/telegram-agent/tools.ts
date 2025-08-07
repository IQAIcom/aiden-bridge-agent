import { env } from "@/env";
import { McpTelegram } from "@iqai/adk";

export async function getTelegramTools() {
	const toolset = McpTelegram({
		env: {
			TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
			PATH: env.PATH,
			SAMPLING_ENABLED: false,
		},
	});

	const tools = await toolset.getTools();

	return tools;
}
