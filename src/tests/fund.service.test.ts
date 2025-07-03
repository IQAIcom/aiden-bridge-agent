import { Address, formatEther } from "viem";
import { fraxtal } from "viem/chains";
import { Mocked, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FUNDING_AMOUNT } from "../env";
import { bridgeEvents } from "../services/event-emitter.service";
import { FundService } from "../services/fund.service";
import { type WalletService } from "../services/wallet.service";

const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

vi.mock("viem", async () => {
	const actual = await vi.importActual("viem");
	return {
		...actual,
		withRetry: vi.fn(
			async (fn: () => Promise<any>, options: { retryCount: number }) => {
				return await fn();
			},
		),
	};
});

vi.mock("../env", () => ({
	FUNDING_AMOUNT: 1000000000000000000n,
}));

describe("FundService", () => {
	let fundService: FundService;
	let mockWalletService: Mocked<WalletService>;
	let mockWalletClient: any;
	let mockFraxtalClient: any;

	const mockRecipientAddress: Address =
		"0xRecipientAddress000000000000000000000000";
	const mockFunderAddress: Address = "0xFunderAddress0000000000000000000000000";
	const mockTxHash: `0x${string}` =
		"0xTransactionHash000000000000000000000000000000";

	beforeEach(() => {
		vi.clearAllMocks();

		mockWalletClient = {
			account: { address: mockFunderAddress },
			sendTransaction: vi.fn(),
		};

		mockFraxtalClient = {
			getBalance: vi.fn(),
			waitForTransactionReceipt: vi.fn(),
		};

		mockWalletService = {
			getWalletClient: vi.fn(() => mockWalletClient),
			getPublicFraxtalClient: vi.fn(() => mockFraxtalClient),
			createWalletClient: vi.fn(),
			getPublicEthClient: vi.fn(),
		} as unknown as Mocked<WalletService>;

		fundService = new FundService(mockWalletService);
	});

	afterAll(() => {
		consoleSpy.mockRestore();
		consoleLogSpy.mockRestore();
	});

	describe("startWatching", () => {
		it("should register a listener for bridge:detected events", () => {
			const onSpy = vi.spyOn(bridgeEvents, "on");
			fundService.startWatching();
			expect(onSpy).toHaveBeenCalledWith(
				"bridge:detected",
				expect.any(Function),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"💰 Fund service started watching for bridge events",
			);
		});
	});

	describe("fundRecipient", () => {
		const mockBridgeEvent = {
			from: "0xBridgeFromAddress00000000000000000000000",
			to: mockRecipientAddress,
			amount: 123n,
			txHash: "0xMockBridgeTxHash",
			timestamp: Date.now(),
		};

		it("should fund the recipient if balance is insufficient", async () => {
			const recipientBalance = FUNDING_AMOUNT / 2n;
			vi.spyOn(fundService as any, "getRecipientBalance").mockResolvedValue(
				recipientBalance,
			);
			const executeFundingSpy = vi
				.spyOn(fundService as any, "executeFunding")
				.mockResolvedValue(undefined);

			await (fundService as any).fundRecipient(mockBridgeEvent);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				`💰 Checking funding for ${mockRecipientAddress}`,
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`Current balance: ${formatEther(recipientBalance)} ETH`,
			);
			expect(executeFundingSpy).toHaveBeenCalledWith(
				mockRecipientAddress,
				FUNDING_AMOUNT - recipientBalance,
			);
			expect(consoleLogSpy).not.toHaveBeenCalledWith(
				"✅ Recipient already has sufficient ETH, no funding needed",
			);
		});

		it("should skip funding if recipient already has sufficient ETH", async () => {
			const recipientBalance = FUNDING_AMOUNT;
			vi.spyOn(fundService as any, "getRecipientBalance").mockResolvedValue(
				recipientBalance,
			);
			const executeFundingSpy = vi.spyOn(fundService as any, "executeFunding");
			const emitSpy = vi.spyOn(bridgeEvents, "emit");

			await (fundService as any).fundRecipient(mockBridgeEvent);

			expect(consoleLogSpy).toHaveBeenCalledWith(
				`💰 Checking funding for ${mockRecipientAddress}`,
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`Current balance: ${formatEther(recipientBalance)} ETH`,
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"✅ Recipient already has sufficient ETH, no funding needed",
			);
			expect(executeFundingSpy).not.toHaveBeenCalled();
			expect(emitSpy).toHaveBeenCalledWith("funding:skipped", mockBridgeEvent);
		});

		it("should handle errors during funding process", async () => {
			const error = new Error("Failed to get balance");
			vi.spyOn(fundService as any, "getRecipientBalance").mockRejectedValue(
				error,
			);
			const executeFundingSpy = vi.spyOn(fundService as any, "executeFunding");

			await (fundService as any).fundRecipient(mockBridgeEvent);

			expect(executeFundingSpy).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				`❌ Error funding recipient ${mockRecipientAddress}:`,
				error,
			);
		});

		it("should use event.from if event.to is zero address", async () => {
			const mockZeroAddressEvent = {
				...mockBridgeEvent,
				to: "0x0000000000000000000000000000000000000000" as Address,
			};
			const getRecipientBalanceSpy = vi.spyOn(
				fundService as any,
				"getRecipientBalance",
			);
			vi.spyOn(fundService as any, "executeFunding").mockResolvedValue(
				undefined,
			);

			await (fundService as any).fundRecipient(mockZeroAddressEvent);

			expect(getRecipientBalanceSpy).toHaveBeenCalledWith(
				mockZeroAddressEvent.from,
			);
		});
	});

	describe("executeFunding", () => {
		const amountToFund = 500000000000000000n; // 0.5 ETH

		it("should successfully execute a funding transaction", async () => {
			vi.spyOn(fundService, "getFunderBalance").mockResolvedValue(
				FUNDING_AMOUNT,
			); // Sufficient balance
			mockWalletClient.sendTransaction.mockResolvedValue(mockTxHash);
			mockFraxtalClient.waitForTransactionReceipt.mockResolvedValue({
				status: "success",
			});
			const emitSpy = vi.spyOn(bridgeEvents, "emit");

			await (fundService as any).executeFunding(
				mockRecipientAddress,
				amountToFund,
			);

			expect(mockWalletService.getWalletClient).toHaveBeenCalled();
			expect(mockWalletService.getPublicFraxtalClient).toHaveBeenCalled();
			expect(mockWalletClient.sendTransaction).toHaveBeenCalledWith({
				to: mockRecipientAddress,
				value: amountToFund,
				chain: fraxtal,
				account: {
					address: mockFunderAddress,
				},
			});
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`📤 Funding transaction sent: ${mockTxHash}`,
			);
			expect(mockFraxtalClient.waitForTransactionReceipt).toHaveBeenCalledWith({
				hash: mockTxHash,
			});
			expect(emitSpy).toHaveBeenCalledWith(
				"funding:completed",
				expect.objectContaining({
					recipient: mockRecipientAddress,
					amount: amountToFund,
					txHash: mockTxHash,
				}),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				`✅ Successfully funded ${mockRecipientAddress} with ${formatEther(
					amountToFund,
				)} ETH`,
			);
		});

		it("should not fund if funder balance is insufficient", async () => {
			vi.spyOn(fundService, "getFunderBalance").mockResolvedValue(
				amountToFund / 2n,
			); // Insufficient
			const emitSpy = vi.spyOn(bridgeEvents, "emit");

			await (fundService as any).executeFunding(
				mockRecipientAddress,
				amountToFund,
			);

			expect(consoleSpy).toHaveBeenCalledWith(
				`❌ Insufficient funder balance: ${formatEther(amountToFund / 2n)} ETH`,
			);
			expect(mockWalletClient.sendTransaction).not.toHaveBeenCalled();
			expect(emitSpy).not.toHaveBeenCalled();
		});
	});

	describe("getFunderBalance", () => {
		it("should return the funder's balance", async () => {
			const funderBalance = 5000000000000000000n; // 5 ETH
			mockFraxtalClient.getBalance.mockResolvedValue(funderBalance);

			const balance = await fundService.getFunderBalance();

			expect(mockWalletService.getWalletClient).toHaveBeenCalled();
			expect(mockWalletService.getPublicFraxtalClient).toHaveBeenCalled();
			expect(mockFraxtalClient.getBalance).toHaveBeenCalledWith({
				address: mockFunderAddress,
			});
			expect(balance).toBe(funderBalance);
		});

		it("should return 0 if walletClient.account is not available", async () => {
			mockWalletClient.account = null;
			mockWalletService.getWalletClient.mockReturnValue(mockWalletClient);

			const balance = await fundService.getFunderBalance();

			expect(balance).toBe(0n);
			expect(mockFraxtalClient.getBalance).not.toHaveBeenCalled();
		});

		it("should return 0 if walletClient is not available", async () => {
			mockWalletService.getWalletClient.mockReturnValue(undefined);

			const balance = await fundService.getFunderBalance();

			expect(balance).toBe(0n);
			expect(mockFraxtalClient.getBalance).not.toHaveBeenCalled();
		});
	});

	describe("getRecipientBalance", () => {
		it("should return the recipient's balance", async () => {
			const recipientBalance = 100000000000000000n; // 0.1 ETH
			mockFraxtalClient.getBalance.mockResolvedValue(recipientBalance);

			const balance = await (fundService as any).getRecipientBalance(
				mockRecipientAddress,
			);

			expect(mockWalletService.getPublicFraxtalClient).toHaveBeenCalled();
			expect(mockFraxtalClient.getBalance).toHaveBeenCalledWith({
				address: mockRecipientAddress,
			});
			expect(balance).toBe(recipientBalance);
		});
	});
});
