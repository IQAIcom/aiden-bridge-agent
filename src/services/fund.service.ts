import { type Address, formatEther, withRetry } from "viem";
import { fraxtal } from "viem/chains";
import { FUNDING_AMOUNT } from "../lib/constants.js";
import type { BridgeEvent } from "./event.service.js";
import type { WalletService } from "./wallet.js";

export interface FundingEvent {
	recipient: Address;
	amount: bigint;
	txHash: string;
	timestamp: number;
}

export class FundService {
	private readonly fundingAmount: bigint = FUNDING_AMOUNT;
	constructor(
		private walletService: WalletService,
		private onFundingComplete: (event: FundingEvent) => void,
		private onSufficientBalanceSkip: (event: BridgeEvent) => void,
	) {}

	async processBridgeEvent(event: BridgeEvent): Promise<void> {
		// Determine recipient (use 'from' if 'to' is zero address)
		const recipient =
			event.to === "0x0000000000000000000000000000000000000000"
				? event.from
				: event.to;

		await this.fundRecipient(recipient, event);
	}

	private async fundRecipient(
		recipient: Address,
		event: BridgeEvent,
	): Promise<void> {
		try {
			console.log(`💰 Checking funding for ${recipient}`);

			const recipientBalance = await this.getRecipientBalance(recipient);
			console.log(`Current balance: ${formatEther(recipientBalance)} ETH`);

			if (recipientBalance >= this.fundingAmount) {
				console.log(
					"✅ Recipient already has sufficient ETH, no funding needed",
				);
				this.onSufficientBalanceSkip(event);
				return;
			}

			const fundingNeeded = this.fundingAmount - recipientBalance;
			await this.executeFunding(recipient, fundingNeeded);
		} catch (error) {
			console.error(`❌ Error funding recipient ${recipient}:`, error);
		}
	}

	private async executeFunding(
		recipient: Address,
		amount: bigint,
	): Promise<void> {
		const walletClient = this.walletService.getWalletClient();
		const fraxtalClient = this.walletService.getPublicFraxtalClient();
		const funderBalance = await this.getFunderBalance();

		if (funderBalance < amount) {
			console.error(
				`❌ Insufficient funder balance: ${formatEther(funderBalance)} ETH`,
			);
			return;
		}

		await withRetry(
			async () => {
				if (!walletClient || !walletClient.account) {
					throw new Error("Wallet not available for funding");
				}

				const hash = await walletClient.sendTransaction({
					to: recipient,
					value: amount,
					chain: fraxtal,
					account: walletClient.account,
				});

				console.log(`📤 Funding transaction sent: ${hash}`);

				const receipt = await fraxtalClient.waitForTransactionReceipt({ hash });

				if (receipt.status === "success") {
					const fundingEvent: FundingEvent = {
						recipient: recipient,
						amount: amount,
						txHash: hash,
						timestamp: Date.now(),
					};

					this.onFundingComplete(fundingEvent);
					console.log(
						`✅ Successfully funded ${recipient} with ${formatEther(amount)} ETH`,
					);
				} else {
					throw new Error(`Transaction failed: ${hash}`);
				}
			},
			{ retryCount: 3 },
		);
	}

	async getFunderBalance(): Promise<bigint> {
		const walletClient = this.walletService.getWalletClient();
		const fraxtalClient = this.walletService.getPublicFraxtalClient();

		if (!walletClient?.account) return 0n;

		return await fraxtalClient.getBalance({
			address: walletClient.account.address,
		});
	}

	private async getRecipientBalance(recipient: Address): Promise<bigint> {
		const fraxtalClient = this.walletService.getPublicFraxtalClient();
		return await fraxtalClient.getBalance({ address: recipient });
	}
}
