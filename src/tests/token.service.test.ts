import { createPublicClient, erc20Abi } from "viem";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenService } from "../services/token.service";

vi.mock("viem", async () => {
	const actual = await vi.importActual("viem");
	return {
		...actual,
		createPublicClient: vi.fn(),
	};
});

describe("TokenService", () => {
	const mockTokenAddress =
		"0x1234567890123456789012345678901234567890" as const;
	let tokenService: TokenService;
	let mockPublicClient: any;

	beforeEach(() => {
		vi.clearAllMocks();

		mockPublicClient = {
			readContract: vi.fn(),
		};
		vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);

		tokenService = new TokenService();
	});

	describe("getTokenInfo", () => {
		it("should return cached token info if available", async () => {
			tokenService["tokenCache"].set(mockTokenAddress, {
				symbol: "TEST",
				decimals: 18,
			});

			const result = await tokenService.getTokenInfo(mockTokenAddress);
			expect(result).toEqual({
				symbol: "TEST",
				decimals: 18,
			});
			expect(mockPublicClient.readContract).not.toHaveBeenCalled();
		});

		it("should fetch token info from chain and cache it", async () => {
			mockPublicClient.readContract
				.mockResolvedValueOnce("TEST")
				.mockResolvedValueOnce(18);

			const result = await tokenService.getTokenInfo(mockTokenAddress);
			expect(result).toEqual({
				symbol: "TEST",
				decimals: 18,
			});

			expect(mockPublicClient.readContract).toHaveBeenCalledTimes(2);
			expect(mockPublicClient.readContract).toHaveBeenCalledWith({
				address: mockTokenAddress,
				abi: erc20Abi,
				functionName: "symbol",
			});
			expect(mockPublicClient.readContract).toHaveBeenCalledWith({
				address: mockTokenAddress,
				abi: erc20Abi,
				functionName: "decimals",
			});

			expect(tokenService["tokenCache"].get(mockTokenAddress)).toEqual({
				symbol: "TEST",
				decimals: 18,
			});
		});

		it("should return fallback info when contract calls fail", async () => {
			mockPublicClient.readContract.mockRejectedValue(new Error("RPC error"));

			const result = await tokenService.getTokenInfo(mockTokenAddress);
			expect(result).toEqual({
				symbol: "0x1234...7890",
				decimals: 18,
			});

			expect(tokenService["tokenCache"].get(mockTokenAddress)).toEqual({
				symbol: "0x1234...7890",
				decimals: 18,
			});
		});
	});

	describe("formatTokenAmount", () => {
		it("should format whole numbers correctly", () => {
			const result = tokenService.formatTokenAmount(
				1000000000000000000n,
				18,
				"ETH",
			);
			expect(result).toBe("1");
		});

		it("should format fractional amounts correctly", () => {
			const result = tokenService.formatTokenAmount(
				1234567890000000000n,
				18,
				"ETH",
			);
			expect(result).toBe("1.23456789 ETH");
		});

		it("should trim trailing zeros", () => {
			const result = tokenService.formatTokenAmount(
				1000005000000000000n,
				18,
				"ETH",
			);
			expect(result).toBe("1.000005 ETH");
		});

		it("should handle tokens with different decimals", () => {
			const result = tokenService.formatTokenAmount(123456n, 6, "USDC");
			expect(result).toBe("0.123456 USDC");
		});
	});

	describe("getFormattedTokenAmount", () => {
		it("should combine token info fetch and formatting", async () => {
			vi.spyOn(tokenService, "getTokenInfo").mockResolvedValue({
				symbol: "TEST",
				decimals: 18,
			});

			const result = await tokenService.getFormattedTokenAmount(
				1234567890000000000n,
				mockTokenAddress,
			);
			expect(result).toBe("1.23456789 TEST");
		});

		it("should handle errors in token info fetch", async () => {
			vi.spyOn(tokenService, "getTokenInfo").mockResolvedValue({
				symbol: "0x1234...7890",
				decimals: 18,
			});

			const result = await tokenService.getFormattedTokenAmount(
				1000000000000000000n,
				mockTokenAddress,
			);
			expect(result).toBe("1");
		});
	});
});
