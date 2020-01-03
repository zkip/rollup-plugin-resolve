import test from "ava";
import { join } from "path";
import genVirtualGroupModuleMaker from "../dist/genVirtualGroupModuleMaker.cjs"

process.chdir(join(process.cwd(), "test/fixtures/intergration"));

// test("delay exports", async t => {
// 	const { getExports } = genExportAnalyzer();
// 	{
// 		const { relayExports } = await getExports("b/c/x.js");
// 		t.deepEqual(relayExports, {});
// 	}
// 	{
// 		const { relayExports } = await getExports("main.js");
// 		t.deepEqual(relayExports, { "./b/x": [["*", "*"]] });
// 	}
// 	{
// 		const { relayExports } = await getExports("b/x.js");
// 		t.deepEqual(relayExports, { "../main": [["ggg", "g"]] });
// 	}
// })