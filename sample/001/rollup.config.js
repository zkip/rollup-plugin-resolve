const resolve = require("../..").default;

export default {
	input: "input.js",
	plugins: [resolve()],
	output: {
		file: "output.js",
		format: "es"
	}
};
