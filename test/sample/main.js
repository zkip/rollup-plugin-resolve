import test from "ava";
import { rollup } from "rollup";
import { testBundle } from "../../util/test"
import resolve from "../..";

process.chdir(__dirname);

test("run", async t => {
	const bundle = await rollup({
		plugins: [resolve()],
		input: 'main.js'
	});
	let { result } = await testBundle(t, bundle);
	console.log(result)
});