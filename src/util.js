import fs from "fs";
import path from "path";

export function isDir(fp) {
  return fs.statSync(fp).isDirectory();
}

// FilePath : { rel abs dir file exist }bool
export function analysisFile(fp) {
  let rst = { rel: false, abs: false, dir: false, file: false, exist: false };
  if (fs.existsSync(fp)) {
    rst.exist = true;
    if (isDir(fp)) {
      rst.dir = true;
    } else {
      rst.file = true;
    }
    if (path.isAbsolute(fp)) {
      rst.abs = true;
    } else {
      rst.rel = true;
    }
  }
  return rst;
}
