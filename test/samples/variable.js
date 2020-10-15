import test from "ava";
import { rollup } from "rollup";
import { join } from "path";
import { testBundle } from "../../util/test";

import resolve from "../..";
import { removeSync, copySync } from "fs-extra";

process.chdir(join(process.cwd(), "test/fixtures/variable"));

const gen = (t) => async (variables, input, answer) => {
	const bundle = await rollup({
		plugins: [resolve({ variables })],
		input,
	});

	let { module } = await testBundle(t, bundle);
	t.is(module.exports.answer, answer);
};

test("normal", async (t) => {
	const find = gen(t);

	await find(
		{
			data: "a/b/c",
		},
		"find.js",
		91
	);
});

test("invalid", async (t) => {
	const find = gen(t);
	try {
		await find(
			{
				data: "a/b/d",
			},
			"find.js",
			91
		);

		t.fail();
	} catch ({ code }) {
		t.is(code, "OPTION_INVALID");
	}
});

test("missing", async (t) => {
	const find = gen(t);
	try {
		await find(
			{
				data3: "a/b/c",
			},
			"find.js",
			91
		);

		t.fail();
	} catch ({ pluginCode: code }) {
		t.is(code, "VARIABLE_MISSING");
	}
});

test("absolute", async (t) => {
	const dest = `/tmp/rollup/@zrlps/resolve/test/variable$${Math.random()}`;
	copySync("./should_be_moved", dest);
	const find = gen(t);
	try {
		await find(
			{
				data: dest,
			},
			"find.js",
			11
		);
	} finally {
		removeSync(dest);
	}
});
