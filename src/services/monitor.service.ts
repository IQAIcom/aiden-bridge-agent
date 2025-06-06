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
			this.eventWatcher.startWatching();
			this.fundService.startWatching();
			console.log("🚀 Bridge Monitor initialized successfully");
		} catch (error) {
			console.error("❌ Failed to initialize Bridge Monitor:", error);
			throw error;
		}
	}
}
