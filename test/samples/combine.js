import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";

import resolve from "../..";

process.chdir(join(__dirname, "../fixtures/combine"));

function gen(t) {
	return async (base, input, answer) => {
		const bundle = await rollup({
			plugins: [resolve({ base })],
			input
		});
		let { result } = await testBundle(t, bundle);
		t.deepEqual(result, { answer });
	};
}

/*
	option dirBehaviour: es6 / collective / auto
	option 
*/

test("combine", async t => {
	const bundle = await rollup({
		plugins: [resolve()],
		input: "main.js"
	});
	let { result } = await testBundle(t, bundle);
	t.deepEqual(result, { answer });
});
