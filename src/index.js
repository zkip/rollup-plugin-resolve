import path from "path";
import fs from "fs";
import { promisify } from "util";
import { createFilter } from "rollup-pluginutils";
import crypto from "crypto";
import _glob from "glob";
import preCfg from "./preCfg";

const readFile = promisify(fs.readFile);
const glob = promisify(_glob);

const defaultRenamer = (name, id) => {
	return (
		name ||
		path
			.basename(id, path.extname(id))
			.replace(
				/[-+*/:;.'"`?!&~|<>^%#=@[\]{}()\s\\]+([a-z]|$)/g,
				(match, c) => c.toUpperCase()
			)
	);
};

async function resolveTreeDep(fp) {
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

async function generateCode({ fulId, vId, mode }, codes, options) {
	let files = await glob(fulId + "/*");
	let isDestructuring = mode === ImportMode.Destructuring;
	const acornOptions = Object.assign({ sourceType: "module" }, options.acorn);
	let code;
	if (isDestructuring) {
		code = await resolveTreeDep(fulId);
	} else {
		const lines = await Promise.all(
			files.map(async (file, index) => {
				if (isDir(file)) {
					// ignore
				} else {
					const code = await readFile(file, "utf8");
					const lines = [];
					const namedExports = [];
					for (const node of this.parse(code, acornOptions).body) {
						const { type } = node;
						if (type === "ExportAllDeclaration") {
							let from = node.source.value;
							if (from.startsWith(".")) {
								from = `./${path
									.join(path.dirname(file), from)
									.split(path.sep)
									.join("/")}`;
							}
							lines.push(
								`export * from ${JSON.stringify(from)};`
							);
						} else if (type === "ExportDefaultDeclaration") {
							const exported = options.renamer(null, file);
							if (exported) {
								lines.push(
									`import _${index} from ${JSON.stringify(
										file
									)};`
								);
								lines.push(
									`export {_${index} as ${exported}};`
								);
							}
						} else if (type === "ExportNamedDeclaration") {
							for (const specifier of node.specifiers) {
								namedExports.push(specifier.exported.name);
							}
							if (node.declaration) {
								for (const declaration of node.declaration
									.declarations || [node.declaration]) {
									namedExports.push(declaration.id.name);
								}
							}
						}
					}
					const nameMapping = [];
					for (const name of namedExports) {
						const exported = options.renamer(name, file);
						if (exported) {
							nameMapping.push(`${name} as ${exported}`);
						}
					}
					if (0 < nameMapping.length) {
						lines.push(
							`export {${nameMapping.join(
								", "
							)}} from ${JSON.stringify(file)}`
						);
					}
					if (lines.length === 0) {
						lines.push(`import ${JSON.stringify(file)};`);
					}
					return lines.join("\n");
				}
			})
		);
		code = lines.join("\n");
	}
	codes.set(vId, code);
	return vId;
}

function isDir(fp) {
	return fs.statSync(fp).isDirectory();
}

function last(s) {
	return s[s.length - 1];
}

function first(s) {
	return s[0];
}

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

// { rel abs dir file exist }
function analysisFile(fp) {
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

function resolve(importee, importer, { basedir, candidateExt }) {
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
	if (!path.isAbsolute(importee)) {
		if (importee.startsWith("~/")) {
			rst.fulId = importee.replace("~", process.env.HOME);
		} else if (importee.startsWith("@/")) {
			rst.fulId = importee.replace("@", basedir);
		} else if (first(importee) === "{" && last(importee) === "}") {
			// destructuring mode
			rst = resolve(importee.slice(1, -1), importer, {
				basedir,
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
	basedir,
	renamer = defaultRenamer,
	candidateExt = ["js"],
	include,
	exclude
}) {
	let cwd = process.cwd();
	// basedir
	if (basedir) {
		let { exist, rel, dir } = analysisFile(basedir);
		if (!exist) {
			console.error(`Option error [basedir]: Not exist.`);
		} else {
			if (!dir) {
				console.error(`Option error [basedir]: Must be a directory.`);
			}
			if (rel) {
				basedir = path.join(cwd, basedir);
			}
		}
	}
	if (!basedir) {
		basedir = cwd;
	}

	// renamer
	if (typeof renamer !== "function") {
		console.error(`Option error [renamer]: Must be a function.`);
	}

	// candidateExt
	if (candidateExt.constructor !== Array) {
		console.error(`Option error [candidateExt]: Must be a String Array.`);
	}

	return { basedir, renamer, candidateExt, include, exclude };
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
					{
						fulId,
						vId: genVirtualID(fulId + mode, importer),
						mode
					},
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

export { preCfg };
