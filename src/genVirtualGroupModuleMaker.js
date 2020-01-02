import { promisify } from "util";
import { validIdent, setByPath, isDir, dualEach } from "./util"
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
			};

		let count = 0;
		const genID = () => `_${count++}`;

		const filepaths = await glob(join(fp, isIntergration ? "/**" : "/*"));


		const id_imported = new Set();

		for (let f of filepaths) {
			if (normalize(f) === normalize(fp)) continue;

			let dir_name = dirname(f);
			let is_dir = isDir(f);
			let dir_name_kp = relative(fp, dir_name) || "/"

			console.log(dir_name, dir_name_kp, "@@@@@@@@@@")

			if (!is_dir) {
				if (validKeyPath(dir_name_kp)) {
					const exports = await getFlatExports(f);
					const ids = m_f_ids[f] || new Set();

					m_f_exports[f] = exports;
					m_f_ids[f] = ids;

					const filename = basename(f, extname(f));

					if (validKeyPath(filename)) {
						const kp = relative(fp, join(dir_name, filename));

						// The default export has a lower priority.
						if (!m_kp_id[kp]) {
							const id = genID();

							if (!id_imported.has(id)) {
								id_imported.add(id);
								ids.add(id);
							}

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

							if (!id_imported.has(id)) {
								id_imported.add(id);
								ids.add(id);
							}

							m_kp_id[kp] = id;
							m_id_kp[id] = kp;
							m_id_isDefault[id] = false;
						}
					});
				} else {
				}
			} else {
			}
		}

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

		console.log(m_id_kp, "lllllllllllll");

		const exports_named_raw = exports_named
			.map(([id, kp]) => `${id} as ${kp}`)
			.join(", ");
		const code_named_exports = `export { ${exports_named_raw} };`;

		const code_import = lines.join("\n");

		const pkg_raw = JSON.stringify(summary).replace(
			/"([^"]+)":"([^"]+)"/g,
			`"$1": $2`
		);

		const code_default_export = `export default ${pkg_raw};`;

		const code = [
			code_import,
			code_default_export,
			code_named_exports
		].join("\n\n");

		module = { code };

		console.log(module)

		return isIntergration
			? (cache_intergration[fp] = module)
			: (cache_combine[fp] = module);
	};
}

function validKeyPath(kp) {
	return kp.split("/").reduce((t, k) => validIdent(k) && t, true);
}
