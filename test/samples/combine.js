import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";
import { dualEach, dualMap, all$p } from "../dist/util.cjs";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

const gen = t => async (dirBehaviour, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ dirBehaviour }), nResolve()],
		input
	});

	let { module } = await testBundle(t, bundle);
	t.is(module.exports.answer, answer);
};

test("option dirBehaviour default (es6)", async t => {
	const find = gen(t);

	await find(undefined, "es6/find.js", 37);
});

test("option dirBehaviour collective", async t => {
	const find = gen(t);

	await find("collective", "collective/find.js", 37);
});

test("option dirBehaviour auto", async t => {
	const find = gen(t);

	await find("auto", "auto/find.js", 88);
});

test("collective, export conflict", async t => {
	const find = gen(t);
	try {
		await find("collective", "collective/conflict.js", 109);
	} catch ({ pluginCode: code }) {
		t.is(code, "EXPORT_CONFLICT");
	}
});
