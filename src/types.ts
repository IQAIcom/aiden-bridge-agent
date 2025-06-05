import type { Address } from "viem";

export interface BridgeMonitorOptions {
	funderPrivateKey: string;
	fundingAmount?: bigint;
	minIQThreshold?: bigint;
	checkIntervalMs?: number;
}
