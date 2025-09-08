import { env } from "@/env";
import {
	http,
	type PublicClient,
	type WalletClient,
	createPublicClient,
	createWalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { fraxtal, mainnet } from "viem/chains";

/**
 * Service for managing blockchain wallet interactions across Ethereum and Fraxtal networks.
 * Provides public and wallet clients for different blockchain networks with private key-based authentication.
 */
export class WalletService {
	private publicEthClient: PublicClient;
	private publicFraxtalClient: PublicClient;
	private walletClient?: WalletClient;

	constructor(privateKey: string) {
		this.publicEthClient = createPublicClient({
			chain: mainnet,
			transport: http(env.ALCHEMY_API_KEY),
		}) as PublicClient;

		this.publicFraxtalClient = createPublicClient({
			chain: fraxtal,
			transport: http(),
		}) as PublicClient;

		try {
			this.walletClient = this.createWalletClient(privateKey);
		} catch (error) {
			console.error("Error initializing wallet client:", error);
			throw new Error(
				`Failed to initialize wallet: ${(error as Error).message}`,
			);
		}
	}

	createWalletClient(privateKey: string): WalletClient {
		const account = privateKeyToAccount(
			`0x${privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey}`,
		);
		return createWalletClient({
			account,
			chain: fraxtal,
			transport: http(),
		});
	}

	getPublicEthClient(): PublicClient {
		return this.publicEthClient;
	}

	getPublicFraxtalClient(): PublicClient {
		return this.publicFraxtalClient;
	}

	getWalletClient(): WalletClient | undefined {
		return this.walletClient;
	}
}
