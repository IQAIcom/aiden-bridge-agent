import { promises as fs } from "fs";
import dedent from "dedent";
import { type Address, formatEther, parseAbiItem } from "viem";
import { BRIDGE_ADDRESS, IQ_ADDRESSES, MIN_IQ_THRESHOLD } from "../env.js";
import { type BridgeEvent, bridgeEvents } from "./event-emitter.service.js";
import type { WalletService } from "./wallet.service.js";

const BRIDGE_EVENT_ABI_ITEM = parseAbiItem(
	"event ERC20BridgeInitiated(address indexed localToken, address indexed remoteToken, address indexed from, address to, uint256 amount, bytes extraData)",
);

/**
 * Service for handling bridge events from a contract
 * Uses polling with getLogs and simple block checkpointing
 */
export class EventService {
	private isPolling = false;
	private lastProcessedBlock = 0n;
	private pollingInterval = 30000;
	private checkpointFile = "last-block.txt";

	constructor(private walletService: WalletService) {}

	async startWatching() {
		try {
			await this.loadLastBlock();

			console.log(
				`🎯 Starting event polling from block: ${this.lastProcessedBlock}`,
			);
			console.log(`👀 Watching bridge events on ${BRIDGE_ADDRESS}`);
			console.log(`🔄 Polling every ${this.pollingInterval / 1000}s`);

			this.isPolling = true;
			await this.pollForEvents();
			this.startPollingLoop();
		} catch (error) {
			console.error("❌ Failed to start event watching:", error);
			throw error;
		}
	}

	stopWatching() {
		this.isPolling = false;
		console.log("🛑 Event polling stopped");
	}

	private async loadLastBlock(): Promise<void> {
		try {
			const blockData = await fs.readFile(this.checkpointFile, "utf8");
			this.lastProcessedBlock = BigInt(blockData.trim());
			console.log(`✅ Resuming from saved block: ${this.lastProcessedBlock}`);
		} catch {
			// If the file doesn't exist, start from the last 1000 blocks
			const ethClient = this.walletService.getPublicEthClient();
			const currentBlock = await ethClient.getBlockNumber();
			this.lastProcessedBlock = currentBlock - 1000n;
			console.log(
				`📝 First run: starting from block ${this.lastProcessedBlock}`,
			);
			await this.saveLastBlock();
		}
	}

	private async saveLastBlock(): Promise<void> {
		try {
			await fs.writeFile(
				this.checkpointFile,
				this.lastProcessedBlock.toString(),
			);
		} catch (error) {
			console.error("❌ Error saving checkpoint:", error);
		}
	}

	private startPollingLoop() {
		if (!this.isPolling) return;

		setTimeout(async () => {
			try {
				await this.pollForEvents();
			} catch (error) {
				console.error("❌ Error in polling loop:", error);
			}
			this.startPollingLoop();
		}, this.pollingInterval);
	}

	private async pollForEvents() {
		const ethClient = this.walletService.getPublicEthClient();

		try {
			const currentBlock = await ethClient.getBlockNumber();

			if (currentBlock <= this.lastProcessedBlock) {
				return;
			}

			console.log(
				`🔍 Polling blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`,
			);

			const allLogs = await this.getLogsInChunks(
				this.lastProcessedBlock + 1n,
				currentBlock,
			);

			if (allLogs.length > 0) {
				console.log(`📬 Found ${allLogs.length} bridge events`);
				await this.handleBridgeEvents(allLogs);
			}

			this.lastProcessedBlock = currentBlock;
			await this.saveLastBlock();
		} catch (error) {
			console.error("❌ Error polling for events:", error);
		}
	}

	private async getLogsInChunks(
		fromBlock: bigint,
		toBlock: bigint,
	): Promise<any[]> {
		const ethClient = this.walletService.getPublicEthClient();
		const maxBlocksPerChunk = 1000n; // RPC limit
		let allLogs: any[] = [];

		let currentFrom = fromBlock;

		while (currentFrom <= toBlock) {
			const currentTo =
				currentFrom + maxBlocksPerChunk - 1n > toBlock
					? toBlock
					: currentFrom + maxBlocksPerChunk - 1n;

			console.log(`📡 Fetching chunk: blocks ${currentFrom} to ${currentTo}`);

			try {
				const logs = await ethClient.getLogs({
					address: BRIDGE_ADDRESS,
					event: BRIDGE_EVENT_ABI_ITEM,
					fromBlock: currentFrom,
					toBlock: currentTo,
				});

				allLogs = allLogs.concat(logs);
			} catch (error) {
				console.error(
					`❌ Error fetching chunk ${currentFrom}-${currentTo}:`,
					error,
				);
			}

			currentFrom = currentTo + 1n;
		}

		return allLogs;
	}

	private async handleBridgeEvents(logs: any[]): Promise<void> {
		console.log(`🔥 Processing ${logs.length} bridge events`);

		for (const log of logs) {
			try {
				const l1Token = log.args.localToken as Address;
				const amount = log.args.amount as bigint;

				// Filter for IQ token only (matching working production agent)
				if (l1Token.toLowerCase() !== IQ_ADDRESSES.ethereum.toLowerCase()) {
					console.log(`⏭️  Skipping non-IQ token: ${l1Token}`);
					continue;
				}

				console.log("🎯 IQ token bridge detected!");

				const bridgeEvent = await this.processBridgeLog(log);
				if (bridgeEvent) {
					console.log("✅ IQ Bridge event processed and emitted");

					// Check minimum threshold (matching working production version)
					if (amount >= MIN_IQ_THRESHOLD) {
						console.log(
							"🚀 Bridge event meets threshold, emitting for processing",
						);
						bridgeEvents.emit("bridge:detected", bridgeEvent);
					} else {
						console.log(
							`⚠️  Skipping funding: Amount ${formatEther(amount)} IQ is below threshold of ${formatEther(MIN_IQ_THRESHOLD)} IQ`,
						);
						// Emit skipped event for agent to handle notification
						bridgeEvents.emit("funding:skipped", bridgeEvent);
					}
				}
			} catch (error) {
				console.error(
					`❌ Error processing event log: ${(error as Error).message}`,
				);
			}
		}
	}

	private async processBridgeLog(log: any): Promise<BridgeEvent | null> {
		console.log("🔍 Processing bridge log", log);
		const { localToken, from, to, amount } = log.args;

		console.log(dedent`
      🌉 IQ Bridge Detected:
      Token:   ${localToken}
      From:    ${from}
      To:      ${to}
      Amount:  ${formatEther(amount)} IQ
      Block:   ${log.blockNumber}
      Tx:      ${log.transactionHash}`);

		return {
			blockNumber: Number(log.blockNumber),
			txHash: log.transactionHash,
			localToken,
			from: from as Address,
			to: to as Address,
			amount: amount as bigint,
			timestamp: Date.now(),
		};
	}
}
