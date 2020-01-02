import test from "ava";
import { rollup } from "rollup";
import resolve from "../.."
import { join } from "path";
import { testBundle } from "../../util/test"

process.chdir(join(process.cwd(), "test/fixtures/sample"));

test("run", async t => {
	const bundle = await rollup({
		plugins: [resolve()],
		input: 'main.js'
	});

	let { result, module } = await testBundle(t, bundle);
	console.log(result, module.exports)
	// console.log(bundle)
});