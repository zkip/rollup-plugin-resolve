import { rollup } from "rollup"
import { join } from "path"
import { testBundle } from "../util/test"
import test from "ava"
import resolve from ".."

const iOpt = {
	plugins: [resolve()]
}
const oOpt = {
	format: 'cjs',
	dir: "./"
}

process.chdir(join(__dirname, 'fixtures'));

test("compile the rollup", async t => {
	const bundle = await rollup({
		...iOpt,
		input: "a_src.js"
	})
	let r = await testBundle(t, bundle)
	console.log(r)

	// console.log(await bundle.generate({ format: 'cjs' }))
	t.pass();
})