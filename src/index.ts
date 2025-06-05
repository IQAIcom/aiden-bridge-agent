import { financialAgent } from "./agents/financial-agent";

async function main() {
	const response = await financialAgent.run({
		messages: [{ role: "user", content: "Convert 100 USD to EUR." }],
	});
	console.log(response.content);
}

main().catch(console.error);
