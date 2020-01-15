import resolve from "@rollup/plugin-node-resolve";

export default [
	{
		input: "src/util.js",
		external: ["fs", "is-var-name"],
		plugins: [resolve()],
		output: [
			{
				file: "test/dist/util.cjs.js",
				format: "cjs",
				sourcemap: true
			}
		]
	}
];
