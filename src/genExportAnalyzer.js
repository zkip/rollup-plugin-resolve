import { promisify } from "util";
import { readFile as _readFile } from "fs";
import acorn from "acorn";

const readFile = promisify(_readFile);

export default function genExportAnalyzer() {
	// filepath str: { isDefault exports }
	// The filepath is absolute or relative with cwd
	const cache_exports = new Map();

	async function getExports(fp) {
		if (cache_exports.has(fp)) {
			return cache_exports.get(fp);
		}

		const code = await readFile(fp, "utf8");

		const option = { sourceType: "module" };
		const exports = {};
		let isDefault = false;

		for (const node of acorn.parse(code, option).body) {
			const { type, source } = node;

			if (type === "ExportAllDeclaration") {
				exports["*"] = source.value;
			} else if (type === "ExportDefaultDeclaration") {
				isDefault = true;
			} else if (type === "ExportNamedDeclaration") {
				if (node.declaration) {
					for (const declaration of node.declaration.declarations) {
						let { name } = declaration.id;
						exports[name] = "";
					}
				} else {
					for (const specifier of node.specifiers) {
						let { name } = specifier.exported;
						exports[name] = source ? source.value : "";
					}
				}
			}
		}

		const exportAnalysisResult = { isDefault, exports };

		cache_exports.set(fp, exportAnalysisResult);

		return exportAnalysisResult;
	}

	return {
		getExports,
		clear() {
			cache_exports.clear();
		},
	};
}
