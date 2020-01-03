import fs from "fs";
import isVarName from "is-var-name"

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

const defaultCandidateExt = ["js"]

export const tryResolve = (target = "", candidateExt = defaultCandidateExt) => {
	for (const ext of candidateExt) {
		const fullfp = target + "." + ext
		if (isExists(fullfp)) {
			return fullfp;
		}
	}

	return null;
}

export const isDir = fp => fs.statSync(fp).isDirectory();

export const isExists = fp => fs.existsSync(fp);

export const validIdent = (ident) => isVarName(ident);

export const last = arraylike => arraylike[arraylike.length - 1];

export const first = arraylike => arraylike[0];

export const dualEach = o => fn => Object.entries(o).map(async ([k, v]) => await fn(k, v));
