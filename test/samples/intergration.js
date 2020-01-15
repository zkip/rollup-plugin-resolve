import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import nResolve from "@rollup/plugin-node-resolve";
import { copySync, ensureDirSync, removeSync } from "fs-extra";

import resolve from "../..";

process.chdir(join(__dirname, "../fixtures/intergration"));

const gen = t => async (input, answer) => {
	const bundle = await rollup({
		plugins: [resolve(), nResolve()],
		input
	});

	let { module } = await testBundle(t, bundle);
	if (answer) t.deepEqual(module.exports.answer, answer);
};

test("normal)", async t => {
	const find = gen(t);
	await find("main.js", { b: 19, ccc: { x: {} } });
});

test("empty)", async t => {
	const find = gen(t);
	await find("empty.js", { b: { c: {} } });
});

test("not works for file.", async t => {
	const find = gen(t);
	try {
		await find("file.js");
		t.fail();
	} catch ({ pluginCode: code }) {
		t.is(code, "INTERGRATION_TARGET");
	}
});