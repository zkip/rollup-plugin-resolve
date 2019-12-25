export default async function resolveTreeDep(fp) {
  let m = {}; // name : fullpath
  let _fp = fp;
  async function genModulePathName(fp) {
    if (isDir(fp)) {
      for (let f of await glob(fp + "/*")) {
        await genModulePathName(f);
      }
    } else {
      let { dirname, basename, extname, join } = path;
      let rel = path.relative(_fp, fp);

      // escape the separator charactor '_' and ‘$'
      // the '-' is a special charactor to describe the hierarchical
      let raw = join(dirname(rel), basename(rel, extname(rel)));
      let name = raw.replace(/\$/g, "$$$");
      name = name.replace(/_{1}/g, "__");
      // the "$_" was be used separate the path
      name = name.replace(/\-|\//g, "$_");
      m[name] = fp;
    }
  }
  await genModulePathName(fp);

  function setByPath(o, v, p) {
    function _set(o, ks) {
      if (ks.length > 1) {
        let k = ks.shift();
        // recovery to escape before
        k = k.replace(/__/g, "_");
        k = k.replace(/\${2}/g, "$$");
        o[k] || (o[k] = {});
        _set(o[k], ks);
      } else {
        o[last(ks)] = v;
      }
    }
    _set(o, p.split(/\$_/g));
  }

  let pkg = {};
  let ls = [];
  for (let name in m) {
    setByPath(pkg, name, name);
    ls.push(`import ${name} from "${m[name]}";`);
  }
  let pkg_s = JSON.stringify(pkg).replace(/[""]/g, "");
  ls.push("const rst=" + pkg_s + ";");
  ls.push("export default rst;");

  return ls.join("\n");
}
