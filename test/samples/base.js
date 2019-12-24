import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { parse } from "acorn";

import resolve from "../..";

const iOpt = {
  plugins: [resolve()]
};

const oOpt = {
  format: "cjs"
};

process.chdir(join(__dirname, "../fixtures/base"));

function check(code) {
  let { body } = parse(code);
  return {
    find() {},
    same() {}
  };
}

test("[base] default option", async t => {
  const bundle = await rollup({ plugins: [resolve()], input: "main.js" });
  let chunk = await bundle.generate(oOpt);
  let [{ code }] = chunk.output;
  let expectCode = `{
	  waitTime: 1500,
	}`;
  let { find, same } = check(code);
  if (find("/config") && same("/config", expectCode)) {
    t.pass();
  }
  console.log(code, "");
  //   for (let node of body) {
  //     let { type } = node;
  //     console.log(type, type === "VariableDeclaration");
  //     if (type === "VariableDeclaration") {
  //       console.log(":::::::::::::", node.declarations);
  //     }
  //   }
  // console.log(await bundle.generate({ format: 'cjs' }))
});
