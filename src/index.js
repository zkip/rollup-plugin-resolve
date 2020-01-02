import crypto from "crypto";
import path, { isAbsolute, normalize } from "path";
import { join, dirname, resolve } from "path";
import { createFilter } from "rollup-pluginutils";
import { isDir, isExists } from "./util";
import checkOptions from "./checkOptions";

import preConfig from "./preConfig";
import genVirtuaGrouplModuleMaker from "./genVirtualGroupModuleMaker";

const defaultRenamer = (name, id) => {
	return (
		name ||
		path
			.basename(id, path.extname(id))
			.replace(/[-+*/:;.'"`?!&~|<>^%#=@[\]{}()\s\\]+([a-z]|$)/g, (match, c) =>
				c.toUpperCase()
			)
	);
};

const ImportMode = {
	Normal: 0,
	Destructuring: 1
};

// function genVirtualID(importee, importer) {
// 	let uid = crypto
// 		.createHash("md5")
// 		.update(importee)
// 		.digest("hex");
// 	return path.join(path.dirname(importer), "_" + uid);
// }

// function resolve(importee, importer, { base, candidateExt }) {
// 	if (importer) {
// 		let { file } = analysisFile(importer);
// 		if (file) {
// 			importer = path.dirname(importer);
// 		}
// 	} else {
// 		importer = process.cwd();
// 	}
// 	let rst = {
// 		fulId: "",
// 		mode: ImportMode.Normal,
// 		isSupport: true,
// 		isDir: false,
// 		isExist: false
// 	};

// 	let isIntegration = false,
// 		fulId = ""

// 	if (!path.isAbsolute(importee)) {
// 		if (importee.startsWith("~/")) {
// 			// $HOME and /
// 			rst.fulId = importee.replace("~", process.env.HOME);
// 		} else if (importee.startsWith("@/")) {
// 			// base
// 			rst.fulId = importee.replace("@", base);
// 		} else if (importee.startsWith("{") && importee.endsWith("}")) {
// 			// intergration
// 			rst = resolve(importee.slice(1, -1), importer, {
// 				base,
// 				candidateExt
// 			});
// 			rst.mode = ImportMode.Destructuring;
// 		} else if (importee.startsWith("./") || importee.startsWith("../")) {
// 			rst.fulId = path.join(importer, importee);
// 		} else {
// 			// resolve from modules
// 		}
// 	} else {
// 		rst.fulId = importee;
// 	}

// 	{
// 		let { exist, dir, file } = analysisFile(rst.fulId);
// 		let ext = path.extname(rst.fulId);
// 		if (dir) {
// 			rst.isDir = true;
// 			rst.isExist = true;
// 		} else {
// 			if (exist) {
// 				if (ext) {
// 					if (candidateExt.indexOf(ext.slice(1)) < 0) {
// 						rst.isSupport = false;
// 					} else {
// 						rst.isExist = true;
// 					}
// 				} else {
// 					// A file without extname
// 					rst.isSupport = false;
// 				}
// 			} else {
// 				rst.isSupport = false;
// 				for (let ext of candidateExt) {
// 					let fulId = rst.fulId + "." + ext;
// 					if (analysisFile(fulId).exist) {
// 						rst.fulId = fulId;
// 						rst.isExist = true;
// 						rst.isSupport = true;
// 						break;
// 					}
// 				}
// 			}
// 		}
// 	}
// 	return rst;
// }

const isES6DirExport = dirpath => isExists(join(dirpath, "index.js"))

const defaultCandidateExt = ["js"]

const hitTarget = (target = "", candidateExt = defaultCandidateExt) => {
	for (const ext of candidateExt) {
		const fullfp = target + "." + ext
		if (isExists(fullfp)) {
			return fullfp;
		}
	}

	return null;
}

/*
mode:
	N Normal
	I Intergration
	C Combine
*/
const genVirtualID = (target, mode = "N") => `\0${mode}::${target}`;
const parseVirtualID = raw => {
	if (raw.startsWith("\0")) {
		let ret = raw.slice(1).split("::");
		if (ret.length === 2) {
			return { mode: ret[0], target: ret[1] }
		}
	}
	return null;
}

export default (options = {}) => {
	const { include, exclude, base, candidateExt, variables } = checkOptions(options);
	const filter = createFilter(include, exclude);

	const getVirtualGroupModule = genVirtuaGrouplModuleMaker()

	return {
		name: "resolve",
		async resolveId(importee, importer) {
			if (!filter(importee)) {
				return null;
			}

			let dir_name = importer && dirname(importer) || ""
			let fullfp = resolve(dir_name, importee)

			if (importee.startsWith("{") && importee.endsWith("}")) {
				fullfp = join(dir_name, importee.slice(1, -1))
				if (isExists(fullfp) && isDir(fullfp)) {
					// intergration import
					return genVirtualID(fullfp, "I")
				} else {
					throw new Error(`@zrpls/resolve: Intergration import only works for directory.`)
				}
			}

			if (isExists(fullfp)) {
				if (isDir(fullfp)) {
					if (isES6DirExport(fullfp)) {
						return null;
					}
					// combine import
					return genVirtualID(fullfp, "C")
				}
			} else {
				return hitTarget(fullfp, candidateExt)
			}

		},
		async load(id) {
			let ret = parseVirtualID(id);
			if (ret) {
				let { mode, target } = ret;
				if (mode === "I") return await getVirtualGroupModule(target, true)
				if (mode === "C") return await getVirtualGroupModule(target)
			}
		}
	};
};

export { preConfig };
