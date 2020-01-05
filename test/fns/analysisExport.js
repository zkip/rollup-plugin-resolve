import test from "ava";
import { join } from "path";
import genExportAnalyzer from "../dist/genExportAnalyzer.cjs";
import { dualEach } from "../dist/util.cjs";

process.chdir(join(process.cwd(), "test/fixtures/exports"));

test("default export.", async t => {
	const { getExports } = genExportAnalyzer();
	{
		const { isDefaultExport } = await getExports("main.js");
		t.is(isDefaultExport, true);
	}
	{
		const { isDefaultExport } = await getExports("b/x.js");
		t.is(isDefaultExport, false);
	}
});

test("local exports.", async t => {
	const { getExports } = genExportAnalyzer();
	{
		const { localExports } = await getExports("b/c/x.js");
		t.deepEqual(localExports, []);
	}
	{
		const { localExports } = await getExports("b/x.js");
		t.deepEqual(localExports, [
			["X", "X"],
			["g2", "g2"],
			["F", "d"]
		]);
	}
});

test("delay exports", async t => {
	const { getExports } = genExportAnalyzer();
	{
		const { relayExports } = await getExports("b/c/x.js");
		t.deepEqual(relayExports, {});
	}
	{
		const { relayExports } = await getExports("main.js");
		t.deepEqual(relayExports, { "./b/x": [["*", "*"]] });
	}
	{
		const { relayExports } = await getExports("b/x.js");
		t.deepEqual(relayExports, {
			"../main": [
				["ggg", "g"],
				["fff", "p2"]
			]
		});
	}
});

test("flat exports", async t => {
	const { getFlatExports } = genExportAnalyzer();
	{
		const exports = await getFlatExports("b/c/x.js");
		t.deepEqual(exports, {
			"b/c/x.js": { isDefault: true, names: new Set() }
		});
	}
	{
		const exports = await getFlatExports("main.js");

		const m = {
			"main.js": { isDefault: true, exports: ["g"], locals: ["g"] },
			"b/x.js": {
				isDefault: false,
				exports: ["X", "g2", "F", "ggg"],
				locals: ["X", "g2", "d", "g"]
			}
		};

		t.is(
			(
				await Promise.all(
					dualEach(exports)((p, { isDefault, names }) => {
						const ns = Array.from(names);
						const { exports, locals } = m[p];
						return (
							m[p].isDefault === isDefault &&
							ns.length === exports.length &&
							ns.reduce(
								(ok, [exported, local]) =>
									ok &&
									exports.findIndex(e => e === exported) ===
										locals.findIndex(l => l === local),
								true
							)
						);
					})
				)
			).reduce((ok, b) => ok && b, true),
			true
		);
	}
});
