export default {
	input: "src/index.js",
	external: ["path", "fs", "util", "crypto", "glob", "rollup-pluginutils"],
	output: [
		{ file: "dist/rollup-plugin-resolve.cjs.js", format: "cjs" },
		{ file: "dist/rollup-plugin-resolve.es.js", format: "es" }
	]
};
