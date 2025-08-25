import { formatEther } from "viem";
import { getTelegramAgent } from "./agents/telegram-agent/agent.js";
import { bridgeEvents } from "./services/event-emitter.service.js";
import { MonitorService } from "./services/monitor.service.js";
import { TokenService } from "./services/token.service.js";

async function main() {
	console.log("🚀 Starting IQ Bridge Agent Monitor...");

	// Initialize the AI agent for intelligent notifications
	const agent = await getTelegramAgent();
	const tokenService = new TokenService();

	console.log("🤖 AI Agent initialized for notifications");

	// Set up event listeners for agent to handle notifications
	bridgeEvents.on("bridge:detected", async (event) => {
		try {
			console.log(`📊 Bridge event detected: ${event.txHash}`);
			const formattedAmount = await tokenService.getFormattedTokenAmount(
				event.amount,
				event.localToken,
			);
			console.log(`💰 Processing: ${formattedAmount} from ${event.from}`);

			await agent.ask(
				`New IQ Bridge Detected: ${formattedAmount} from ${event.from} (TX: ${event.txHash})`,
			);
		} catch (error) {
			console.error("❌ Agent failed to send bridge notification:", error);
		}
	});

	bridgeEvents.on("funding:completed", async (event) => {
		try {
			console.log(`💸 Funding completed: ${event.txHash}`);
			await agent.ask(
				`✅ Funding Successful: ${event.txHash} - ${formatEther(event.amount)} ETH to ${event.recipient}`,
			);
		} catch (error) {
			console.error("❌ Agent failed to send funding notification:", error);
		}
	});

	bridgeEvents.on("funding:skipped", async (event) => {
		try {
			console.log(`⏭️ Funding skipped: ${event.txHash}`);
			await agent.ask(
				`ℹ️ Funding Skipped: ${event.txHash} - User already has sufficient funds`,
			);
		} catch (error) {
			console.error("❌ Agent failed to send skipped notification:", error);
		}
	});

	// Initialize and start the monitor
	const monitor = new MonitorService();
	await monitor.initialize();

	console.log(
		"✅ IQ Bridge Agent is now running and watching for IQ bridge events...",
	);
}

main().catch(console.error);
