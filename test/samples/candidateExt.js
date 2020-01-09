import test from "ava";
import { rollup } from "rollup";
import { join } from "path";
import { testBundle } from "../../util/test";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/candidateExt"));

const gen = t => async (candidateExt, input, answer) => {

	const bundle = await rollup({
		plugins: [resolve({ candidateExt })],
		input
	});

	let { module } = await testBundle(t, bundle);
	t.is(module.exports.answer, answer);

};

// test("candidateExt", async t => {

// 	const find = gen(t);
// 	await find(["jsc"], "find.js", 17);

// });
