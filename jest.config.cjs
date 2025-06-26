module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	roots: ["<rootDir>/src"],
	testMatch: ["<rootDir>/src/**/*.test.ts"],
};
