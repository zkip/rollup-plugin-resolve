import resolve from "@rollup/plugin-node-resolve"

export default [
	{
		input: "src/genVirtualGroupModuleMaker.js",
		external: ["path", "fs", "util", "glob", "acorn"],
		plugins: [resolve()],
		output: [
			{
				file: "test/dist/genVirtualGroupModuleMaker.cjs.js",
				format: "cjs",
				sourcemap: true,
			}
		]
	},
	{
		input: "src/genExportAnalyzer.js",
		external: ["fs", "util", "acorn"],
		plugins: [resolve()],
		output: [
			{
				exports: "named",
				file: "test/dist/genExportAnalyzer.cjs.js",
				format: "cjs",
				sourcemap: true,
			}
		]
	},
	{
		input: "src/util.js",
		external: ["fs", "is-var-name"],
		plugins: [resolve()],
		output: [
			{
				file: "test/dist/util.cjs.js",
				format: "cjs",
				sourcemap: true,
			}
		]
	},
];
