import test from "ava";
import { join } from "path";
import { rollup } from "rollup";
import { testBundle } from "../../util/test";

import resolve from "../..";

process.chdir(join(__dirname, "../fixtures/base"));
test("[base option: default] normal", async t => {
  const bundle = await rollup({
    plugins: [resolve()],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 80
  });
});
test("[base option: default] navigator", async t => {
  const bundle = await rollup({
    plugins: [
      resolve({
        base: "y"
      })
    ],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 80
  });
});
test("[base option: specified] normal", async t => {
  const bundle = await rollup({
    plugins: [
      resolve({
        base: "y"
      })
    ],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 80
  });
});
test("[base option: specified, relative] navigator", async t => {
  const bundle = await rollup({
    plugins: [
      resolve({
        base: "y"
      })
    ],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 80
  });
});
test("[base option: specified, absolute] navigator", async t => {
  const bundle = await rollup({
    plugins: [
      resolve({
        base: "y"
      })
    ],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 80
  });
});

process.chdir(join(__dirname, "../fixtures/base_width_relative"));
test("[base] with relative navigator", async t => {
  const bundle = await rollup({
    plugins: [resolve()],
    input: "main.js"
  });
  let { result } = await testBundle(t, bundle);
  t.deepEqual(result, {
    answer: 97
  });
});
