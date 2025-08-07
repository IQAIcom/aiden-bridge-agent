import { getTelegramAgent } from "./agents/telegram-agent/agent.js";
import { bridgeEvents } from "./services/event-emitter.service.js";
import { MonitorService } from "./services/monitor.service.js";
import { TokenService } from "./services/token.service.js";

async function main() {
	console.log("🚀 Starting Bridge Monitor...");

	const agent = await getTelegramAgent();
	const tokenService = new TokenService();

	// Set up event listeners (for future Telegram bot integration)
	bridgeEvents.on("bridge:detected", async (event) => {
		console.log(`📊 Bridge event processed: ${event.txHash}`);
		const formattedAmount = await tokenService.getFormattedTokenAmount(
			event.amount,
			event.localToken,
		);
		await agent.ask(
			`New Fraxtal bridge: ${formattedAmount} from ${event.from}`,
		);
	});

	bridgeEvents.on("funding:completed", async (event) => {
		console.log(`💸 Funding completed: ${event.txHash}`);
		await agent.ask(`Funding completed: ${event.txHash}`);
	});

	bridgeEvents.on("funding:skipped", async (event) => {
		console.log(`⏭️ Funding skipped for: ${event.txHash}`);
		await agent.ask(`Funding skipped for: ${event.txHash}`);
	});

	// Initialize and start the monitor
	const monitor = new MonitorService();
	await monitor.initialize();

	console.log("✅ Bridge Monitor is now running...");
}

main().catch(console.error);
