import { promisify } from "util";
import { readFile as _readFile } from "fs";
import acorn from "acorn";

const readFile = promisify(_readFile);

export default function genExportAnalyzer() {
	const cache_exports = {
		/* filename(absolute path) str: exports ExportAnalysisResult */
	};

	const getExports = async fp => {
		if (cache_exports[fp]) {
			return cache_exports[fp];
		}

		const code = await readFile(fp, "utf8");
		const option = { sourceType: "module" };
		const localExports = [];
		const relayExports = {};
		let isDefaultEpxort = false;
		for (const node of acorn.parse(code, option).body) {
			const { type } = node;
			if (type === "ExportAllDeclaration") {
				let target = node.source.value;
				let list = relayExports[target] || [];
				relayExports[target] = list;
				list.push("*");
			} else if (type === "ExportDefaultDeclaration") {
				isDefaultEpxort = true;
			} else if (type === "ExportNamedDeclaration") {
				if (node.declaration) {
					for (const declaration of node.declaration.declarations || [
						node.declaration
					]) {
						localExports.push(declaration.id.name);
					}
				} else {
					let target = node.source.value;
					let list = relayExports[target] || [];
					relayExports[target] = list;
					for (const specifier of node.specifiers) {
						let { name } = specifier.exported;
						let { name: raw } = specifier.local;
						list.push([name, raw]);
					}
				}
			}
		}

		return (cache_exports[fp] = new ExportAnalysisResult(
			isDefaultEpxort,
			localExports,
			relayExports
		));
	};

	const getFlatExports = async fp => {
		const exports = {
			/* filename(absolute path): names []str */
		};
		const find = async (f, include, depMap = {}) => {
			if (!include) {
				include = [];
			}
			let {
				isDefaultEpxort,
				localExports,
				relayExports
			} = await getExports(f);

			const names = (exports[f] && exports[f].names) || new Set();

			if (include.length === 0) {
				localExports.map(le => names.add(le));
			} else {
				let cm =
					include.length < localExports.length
						? include
						: localExports;
				cm.map(le => {
					if (include.includes(le)) {
						names.add(le);
					}
				});
			}
			exports[f] = { isDefault: isDefaultEpxort, names };

			await Promise.all(
				Object.entries(relayExports).map(async ([f2, names]) => {
					if (names.includes("*")) {
						names = [];
					}

					let p = relative(process.cwd(), resolve(dirname(f), f2));

					if (!existsSync(p)) {
						p += ".js";
					}

					let d = names.map(([_, raw]) => raw);

					// Avoid infinite recursive caused by circular dependencies bwtween modules.
					if (!depMap[p]) {
						depMap[p] = true;
						return await find(p, d, depMap);
					}
				})
			);
		};
		await find(fp);
		return exports;
	};

	return { getExports, getFlatExports }
}

export class ExportAnalysisResult {
	constructor(isDefaultEpxort, localExports, relayExports) {
		this.isDefaultEpxort = isDefaultEpxort || false;
		this.localExports = localExports || [];
		this.relayExports = relayExports || {};
	}
}