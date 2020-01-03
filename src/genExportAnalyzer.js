import { promisify } from "util";
import { readFile as _readFile, existsSync } from "fs";
import acorn from "acorn";
import { dualEach, tryResolve } from "./util";
import { relative, resolve, dirname } from "path";

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

		const QRelayExportList = target => (relayExports[target] = relayExports[target] || []);

		for (const node of acorn.parse(code, option).body) {
			const { type } = node;
			if (type === "ExportAllDeclaration") {
				let target = node.source.value;
				QRelayExportList(target).push(["*", "*"]);
			} else if (type === "ExportDefaultDeclaration") {
				isDefaultEpxort = true;
			} else if (type === "ExportNamedDeclaration") {
				if (node.declaration) {
					for (const declaration of node.declaration.declarations || [
						node.declaration
					]) {
						let { name } = declaration.id;
						localExports.push([name, name]);
					}
				} else {
					for (const specifier of node.specifiers) {
						let { name: exported } = specifier.exported;
						let { name: local } = specifier.local;

						if (node.source) {
							let target = node.source.value;
							QRelayExportList(target).push([exported, local]);
						} else {
							localExports.push([exported, local]);
						}
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

	const getFlatExports = async (fp, candidateExt = ['.js']) => {
		const exports = {
			/* { filename(absolute path): { names Set, isDefault bool } }*/
		};
		const find = async (f, include, depMap = {}) => {
			if (!include) {
				include = [];
			}
			let {
				isDefaultExport,
				localExports,
				relayExports
			} = await getExports(f);

			const names = (exports[f] && exports[f].names) || new Set();

			console.log(names, relayExports, f, include, "JJJJJJJJJJJJJJ7777777777")

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
			exports[f] = { isDefault: isDefaultExport, names };

			await Promise.all(dualEach(relayExports)
				(async (f2, names) => {
					if (names.includes("*")) {
						names = [];
					}

					let p = tryResolve(relative(process.cwd(), resolve(dirname(f), f2)));

					if (!p) {
						throw new Error(`@zrlps/resolve: Cannot resolve the path "${f}"`);
					}

					let locals = names.map(([_, local]) => local);

					// Avoid infinite recursive caused by circular dependencies bwtween modules.
					if (!depMap[p]) {
						depMap[p] = true;
						return await find(p, locals, depMap);
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
		this.isDefaultExport = isDefaultEpxort || false; // bool
		this.localExports = localExports || []; /* [ [ exported , local ]str ... ] */
		this.relayExports = relayExports || {}; /* { target: [ [ exported, local ]str ... ] ... } */
	}
}