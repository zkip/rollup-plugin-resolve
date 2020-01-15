import fs from "fs";
import isVarName from "is-var-name";

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

export const tryResolve = (target = "", exts = []) => {
	for (const ext of exts) {
		const fullfp = target + "." + ext;

		if (isExists(fullfp)) {
			return fullfp;
		}
	}

	return null;
};

export const isDir = fp => fs.statSync(fp).isDirectory();

export const isExists = fp => fs.existsSync(fp);

export const validIdent = ident => isVarName(ident);

export const last = arraylike => arraylike[arraylike.length - 1];

export const first = arraylike => arraylike[0];

export const dualEach = o => fn =>
	Object.entries(o).map(async ([k, v]) => await fn(k, v));

export const lessFirst = (a, b) => (a.length < b.length ? [a, b] : [b, a]);

export const all$p = (...ps) => Promise.all(ps);

export const dualAll = o => fn => all$p(...dualEach(o)(fn));

export function nIntersection(...arrs) {
	const ok = new Map();
	const result = [];

	for (let arr1 of arrs) {
		for (let arr2 of arrs) {
			if (arr1 === arr2) continue;

			let left = arr1.length > arr2.length;
			let arr = left ? arr1 : arr2;
			let arra = left ? arr2 : arr1;

			for (let v of arr) {
				if (!ok.has(v)) {
					ok.set(v, true);
				} else if (!ok.get(v)) {
					continue;
				}

				if (!arra.includes(v)) {
					ok.set(v, false);
				}
			}
		}
	}

	for (let [k, b] of ok.entries()) {
		if (b) {
			result.push(k);
		}
	}

	return result;
}
