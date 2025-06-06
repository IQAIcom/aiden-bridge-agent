import dedent from "dedent";
import { type Address, formatEther } from "viem";
import { BRIDGE_ADDRESS } from "../env.js";
import { type BridgeEvent, bridgeEvents } from "./event-emitter.service.js";
import type { WalletService } from "./wallet.service.js";

export const BRIDGE_EVENT_ABI = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "localToken",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "remoteToken",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address",
			},
			{
				indexed: false,
				internalType: "address",
				name: "to",
				type: "address",
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "amount",
				type: "uint256",
			},
			{
				indexed: false,
				internalType: "bytes",
				name: "extraData",
				type: "bytes",
			},
		],
		name: "ERC20BridgeInitiated",
		type: "event",
	},
] as const;

/**
 * Service for handling bridge events from a blockchain contract
 * Watches for ERC20 bridge events and processes them
 */
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
