import { promisify } from "util";
import { validIdent, setByPath, isDir, dualEach } from "./util";
import { join, normalize, dirname, relative, basename, extname } from "path";
import genExportAnalyzer from "./genExportAnalyzer";

import _glob from "glob";

const glob = promisify(_glob);

export default function genVirtuaGrouplModuleMaker() {
	const cache_combine = {
		/* fp: VirtualCombineModule */
	};
	const cache_intergration = {
		/* fp: VirtualIntergrationModule */
	};
	const { getFlatExports } = genExportAnalyzer();

	return async (fp, isIntergration) => {
		if (!isDir(fp)) return null;

		let module = isIntergration
			? cache_intergration[fp]
			: cache_combine[fp];

		if (module) return module;

		// The keypath must be valid.
		const
			m_id_kp = {
				/* id: keypath */
			},
			m_kp_id = {
				/* keypath: id */
			},
			m_f_exports = {
				/* filepath : { target: names } */
			},
			m_id_isDefault = {
				/* id: isDefault */
			},
			m_f_ids = {
				/* filepath: id [] */
			},
			m_id_f = {
				/* id: filepath */
			};

		const m_empty_id_kp = {};

		let count = 0;
		const genID = () => `_${count++}`;

		const filepaths = await glob(join(fp, isIntergration ? "/**" : "/*"));

		const id_imported = new Set();

		const dir_kps = [];

		for (let f of filepaths) {
			if (normalize(f) === normalize(fp)) continue;

			const dir_name = dirname(f);
			const filename = basename(f, extname(f));
			const is_dir = isDir(f);
			const kp = relative(fp, is_dir ? f : join(dir_name, filename));

			if (!is_dir) {
				if (validKeyPath(kp)) {
					const exports = await getFlatExports(f);
					const ids = m_f_ids[f] || new Set();

					m_f_exports[f] = exports;
					m_f_ids[f] = ids;

					if (validKeyPath(filename)) {
						const kp = relative(fp, join(dir_name, filename));

						// The default export has a lower priority.
						if (!m_kp_id[kp]) {
							const id = genID();

							id_imported.add(id);
							ids.add(id);

							m_id_f[id] = f;
							m_kp_id[kp] = id;
							m_id_kp[id] = kp;
							m_id_isDefault[id] = true;
						}
					}

					dualEach(exports)((_, { names }) => {
						for (const name of names) {
							const kp = relative(fp, join(dir_name, name));

							// named export has a higher priority
							const id = m_kp_id[kp] || genID();

							ids.add(id);
							id_imported.add(id);
							if (id_imported.has(id)) {
								let f = m_id_f[id];
								m_f_ids[f].delete(id);
							}

							m_kp_id[kp] = id;
							m_id_kp[id] = kp;
							m_id_isDefault[id] = false;
						}
					});
				} else {
				}
			} else {
				dir_kps.push(kp);
			}
		}

		const finalKps = nIntersection(
			filterFinalKeyPath([...dir_kps, ...Object.values(m_id_kp)]),
			dir_kps
		);

		finalKps.map(kp => {
			if (kp.split("/").length === 1) {
				const id = genID();
				m_empty_id_kp[id] = kp;
			}
		});

		// Generate the code of virtual-module.
		const lines = [];
		const summary = {};

		const importer_named = {};
		const importer_default = {};

		dualEach(m_f_ids)((f, ids) => {
			for (const id of ids) {
				if (m_id_isDefault[id]) {
					importer_default[f] = id;
				} else {
					const kp = m_id_kp[id];
					const name = basename(kp);
					const map = importer_named[f] || [];
					importer_named[f] = map;
					map.push([name, id]);
				}
			}
		});

		dualEach(importer_default)((f, id) => {
			const line = `import ${id} from "${f}";`;
			lines.push(line);
		});
		dualEach(importer_named)((f, map) => {
			const raw = map.map(([name, id]) => `${name} as ${id}`).join(", ");
			const line = `import { ${raw} } from "${f}";`;
			lines.push(line);
		});

		const exports_named = [];
		dualEach(m_id_kp)((id, kp) => {
			if (kp.split("/").length === 1) {
				exports_named.push([id, kp]);
			}
			setByPath(summary, id, kp);
		});

		const exports_empty = [];
		dualEach(m_empty_id_kp)((id, kp) => {
			if (kp.split("/").length === 1) {
				exports_empty.push([id, kp]);
			}
			setByPath(summary, id, kp);
		});

		const exports_empty_raw = exports_empty
			.map(([id, kp]) => `${id} = {}`)
			.join(",");

		const empty_defintion =
			exports_empty_raw === "" ? "" : `const ${exports_empty_raw};\n`;

		exports_named.push(...exports_empty);
		const exports_named_raw = exports_named
			.map(([id, kp]) => `${id} as ${kp}`)
			.join(", ");

		const code_named_exports =
			exports_named_raw === ""
				? ""
				: `export { ${exports_named_raw} };\n`;

		const code_import = lines.join("\n");

		const pkg_raw = JSON.stringify(summary).replace(
			/"([^"]+)":"([^"]+)"/g,
			`"$1": $2`
		);

		const code_default_export = `export default ${pkg_raw};\n`;

		const code = [
			code_import,
			empty_defintion,
			code_default_export,
			code_named_exports
		].join("\n");

		module = { code };

		return isIntergration
			? (cache_intergration[fp] = module)
			: (cache_combine[fp] = module);
	};
}

function validKeyPath(kp) {
	return kp.split("/").reduce((t, k) => validIdent(k) && t, true);
}

function filterFinalKeyPath(kps) {
	return kps.filter(kp =>
		kps.reduce((ok, kpa) => ok && (kp === kpa || !kpa.startsWith(kp)), true)
	);
}

function nIntersection(...arrs) {
	const ok = new Map();
	const result = [];
	for (let arr1 of arrs) {
		for (let arr2 of arrs) {
			if (arr1 === arr2) continue;

			let left = arr1.length > arr2.length;
			let arr = left ? arr1 : arr2;
			let arra = left ? arr2 : arr1;

			for (let v of arr) {
				if (!ok.has(v)) {
					ok.set(v, true);
				} else if (!ok.get(v)) {
					continue;
				}
				if (!arra.includes(v)) {
					ok.set(v, false);
				}
			}
		}
	}
	for (let [k, b] of ok.entries()) {
		if (b) {
			result.push(k);
		}
	}
	return result;
}
