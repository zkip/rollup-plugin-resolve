import { promisify } from "util";
import { readFile as _readFile, existsSync } from "fs";
import acorn from "acorn";
import { dualEach, tryResolve, lessFirst } from "./util";
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

	const getFlatExports = async (fp, candidateExt = ['js']) => {
		const exports = {
			/* { filename(absolute path): { names Set, isDefault bool } }*/
		};
		const find = async (f, include = [], importer = "") => {

			let exported = (exports[f] || { isDefault: false, names: new Set() })
			if (!exports[f]) {
				let {
					isDefaultExport,
					localExports,
					relayExports
				} = await getExports(f);

				const { names } = exported;

				const requires = include.map(([_, local]) => local)

				if (include.length === 0 || requires.includes("*")) {
					localExports.map(le => names.add(le));
				} else {
					const [a, b] = lessFirst(requires, localExports);
					a.map(le => b.includes(le) && names.add(le));
				}

				exported.names = names;
				exported.isDefault = isDefaultExport;
				exports[f] = exported;

				await Promise.all(dualEach(relayExports)
					(async (f2, names) => {
						const p = tryResolve(relative(process.cwd(), resolve(dirname(f), f2)), candidateExt);

						if (!p) {
							throw new Error(`@zrlps/resolve: Cannot resolve the path "${f}"`);
						}

						return await find(p, names, f);
					})
				);
			}

			if (importer !== "") {
				const importer_exports = exports[importer];

				const ok = Array.from(exported.names).reduce((ok, [_, local]) => ok.add(local), new Set())

				include.map((x) => ok.has(x[1]) && importer_exports.names.add(x));

			}
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