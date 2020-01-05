import test from "ava";
import { join } from "path";
import { testBundle } from "../../util/test";
import { rollup } from "rollup";
import genVirtualGroupModuleMaker from "../dist/genVirtualGroupModuleMaker.cjs";

process.chdir(join(process.cwd(), "test/fixtures/combine"));

// // test("genVirtualGroupModule", async t => {
// // 	const genVirtualModuleCode = genVirtualGroupModuleMaker();
// // 	const code = genVirtualModuleCode("./");
// // 	console.log(code);
// // });

async function genBundle(code) {
	return await rollup({
		input: "\0",
		plugins: [
			{
				resolveId(importee) {
					if (importee === "\0") return importee;
				},
				load(id) {
					if (id === "\0") return { code };
				}
			}
		]
	});
}

test("combine import", async t => {
	const genVirtualModuleCode = genVirtualGroupModuleMaker();
	const { code } = await genVirtualModuleCode("./p");
	console.log("------code-----");
	console.log(code);
	// const bundle = await genBundle(code);
	// const rst = await testBundle(t, bundle);
	// console.log("------result-----");
	// console.log(rst);
});
