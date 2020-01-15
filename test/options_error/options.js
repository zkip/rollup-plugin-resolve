import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";

import resolve from "../..";
import { all$p } from "../../test/dist/util.cjs";

process.chdir(join(process.cwd(), "test/fixtures/options/base"));

const gen = t => async (option) => {
	const bundle = await rollup({
		plugins: [resolve(option)],
		input: "main.js",
	});
	await testBundle(t, bundle);
};

test("option base not resolved", async t => {
	let find = gen(t);

	try {
		await find({ base: "./c" });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("option base must be a directory", async t => {
	let find = gen(t);

	try {
		await find({ base: "a" });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("option candidateExt not an array", async t => {
	let find = gen(t);

	try {
		await find({ candidateExt: {} });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("option candidateExt not an array of string", async t => {
	let find = gen(t);

	try {
		await find({ candidateExt: [1, 3] });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("option variables not an Object", async t => {
	let find = gen(t);

	try {
		await find({ variables: [] });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("option dirBehaviour it's invalid option ", async t => {
	let find = gen(t);

	try {
		await find({ dirBehaviour: "xx" });
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});
