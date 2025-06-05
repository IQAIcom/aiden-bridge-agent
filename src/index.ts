import {
	getTelegramAgent,
	sendTelegramMessage,
} from "./agents/telegram-agent.js";
import { bridgeEvents } from "./lib/events.js";
import { MonitorService } from "./services/monitor.service.js";

async function main() {
	console.log("🚀 Starting Bridge Monitor...");

	const telegramAgent = await getTelegramAgent();

	// Set up event listeners (for future Telegram bot integration)
	bridgeEvents.on("bridge:detected", (event) => {
		console.log(`📊 Bridge event processed: ${event.txHash}`);
		sendTelegramMessage(
			telegramAgent,
			`Bridge event detected: ${event.txHash}`,
		);
	});

	bridgeEvents.on("funding:completed", (event) => {
		console.log(`💸 Funding completed: ${event.txHash}`);
		sendTelegramMessage(telegramAgent, `Funding completed: ${event.txHash}`);
	});

	bridgeEvents.on("funding:skipped", (event) => {
		console.log(`⏭️ Funding skipped for: ${event.txHash}`);
		sendTelegramMessage(telegramAgent, `Funding skipped for: ${event.txHash}`);
	});

	// Initialize and start the monitor
	const monitor = new MonitorService();
	await monitor.initialize();

	console.log("✅ Bridge Monitor is now running...");
}

main().catch(console.error);
