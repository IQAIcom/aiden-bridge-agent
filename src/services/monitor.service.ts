import { env } from "../env.js";
import { type BridgeEvent, EventService } from "./event.service.js";
import { FundService, type FundingEvent } from "./fund.service.js";
import { WalletService } from "./wallet.js";

export class MonitorService {
	private eventWatcher: EventService;
	private fundService: FundService;

	constructor(opts: {
		onFundingComplete: (event: FundingEvent) => void;
		onSufficientBalanceSkip: (event: BridgeEvent) => void;
		onBridgeEvent: (event: BridgeEvent) => void;
	}) {
		const walletService = new WalletService(env.WALLET_PRIVATE_KEY);

		this.eventWatcher = new EventService(walletService, opts.onBridgeEvent);
		this.fundService = new FundService(
			walletService,
			opts.onFundingComplete,
			opts.onSufficientBalanceSkip,
		);

		console.log("🔧 Bridge Monitor initialized and ready");
	}

	async initialize(): Promise<void> {
		try {
			await this.startMonitoring();
			console.log("🚀 Bridge Monitor initialized successfully");
		} catch (error) {
			console.error("❌ Failed to initialize Bridge Monitor:", error);
			throw error;
		}
	}

	async startMonitoring(): Promise<void> {
		if (this.eventWatcher.isWatching) {
			console.log("⚠️ Bridge monitor is already running");
			return;
		}

		await this.eventWatcher.startWatching();
		console.log("👀 Bridge monitoring started");
	}

	async stopMonitoring(): Promise<void> {
		if (!this.eventWatcher.isWatching) return;

		await this.eventWatcher.stopWatching();
		console.log("🛑 Bridge monitoring stopped");
	}
}
