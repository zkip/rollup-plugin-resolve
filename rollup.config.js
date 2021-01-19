import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

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
		json(),
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
