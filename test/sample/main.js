import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

const gen = t => async (dirBehaviour, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ dirBehaviour }), nResolve()],
		input
	});

	let { module } = await testBundle(t, bundle);
	if (answer) t.is(module.exports.answer, answer);
};

test("run", async t => {
	const find = gen(t);
	await find("collective", "collective/test.js", 5);
});
