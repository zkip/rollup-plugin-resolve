import test from "ava";
import { rollup } from "rollup";
import { join } from "path";
import { testBundle } from "../../util/test";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/candidateExt"));

const gen = (t) => async (candidateExt, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ candidateExt })],
		input,
	});

	let { module } = await testBundle(t, bundle);
	answer && t.is(module.exports.answer, answer);
};

test("specified", async (t) => {
	const find = gen(t);
	await find(["jsc"], "find.js", 17);
});

test("try resolve only hit file.", async (t) => {
	const find = gen(t);
	try {
		await find([], "fake.js");
		t.fail();
	} catch ({ code }) {
		t.is(code, "UNRESOLVED_IMPORT");
	}
});
