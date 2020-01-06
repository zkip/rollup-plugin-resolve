import { promisify } from "util";
import { validIdent, setByPath, isDir, dualEach } from "./util";
import {
	join,
	normalize,
	dirname,
	relative,
	basename,
	extname,
	resolve,
	isAbsolute
} from "path";
import genExportAnalyzer from "./genExportAnalyzer";

import _glob from "glob";

const glob = promisify(_glob);

const assign = Object.assign;

export default function genVirtuaGrouplModuleMaker() {
	// filepath: VirtualCombineModule
	// The filepath is absolute or relative with cwd.
	const cache_combine = new Map();
	// filepath: VirtualIntergrationModule
	// The filepath's type is same with above.
	const cache_intergration = new Map();

	const { getFlatExports } = genExportAnalyzer();

	return async (fp, isIntergration) => {
		if (!isDir(fp)) return null;

		let module = isIntergration
			? cache_intergration.get(fp)
			: cache_combine.get(fp);

		if (module) return module;

		// The keypath must be valid.
		const m_id_kp = {
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

		const not_default_kps = [];

		for (let f of filepaths) {
			if (normalize(f) === normalize(fp)) continue;

			const dir_name = dirname(f);
			const filename = basename(f, extname(f));
			const is_dir = isDir(f);
			const kp = relative(fp, is_dir ? f : join(dir_name, filename));

			if (!is_dir) {
				const exports = await getFlatExports(f);
				const ids = m_f_ids[f] || new Set();

				m_f_exports[f] = exports;
				m_f_ids[f] = ids;

				dualEach(exports)((_, { names }) => {
					for (const name of names) {
						const kp = relative(fp, join(dir_name, name));

						// named export has a higher priority
						const id = m_kp_id[kp] || genID();

						if (id_imported.has(id)) {
							let f = m_id_f[id];
							m_f_ids[f] && m_f_ids[f].delete(id);
						}
						ids.add(id);
						id_imported.add(id);

						m_kp_id[kp] = id;
						m_id_kp[id] = kp;
						delete m_id_isDefault[id];
					}
				});
				if (validKeyPath(kp)) {
					if (exports[f].isDefault) {
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
					} else {
						not_default_kps.push(kp);
					}
				} else {
				}
			} else {
				if (isIntergration) {
					dir_kps.push(kp);
				}
			}
		}

		const finalKps = nIntersection(
			filterFinalKeyPath([...dir_kps, ...Object.values(m_id_kp)]),
			dir_kps
		);

		console.log(finalKps, m_id_kp, m_kp_id, dir_kps, "&&&&&&&&&&&&&&&&7");

		[...finalKps, ...not_default_kps].map(
			kp => (m_empty_id_kp[genID()] = kp)
		);

		// Generate the code of virtual-module.
		const code = genCode(
			{ m_f_ids, m_id_kp, m_empty_id_kp, m_id_isDefault },
			isIntergration
		);
		module = { code };

		isIntergration
			? cache_intergration.set(fp, module)
			: cache_combine.set(fp, module);
		return module;
	};
}

const to_flagpath = f => (isAbsolute(f) ? f : join("@", f));

function genCode(
	{ m_f_ids, m_id_kp, m_empty_id_kp, m_id_isDefault },
	isIntergration
) {
	// Generate the code of virtual-module.
	const summary = {};
	const import_lines = [];

	const importer_named = {};
	const importer_default = {};

	const exports_named = [];
	const exports_empty = [];

	dualEach(m_f_ids)((f, ids) => {
		for (const id of ids) {
			if (m_id_isDefault[id]) {
				importer_default[f] = id;
			} else if (!isIntergration) {
				const kp = m_id_kp[id];
				const name = basename(kp);
				const map = importer_named[f] || [];
				importer_named[f] = map;
				map.push([name, id]);
			}
		}
	});

	console.log(
		m_id_isDefault,
		m_empty_id_kp,
		"UUUUUUUU",
		m_id_kp,
		importer_named
	);
	dualEach(importer_default)((f, id) =>
		import_lines.push(`import ${id} from "${to_flagpath(f)}";`)
	);
	if (isIntergration) {
		const code_import = import_lines.join("\n") + "\n";
		dualEach(assign(m_id_kp, m_empty_id_kp))((id, kp) =>
			setByPath(summary, id, kp)
		);
		const summary_raw = JSON.stringify(summary).replace(
			/"([^"]+)":"([^"]+)"/g,
			`"$1": $2`
		);

		const code_default_export = `export default ${summary_raw};\n`;

		return [
			code_import,
			code_empty_defintion,
			code_default_export,
			code_named_exports
		].join("\n");
	}

	dualEach(importer_named)((f, map) => {
		const rel_f = to_flagpath(f);
		const raw = map.map(([name, id]) => `${name} as ${id}`).join(", ");
		import_lines.push(`import { ${raw} } from "${rel_f}";`);
	});

	dualEach(m_id_kp)((id, kp) => exports_named.push([id, kp]));
	dualEach(m_empty_id_kp)((id, kp) => exports_empty.push([id, kp]));

	const code_import = import_lines.join("\n") + "\n";

	const exports_empty_raw = exports_empty
		.map(([id]) => `${id} = {}`)
		.join(",");

	const code_empty_defintion =
		exports_empty_raw === "" ? "" : `const ${exports_empty_raw};\n`;

	exports_named.push(...exports_empty);

	const exports_named_raw = exports_named
		.map(([id, kp]) => `${id} as ${kp}`)
		.join(", ");

	const code_named_exports =
		exports_named_raw === "" ? "" : `export { ${exports_named_raw} };\n`;

	return [code_import, code_empty_defintion, code_named_exports]
		.filter(Boolean)
		.join("\n");
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
