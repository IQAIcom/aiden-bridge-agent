import dedent from "dedent";
import { type Address, formatEther } from "viem";
import { BRIDGE_EVENT_ABI } from "../lib/bridge-event.abi.js";
import {
	BRIDGE_ADDRESS,
	IQ_TOKEN_ETHEREUM_ADDRESS,
	MIN_IQ_THRESHOLD,
} from "../lib/constants.js";
import { type BridgeEvent, bridgeEvents } from "../lib/events.js";
import type { WalletService } from "./wallet.service.js";

export class EventService {
	constructor(private walletService: WalletService) {}

	async startWatching() {
		const ethClient = this.walletService.getPublicEthClient();

		ethClient.watchContractEvent({
			address: BRIDGE_ADDRESS,
			abi: BRIDGE_EVENT_ABI,
			eventName: "ERC20BridgeInitiated",
			onLogs: (logs) => this.handleBridgeEvents(logs),
			fromBlock: 22032073n,
		});

		console.log(`👀 Watching bridge events on ${BRIDGE_ADDRESS}`);
	}

	private async handleBridgeEvents(logs: any[]): Promise<void> {
		console.log(`📥 Received ${logs.length} bridge event(s)`);

		for (const log of logs) {
			try {
				const bridgeEvent = await this.processBridgeLog(log);
				if (bridgeEvent) {
					bridgeEvents.emit("bridge:detected", bridgeEvent);
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
