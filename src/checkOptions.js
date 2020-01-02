import { isAbsolute, join } from "path"
import { isExists, isDir } from "./util";

export default function checkOptions({
	base,
	candidateExt = ["js"],
	variables = {},
	include,
	exclude
}) {

	if (base) {
		let target;
		if (isAbsolute(base)) {
			target = base;
		} else {
			target = join(process.cwd(), base)
		}
		if (!isExists(target)) {
			throw new Error(`@zrlps/resolve: The base option must be a valid directory.`);
		}
		if (!isDir(target)) {
			throw new Error(`@zrlps/resolve: The base option must be a directory.`);
		}
	}

	if (candidateExt.constructor !== Array || !candidateExt.reduce((ok, v) => typeof v === "string" && ok, true)) {
		throw new Error(`@zrlps/resolve: The candidateExt option must be an array of string.`);
	}

	if (variables.constructor !== Object) {
		console.error(`@zrlps/resolve: The variables option must be an Object.`)
	}

	return { base, variables, candidateExt, include, exclude };
}
