import dedent from "dedent";
import { type Address, formatEther } from "viem";
import { BRIDGE_EVENT_ABI } from "../lib/bridge-event.abi.js";
import {
	BRIDGE_ADDRESS,
	IQ_TOKEN_ETHEREUM_ADDRESS,
	MIN_IQ_THRESHOLD,
} from "../lib/constants.js";
import type { WalletService } from "./wallet.js";

export interface BridgeEvent {
	blockNumber: number;
	txHash: string;
	from: Address;
	to: Address;
	amount: bigint;
	timestamp: number;
}

export class EventService {
	isWatching = false;
	private unsubscribe: (() => void) | null = null;

	constructor(
		private walletService: WalletService,
		private onBridgeEvent: (event: BridgeEvent) => void,
	) {}

	async startWatching(): Promise<void> {
		const ethClient = this.walletService.getPublicEthClient();

		this.unsubscribe = ethClient.watchContractEvent({
			address: BRIDGE_ADDRESS,
			abi: BRIDGE_EVENT_ABI,
			eventName: "ERC20BridgeInitiated",
			onLogs: (logs) => this.handleBridgeEvents(logs),
			fromBlock: 22032073n,
		});

		this.isWatching = true;

		console.log(`👀 Watching bridge events on ${BRIDGE_ADDRESS}`);
	}

	async stopWatching(): Promise<void> {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
			this.isWatching = false;
		}
	}

	private async handleBridgeEvents(logs: any[]): Promise<void> {
		console.log(`📥 Received ${logs.length} bridge event(s)`);

		for (const log of logs) {
			try {
				const bridgeEvent = await this.processBridgeLog(log);
				if (bridgeEvent) {
					this.onBridgeEvent(bridgeEvent);
				}
			} catch (error) {
				console.error("❌ Error processing bridge event:", error);
			}
		}
	}

	private async processBridgeLog(log: any): Promise<BridgeEvent | null> {
		const { localToken, from, to, amount } = log.args;

		// Only process IQ token bridges
		if (localToken.toLowerCase() !== IQ_TOKEN_ETHEREUM_ADDRESS.toLowerCase()) {
			return null;
		}

		console.log(dedent`
      🌉 IQ Bridge Detected:
      From:    ${from}
      To:      ${to}
      Amount:  ${formatEther(amount)} IQ
      Tx:      ${log.transactionHash}`);

		// Check if amount meets threshold
		if (amount < MIN_IQ_THRESHOLD) {
			console.log(
				`⏭️ Amount below threshold (${formatEther(MIN_IQ_THRESHOLD)} IQ), skipping`,
			);
			return null;
		}

		return {
			blockNumber: log.blockNumber,
			txHash: log.transactionHash,
			from: from as Address,
			to: to as Address,
			amount: amount as bigint,
			timestamp: log.blockTimestamp,
		};
	}
}
