import { EventEmitter } from "node:events";
import type { Address } from "viem";

export interface BridgeEvent {
	blockNumber: number;
	txHash: string;
	from: Address;
	to: Address;
	amount: bigint;
	timestamp: number;
}

export interface FundingEvent {
	recipient: Address;
	amount: bigint;
	txHash: string;
	timestamp: number;
}

export interface BridgeEvents {
	"bridge:detected": (event: BridgeEvent) => void;
	"funding:completed": (event: FundingEvent) => void;
	"funding:skipped": (event: BridgeEvent) => void;
}

export class BridgeEventEmitter extends EventEmitter {
	emit<K extends keyof BridgeEvents>(
		event: K,
		...args: Parameters<BridgeEvents[K]>
	): boolean {
		return super.emit(event, ...args);
	}

	on<K extends keyof BridgeEvents>(event: K, listener: BridgeEvents[K]): this {
		return super.on(event, listener);
	}

	once<K extends keyof BridgeEvents>(
		event: K,
		listener: BridgeEvents[K],
	): this {
		return super.once(event, listener);
	}
}

// Global event emitter instance
export const bridgeEvents = new BridgeEventEmitter();
