import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";
import { copySync, ensureDirSync, removeSync } from "fs-extra";
import nResolve from "@rollup/plugin-node-resolve";

import resolve from "../..";
import { dualEach, dualMap } from "../dist/util.cjs";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

const gen = t => async (dirBehaviour, input, answer) => {

	const bundle = await rollup({
		plugins: [resolve({ dirBehaviour }), nResolve()],
		input
	});

	try {
		let { module } = await testBundle(t, bundle);
		// t.is(module.exports.answer, answer);
	} catch (e) {
		console.log(e, "@@@@@@@@@@@@@@@@@@@@@@@@@@@");
	}

};

// test("option dirBehaviour default (es6)", async t => {

// 	const find = gen(t);

// 	await find(undefined, "es6/find.js", 37);

// });

// test("option dirBehaviour collective", async t => {

// 	const find = gen(t);

// 	await find("collective", "collective/find.js", 37);

// });

// test("option dirBehaviour auto", async t => {

// 	const find = gen(t);

// 	await find("auto", "auto/find.js", 88);

// });



test("collective, export conflict", async t => {

	// Object.entries()


	dualMap({ a: 1 })(() => {
		// console.log("LKJKKKKKKKKKKKKKKKKK");
		throw "DDDDDDDDDDDDDDDDDDDDDDDDD";
	}).catch((err) => {
		console.log(err, "NNNNNNNNNNNNNNNNNN");
	})
	// await new Promise((rv, rj) => {
	// 	throw "BBBBBBBBB";
	// })

	// const map = (arr, iter) => {
	// 	for (let i = 0; i < arr.length; i++) {
	// 		iter(arr[i], i, arr).catch(err => { throw err })
	// 	}
	// }

	// try {
	// 	map([1, 2], () => {
	// 		throw "FFFFFFFFFFFFFFFFF";
	// 	})
	// } catch (err) {
	// 	console.log(err, "NMMMMMMMMMMMMMMMmmm");
	// }


	// await find("collective", "collective/conflict.js", 109);

	// try {
	// } catch (err) {
	// 	console.log(err.code, "@@@@@@@@@@@@@@@");
	// }

});
