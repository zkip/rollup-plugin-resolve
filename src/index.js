import { join, dirname, resolve, isAbsolute } from "path";
import { createFilter } from "rollup-pluginutils";
import { isDir, isExists, tryResolve, first } from "./util";
import checkOptions from "./checkOptions";

import preConfig from "./preConfig";
import genVirtuaGrouplModuleMaker from "./genVirtualGroupModuleMaker";
import {
	ResolveError,
	ERR_INTERGRATION_TARGET,
	ERR_VARIABLE_MISSING
} from "./errors";

// more details from https://nodejs.org/api/modules.html#modules_folders_as_modules
const isES6DirExport = dirpath =>
	!!tryResolve(join(dirpath, "index"), ["js", "node"]);

// more details from https://nodejs.org/api/modules.html#modules_file_modules
const extensions = ["mjs", "js", "json", "node"];

/*
	mode
		I Intergration
		C Combine
*/
const genVirtualID = (target, mode) => `\0${mode}::${target}`;
const parseVirtualID = raw => {
	if (raw.startsWith("\0")) {
		let ret = raw.slice(1).split("::");

		if (ret.length === 2) {
			return { mode: ret[0], target: ret[1] };
		}
	}

	return null;
};

const internalVariables = new Set(["~", "@"]);

export default (options = {}) => {
	const {
		include,
		exclude,
		base,
		candidateExt,
		variables,
		dirBehaviour
	} = checkOptions(options);
	const filter = createFilter(include, exclude);

	const getVirtualGroupModule = genVirtuaGrouplModuleMaker({
		candidateExt: extensions
	});

	return {
		name: "resolve",
		async resolveId(importee, importer) {
			if (!filter(importee)) return null;

			// console.log(importee, importer, "$$$$$$$$$$$$$$$$$$$$$");

			let target = importee;
			let fullfp = "";
			let isIntergration = false;

			if (importee.startsWith("{") && importee.endsWith("}")) {
				target = importee.slice(1, -1);
				isIntergration = true;
			}

			const frags = importee.split("/");
			const firstFrag = frags.shift();
			let prefix = "";

			if (internalVariables.has(firstFrag)) {
				if (firstFrag === "@") {
					prefix = base;
				} else if (firstFrag === "~") {
					prefix = process.env.HOME;
				}

				target = frags.join("/");
				fullfp = join(prefix, target);
			} else if (firstFrag.startsWith("$")) {
				// Variable import
				const variable = firstFrag.slice(1);

				if (variables.has(variable)) {
					prefix = variables.get(variable);
				} else {
					throw new ResolveError(
						ERR_VARIABLE_MISSING,
						`The variable "${variable}" is not defined.`
					);
				}

				target = frags.join("/");
				fullfp = join(prefix, target);
			} else if ([".", ".."].includes(firstFrag)) {
				fullfp = join(dirname(importer), importee);
			} else {
				return null;
			}

			let is_exsit = isExists(fullfp);
			let is_dir = is_exsit && isDir(fullfp);

			if (is_exsit) {
				if (is_dir) {
					let mode = "I";

					if (!isIntergration) {
						if (
							dirBehaviour === "collective" ||
							(dirBehaviour === "auto" && !isES6DirExport(fullfp))
						) {
							mode = "C";
						} else {
							// es6 import
							return null;
						}
					}

					return genVirtualID(fullfp, mode);
				} else if (isIntergration) {
					throw new ResolveError(
						ERR_INTERGRATION_TARGET,
						`Intergration import only works for directory.`
					);
				} else {
					return fullfp;
				}
			} else {
				const maybe = tryResolve(fullfp, [
					...extensions,
					...candidateExt
				]);

				if (maybe && !isDir(maybe)) return maybe;

				return null;
			}
		},

		async load(id) {
			const parsedVID = parseVirtualID(id);

			if (parsedVID) {
				const { mode, target } = parsedVID;

				return await getVirtualGroupModule(target, mode === "I");
			}
		}
	};
};

export { preConfig };
