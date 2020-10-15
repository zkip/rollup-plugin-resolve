const { rollup } = require("rollup");
const { testBundle } = require("../../util/test");
const nResolve = require("@rollup/plugin-node-resolve");
const { default: resolve } = require("../..");
const { join } = require("path");

async function start(input, answer) {
	const bundle = await rollup({
		plugins: [resolve(), nResolve()],
		input,
	});

	let { module } = await testBundle({}, bundle);
	console.log(module.exports.answer, "@@");
}

process.chdir(join(__dirname, "../fixtures/intergration"));
start("main.js");
