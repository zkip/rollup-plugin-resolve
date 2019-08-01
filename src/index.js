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
			let { dirname, basename, join } = path;
			let rel = path.relative(_fp, fp);
			m[
				join(dirname(rel), basename(rel, ".js")).replace(/\//g, "_")
			] = fp;
		}
	}
	await genModulePathName(fp);

	function setByPath(o, v, p) {
		function _set(o, ks) {
			if (ks.length > 1) {
				let k = ks.shift();
				o[k] || (o[k] = {});
				_set(o[k], ks);
			} else {
				o[last(ks)] = v;
			}
		}
		_set(o, p.split("_"));
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
	const lines = await Promise.all(
		files.map(async (file, index) => {
			if (isDir(file)) {
				if (isDestructuring) {
					return resolveTreeDep(fulId);
				} else {
					return;
				}
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
						lines.push(`export * from ${JSON.stringify(from)};`);
					} else if (type === "ExportDefaultDeclaration") {
						const exported = options.rename(null, file);
						if (exported) {
							lines.push(
								`import _${index} from ${JSON.stringify(file)};`
							);
							lines.push(`export {_${index} as ${exported}};`);
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
					const exported = options.rename(name, file);
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
	let code = lines.join("\n");
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

function resolve(
	importee,
	importer,
	{ basedir = process.cwd(), candidateExt = ["js"] }
) {
	if (!importer) {
		importer = process.cwd();
	} else {
		importer = path.dirname(importer);
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
			rst = resolve(importee.slice(1, -1), null, basedir);
			rst.mode = ImportMode.Destructuring;
		} else if (importee.startsWith("./") || importee.startsWith("../")) {
			rst.fulId = path.join(importer, importee);
		} else {
			// resolve from node_modules
		}
	} else {
		rst.fulId = importee;
	}

	let ext = path.extname(rst.fulId);

	if (!ext) {
		if (fs.existsSync(rst.fulId)) {
			if (isDir(rst.fulId)) {
				rst.isDir = true;
				rst.isExist = true;
			} else {
				// A file without extname
			}
		} else {
			rst.isSupport = false;
			for (let ext of candidateExt) {
				let fulId = rst.fulId + "." + ext;
				if (fs.existsSync(fulId)) {
					rst.fulId = fulId;
					rst.isExist = true;
					rst.isSupport = true;
					break;
				}
			}
		}
	} else {
		if (candidateExt.indexOf(ext.slice(1)) < 0) {
			rst.isSupport = false;
		} else {
			rst.isExist = true;
		}
	}
	console.log(rst);
	return rst;
}

export default options => {
	options = Object.assign(
		{ rename: defaultRenamer, basedir: process.cwd() },
		options
	);
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
					{ fulId, vId: genVirtualID(fulId, importer), mode },
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
