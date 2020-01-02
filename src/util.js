import fs from "fs";
import isVarName from "is-var-name"

export const isDir = fp => fs.statSync(fp).isDirectory()
export const isExists = fp => fs.existsSync(fp)

export function setByPath(obj, val, path) {
	function _set(o, ks) {
		if (ks.length > 1) {
			let k = ks.shift();
			o[k] || (o[k] = {});
			_set(o[k], ks);
		} else {
			o[last(ks)] = val;
		}
	}
	_set(obj, path.split(/\//g));
}


export function validIdent(ident) {
	return isVarName(ident);
}

export const last = arraylike => arraylike[arraylike.length - 1];

export const first = arraylike => arraylike[0]

export const dualEach = o => fn => Object.entries(o).forEach(([k, v]) => fn(k, v));
