import dedent from "dedent";
import { type Address, formatEther } from "viem";
import { BRIDGE_EVENT_ABI } from "../lib/bridge-event.abi.js";
import { BRIDGE_ADDRESS } from "../lib/constants.js";
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

		console.log(dedent`
      🌉 Bridge Detected:
      Token:   ${localToken}
      From:    ${from}
      To:      ${to}
      Amount:  ${formatEther(amount)}
      Tx:      ${log.transactionHash}`);

		return {
			blockNumber: Number(log.blockNumber),
			txHash: log.transactionHash,
			from: from as Address,
			to: to as Address,
			amount: amount as bigint,
			timestamp: log.blockTimestamp,
		};
	}
}
