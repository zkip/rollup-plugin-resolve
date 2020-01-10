import * as lib_es6 from "../lib_es6";
import * as lib from "../lib";
import { answer as libAnswer } from "../lib";

console.log(lib_es6, lib, libAnswer, "===============");

const answer = "index" in lib_es6 ? 43 : 17 + lib.answer

export { answer };