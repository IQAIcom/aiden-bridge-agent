import { env } from "../env.js";
import { EventService } from "./event.service.js";
import { FundService } from "./fund.service.js";
import { WalletService } from "./wallet.service.js";

/**
 * Manages monitoring and synchronization for a blockchain bridge
 * Initializes event and fund watching services using a wallet
 */
export class MonitorService {
	private eventWatcher: EventService;
	private fundService: FundService;

	constructor() {
		const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

		this.eventWatcher = new EventService(walletService);
		this.fundService = new FundService(walletService);

		console.log("🔧 Bridge Monitor initialized and ready");
	}

	async initialize(): Promise<void> {
		try {
			console.log("🚀 IQ Bridge Monitor starting up...");

			// Start services
			await this.eventWatcher.startWatching();
			this.fundService.startWatching();

			console.log("🚀 Bridge Monitor initialized successfully");
			console.log(
				"✅ IQ Bridge Monitor is now active and watching for IQ bridge events",
			);
		} catch (error) {
			console.error("❌ Failed to initialize Bridge Monitor:", error);
			console.error(
				`❌ Bridge Monitor failed to start: ${(error as Error).message}`,
			);
			throw error;
		}
	}

	stop(): void {
		this.eventWatcher.stopWatching();
		console.log("🛑 Bridge Monitor stopped");
	}
}
