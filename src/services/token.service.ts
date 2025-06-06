import { http, type PublicClient, createPublicClient, erc20Abi } from "viem";
import type { Address } from "viem";
import { mainnet } from "viem/chains";

export interface TokenInfo {
	symbol: string;
	decimals: number;
}

/**
 * Service for fetching token information from Ethereum contracts
 */
export class TokenService {
	private tokenCache = new Map<string, TokenInfo>();
	private ethClient: PublicClient;

	constructor() {
		this.ethClient = createPublicClient({
			chain: mainnet,
			transport: http(),
		}) as PublicClient;
	}

	/**
	 * Get token symbol and decimals from Ethereum contract
	 */
	async getTokenInfo(tokenAddress: Address): Promise<TokenInfo> {
		const cacheKey = tokenAddress;

		if (this.tokenCache.has(cacheKey)) {
			const cachedInfo = this.tokenCache.get(cacheKey);
			if (cachedInfo) {
				return cachedInfo;
			}
		}

		try {
			const [symbol, decimals] = await Promise.all([
				this.ethClient.readContract({
					address: tokenAddress,
					abi: erc20Abi,
					functionName: "symbol",
				}) as Promise<string>,
				this.ethClient.readContract({
					address: tokenAddress,
					abi: erc20Abi,
					functionName: "decimals",
				}) as Promise<number>,
			]);

			const tokenInfo = { symbol, decimals };
			this.tokenCache.set(cacheKey, tokenInfo);

			return tokenInfo;
		} catch (error) {
			console.warn(`🚧 Failed to fetch token info for ${tokenAddress}:`, error);
			const fallbackInfo = {
				symbol: `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
				decimals: 18,
			};
			this.tokenCache.set(cacheKey, fallbackInfo);
			return fallbackInfo;
		}
	}

	/**
	 * Format token amount with proper decimals
	 */
	formatTokenAmount(
		amount: bigint,
		decimals: number,
		tokenSymbol: string,
	): string {
		const divisor = BigInt(10 ** decimals);
		const wholePart = amount / divisor;
		const fractionalPart = amount % divisor;

		if (fractionalPart === 0n) {
			return wholePart.toString();
		}

		const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
		const trimmedFractional = fractionalStr.replace(/0+$/, "");

		return trimmedFractional
			? `${wholePart}.${trimmedFractional} ${tokenSymbol}`
			: `${wholePart} ${tokenSymbol}`;
	}

	/**
	 * Get formatted token amount by fetching token info and formatting the amount
	 */
	async getFormattedTokenAmount(
		amount: bigint,
		tokenAddress: Address,
	): Promise<string> {
		const tokenInfo = await this.getTokenInfo(tokenAddress);
		return this.formatTokenAmount(amount, tokenInfo.decimals, tokenInfo.symbol);
	}
}
