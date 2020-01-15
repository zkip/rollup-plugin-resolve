import { isAbsolute, join } from "path"
import { isExists, isDir, dualEach, all$p } from "./util";
import { ResolveError, ERR_OPTION_INVALID } from "./errors";

export default function checkOptions({
	base = "",
	candidateExt = [],
	variables = {},
	dirBehaviour = "es6",
	include,
	exclude
}) {

	const cwd = process.cwd();

	if (!isAbsolute(base)) {

		base = join(cwd, base)

	}

	if (!isExists(base)) {

		throw new ResolveError(ERR_OPTION_INVALID, `The option "base" (${base}) is not resolved.`)

	} else if (!isDir(base)) {

		throw new ResolveError(ERR_OPTION_INVALID, `The option "base" (${base}) must be a directory.`)

	}

	if (candidateExt.constructor !== Array || !candidateExt.reduce((ok, v) => typeof v === "string" && ok, true)) {
		throw new ResolveError(ERR_OPTION_INVALID, `The option "candidateExt" must be an array of string. Received ${candidateExt}`);
	}

	if (variables.constructor !== Object) {
		throw new ResolveError(ERR_OPTION_INVALID, `The option "variables" must be an Object. Received ${variables}`);
	}

	if (!(["es6", "collective", "auto"].includes(dirBehaviour))) {
		throw new ResolveError(ERR_OPTION_INVALID, `The option "dirBehaviour" must be "es6", "collective" or "auto". Received ${dirBehaviour}`);
	}

	variables = (Object.entries(variables).map(([name, dir]) => {

		let p = dir;

		if (!isAbsolute(dir)) {

			p = join(cwd, dir);

		}

		if (!isExists(p)) {

			throw new ResolveError(ERR_OPTION_INVALID, `The path "${dir}" in option "variables" is not resolved.`)

		}

		return [name, p];

	})).reduce((m, [name, p]) => m.set(name, p), new Map());

	return { base, variables, candidateExt, dirBehaviour, include, exclude };
}

const o2m = o => new Map(Object.entries(o))