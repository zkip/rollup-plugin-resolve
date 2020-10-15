import resolve from "@rollup/plugin-node-resolve";

export default {
	input: "src/index.js",
	external: [
		"path",
		"fs",
		"util",
		"crypto",
		"glob",
		"rollup-pluginutils",
		"acorn",
	],
	plugins: [
		resolve({
			// preferBuiltins: true,
		}),
	],
	output: [
		{
			file: "dist/rollup-plugin-resolve.cjs.js",
			format: "cjs",
			exports: "named",
			sourcemap: true,
		},
		{
			file: "dist/rollup-plugin-resolve.es.js",
			format: "es",
			exports: "named",
			sourcemap: true,
		},
	],
};
