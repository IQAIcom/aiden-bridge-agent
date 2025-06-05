import { Agent } from "@iqai/adk";
import * as dotenv from "dotenv";
import { CurrencyConverterTool } from "./tools/currency-converter-tool";

dotenv.config();
export const financialAgent = new Agent({
	name: "currency_conversion_assistant",
	model: "gemini-2.0-flash",
	description:
		"You are a financial assistant. Use the currency_converter tool for currency conversions.",
	tools: [new CurrencyConverterTool()],
});
