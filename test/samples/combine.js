import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

const gen = t => async (dirBehaviour, input, answer) => {

	const bundle = await rollup({
		plugins: [resolve({ dirBehaviour }), nResolve()],
		input
	});

	let { module } = await testBundle(t, bundle);
	t.is(module.exports.answer, answer);

};

// test("option dirBehaviour default", async t => {

// 	const find = gen(t);

// 	await find(undefined, "es6/find.js", 71);

// });

// test("option dirBehaviour collective", async t => {

// 	const find = gen(t);

// 	await find("collective", "collective/find.js", 109);

// });

test("option dirBehaviour auto", async t => {

	const find = gen(t);

	await find("collective", "auto/find.js", 178);

});


// test("collective", async t => {

// 	const find = gen(t);

// 	await find("collective", "collective/find.js", 109);

// });
