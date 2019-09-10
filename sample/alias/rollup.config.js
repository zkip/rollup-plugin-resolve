const resolve = require("../..").default;

export default {
	input: "input.js",
	plugins: [resolve()],
	output: [
		{
			file: "output.es.js",
			format: "es"
		},
		{
			file: "output.cjs.js",
			format: "cjs"
		}
	]
};
