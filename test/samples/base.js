import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";

import resolve from "../..";
import { all$p } from "../../test/dist/util.cjs";

process.chdir(join(process.cwd(), "test/fixtures/base"));

const gen = t => async (base, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ base })],
		input
	});
	let { module } = await testBundle(t, bundle);
	t.deepEqual(module.exports.answer, answer);
};

test("default, normal", async t => {
	let find = gen(t);

	await all$p(
		find(undefined, "find.js", 11),
		find(undefined, "a/b/find.js", 31)
	);
});

test("default, navigator", async t => {
	let find = gen(t);

	await all$p(
		find(undefined, "a/b/find_nav.js", 137),
		find(undefined, "find_nav.js", 11)
	);
});

test("specified, normal", async t => {
	let find = gen(t);

	await all$p(find("a/b", "a/b/find.js", 11), find("a", "a/b/find.js", 73));
});

test("specified, navigator", async t => {
	let find = gen(t);

	await all$p(
		find("a/b", "a/b/find_nav.js", 73),
		find("a", "a/b/find_nav.js", 31)
	);
});
