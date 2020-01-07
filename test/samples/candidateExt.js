import test from "ava";
import { rollup } from "rollup";

/*
	candidateExt
*/

const gen = t => async (candidateExt, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ candidateExt })],
		input
	});
	let { result } = await testBundle(t, bundle);
	t.deepEqual(result, { answer });
};

test("candidateExt default", async t => {
	rollup();
});
