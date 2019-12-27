import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createFilter } from "rollup-pluginutils";
import { isDir, analysisFile } from "./util";
import generateCode from "./generateCode"

import preConfig from "./preConfig";

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

function genVirtualID(importee, importer) {
	let uid = crypto
		.createHash("md5")
		.update(importee)
		.digest("hex");
	return path.join(path.dirname(importer), "_" + uid);
}

function resolve(importee, importer, { base, candidateExt }) {
	if (importer) {
		let { file } = analysisFile(importer);
		if (file) {
			importer = path.dirname(importer);
		}
	} else {
		importer = process.cwd();
	}
	let rst = {
		fulId: "",
		mode: ImportMode.Normal,
		isSupport: true,
		isDir: false,
		isExist: false
	};

	let isIntegration = false,
		fulId = ""

	if (!path.isAbsolute(importee)) {
		if (importee.startsWith("~/")) {
			// $HOME and /
			rst.fulId = importee.replace("~", process.env.HOME);
		} else if (importee.startsWith("@/")) {
			// base
			rst.fulId = importee.replace("@", base);
		} else if (importee.startsWith("{") && importee.endsWith("}")) {
			// intergration
			rst = resolve(importee.slice(1, -1), importer, {
				base,
				candidateExt
			});
			rst.mode = ImportMode.Destructuring;
		} else if (importee.startsWith("./") || importee.startsWith("../")) {
			rst.fulId = path.join(importer, importee);
		} else {
			// resolve from modules
		}
	} else {
		rst.fulId = importee;
	}

	{
		let { exist, dir, file } = analysisFile(rst.fulId);
		let ext = path.extname(rst.fulId);
		if (dir) {
			rst.isDir = true;
			rst.isExist = true;
		} else {
			if (exist) {
				if (ext) {
					if (candidateExt.indexOf(ext.slice(1)) < 0) {
						rst.isSupport = false;
					} else {
						rst.isExist = true;
					}
				} else {
					// A file without extname
					rst.isSupport = false;
				}
			} else {
				rst.isSupport = false;
				for (let ext of candidateExt) {
					let fulId = rst.fulId + "." + ext;
					if (analysisFile(fulId).exist) {
						rst.fulId = fulId;
						rst.isExist = true;
						rst.isSupport = true;
						break;
					}
				}
			}
		}
	}
	return rst;
}

function checkOptions({
	base,
	candidateExt = ["js"],
	varialbles = {},
	renamer = defaultRenamer,
	include,
	exclude
}) {
	let cwd = process.cwd();
	// basedir
	if (base) {
		let { exist, rel, dir } = analysisFile(base);
		if (!exist) {
			console.error(`Option error [basedir]: Not exist.`);
		} else {
			if (!dir) {
				console.error(`Option error [basedir]: Must be a directory.`);
			}
			if (rel) {
				base = path.join(cwd, base);
			}
		}
	}
	if (!base) {
		base = cwd;
	}

	// renamer
	if (typeof renamer !== "function") {
		console.error(`Option error [renamer]: Must be a function.`);
	}

	// candidateExt
	if (candidateExt.constructor !== Array) {
		console.error(`Option error [candidateExt]: Must be a String Array.`);
	}

	return { base, renamer, candidateExt, include, exclude };
}

export default (options = {}) => {
	options = checkOptions(options);
	const filter = createFilter(options.include, options.exclude);
	const codes = new Map();

	return {
		name: "resolve",
		async resolveId(importee, importer) {
			if (!filter(importee)) {
				return null;
			}
			let { fulId, mode, isDir, isExist, isSupport } = resolve(
				importee,
				importer,
				options
			);
			if (fulId === "" || !isSupport || !isExist) {
				return null;
			} else if (isDir) {
				return generateCode.call(
					this,
					{ fulId, vId: genVirtualID(fulId + mode, importer), mode },
					codes,
					options
				);
			} else {
				return fulId;
			}
		},
		load(id) {
			return codes.get(id);
		}
	};
};

export { preConfig };
