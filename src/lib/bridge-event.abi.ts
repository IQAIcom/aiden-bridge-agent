export const BRIDGE_EVENT_ABI = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: "address",
				name: "localToken",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "remoteToken",
				type: "address",
			},
			{
				indexed: true,
				internalType: "address",
				name: "from",
				type: "address",
			},
			{
				indexed: false,
				internalType: "address",
				name: "to",
				type: "address",
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "amount",
				type: "uint256",
			},
			{
				indexed: false,
				internalType: "bytes",
				name: "extraData",
				type: "bytes",
			},
		],
		name: "ERC20BridgeInitiated",
		type: "event",
	},
] as const;
