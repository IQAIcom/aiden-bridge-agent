import { Agent, BaseTool } from "@iqai/adk";

export class CurrencyConverterTool extends BaseTool {
	constructor() {
		super({
			name: "currency_converter",
			description: "Converts an amount from one currency to another.",
		});
	}

	getDeclaration() {
		return {
			name: this.name,
			description: this.description,
			parameters: {
				type: "object",
				properties: {
					amount: { type: "number" },
					fromCurrency: {
						type: "string",
						description: "Source currency code (e.g., USD)",
					},
					toCurrency: {
						type: "string",
						description: "Target currency code (e.g., EUR)",
					},
				},
				required: ["amount", "fromCurrency", "toCurrency"],
			},
		};
	}
	async runAsync(args: {
		amount: number;
		fromCurrency: string;
		toCurrency: string;
	}) {
		// Placeholder for actual conversion logic (e.g., API call to a finance service)
		// This example uses a mock conversion rate.
		if (args.fromCurrency === "USD" && args.toCurrency === "EUR") {
			return { convertedAmount: args.amount * 0.92, currency: "EUR" };
		}
		return {
			error: "Conversion rate not available for the specified currencies.",
		};
	}
}
