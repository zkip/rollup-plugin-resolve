import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

const gen = (t) => async (dirBehaviour, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ dirBehaviour }), nResolve()],
		input,
	});

	let { module } = await testBundle(t, bundle);
	if (answer) t.is(module.exports.answer, answer);
};

test("dirBehaviour default (es6)", async (t) => {
	const find = gen(t);
	await find(undefined, "es6/find.js", 37);
});

test("dirBehaviour collective", async (t) => {
	const find = gen(t);
	await find("collective", "collective/find.js", 37);
});

test("dirBehaviour auto", async (t) => {
	const find = gen(t);
	await find("auto", "auto/find.js", 88);
});

test("collective, export conflict", async (t) => {
	const find = gen(t);
	try {
		await find("collective", "collective/conflict.js");
		t.fail();
	} catch ({ pluginCode: code }) {
		t.is(code, "EXPORT_CONFLICT");
	}
});

test("collective, export filename", async (t) => {
	const find = gen(t);
	await find("collective", "collective/filename.js", 70);
});

test("collective, export override default", async (t) => {
	const find = gen(t);
	await find("collective", "collective/override.js", 31);
});

test("collective, export override named", async (t) => {
	const find = gen(t);
	await find("collective", "collective/override_named.js", 31);
});

test("collective, export priority", async (t) => {
	const find = gen(t);
	await find("collective", "collective/priority.js", 70);
});

test("collective, export moreImport", async (t) => {
	const find = gen(t);
	await find("collective", "collective/moreImport.js", 5);
});
