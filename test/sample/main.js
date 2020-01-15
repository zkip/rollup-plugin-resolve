import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/intergration"));

const gen = t => async (input, answer) => {
	const bundle = await rollup({
		plugins: [resolve(), nResolve()],
		input
	});

	let { module } = await testBundle(t, bundle);
	if (answer) t.deepEqual(module.exports.answer, answer);
};

test("run", async t => {
	const find = gen(t);
	await find("main.js", { ccc: { x: {} }, b: 19 });
});
