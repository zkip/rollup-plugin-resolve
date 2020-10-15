import test from "ava";
import { rollup } from "rollup";
import { join } from "path";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";
import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/HOME"));

const gen = (t) => async (input, answer) => {
	const bundle = await rollup({
		plugins: [resolve()],
		input,
	});

	let { module } = await testBundle(t, bundle);
	t.is(module.exports.answer, answer);
};

test("HOME", async (t) => {
	const dest = join(process.env.HOME, "x.js");
	const find = gen(t);

	copySync("x.js", dest);

	try {
		await find("find.js", 11);
	} finally {
		removeSync(dest);
	}
});
