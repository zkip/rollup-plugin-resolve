const resolve = require("../..");

export default {
	input: "input.js",
	plugins: [resolve()],
	output: {
		file: "output.js",
		format: "es"
	}
};
