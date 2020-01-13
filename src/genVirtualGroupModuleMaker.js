import { promisify } from "util";
import _glob from "glob";
import genExportAnalyzer from "./genExportAnalyzer";
import { ERR_EXPORT_CONFLICT, ResolveError } from "./errors";
import {
	validIdent,
	setByPath,
	isDir,
	dualEach,
	dualAll,
	nIntersection
} from "./util";
import {
	join,
	normalize,
	dirname,
	relative,
	basename,
	extname,
	isAbsolute
} from "path";

const glob = promisify(_glob);

const assign = Object.assign;
const combine = (...os) => assign({}, ...os);
const validKeyPath = kp =>
	kp.split("/").reduce((t, k) => validIdent(k) && t, true);
const filterFinalKeyPath = kps =>
	kps.filter(kp =>
		kps.reduce((ok, kpa) => ok && (kp === kpa || !kpa.startsWith(kp)), true)
	);

export default function genVirtuaGrouplModuleMaker({ candidateExt }) {
	// filepath: VirtualCombineModule
	// The filepath is absolute or relative with cwd.
	const cache_combine = new Map();
	// filepath: VirtualIntergrationModule
	// The filepath's type is same with above.
	const cache_intergration = new Map();

	const { getFlatExports } = genExportAnalyzer();

	async function getVirtualModule(fp, isIntergration, isBeing) {
		if (!isBeing)
			console.log("--------------------------------------", fp);
		if (!isDir(fp)) return null;

		let module = isIntergration
			? cache_intergration.get(fp)
			: cache_combine.get(fp);

		if (module) return module;

		// The keypath must be valid.
		const m_id_kp = {
			/* id: keypath */
		};
		const m_kp_id = {
			/* keypath: id */
		};
		const m_id_isDefault = {
			/* id: isDefault */
		};
		const m_f_ids = {
			/* filepath: Set */
		};
		const m_id_f = {
			/* id: filepath */
		};
		const m_kp_ps = {
			/* path: keypath Set*/
		};

		const m_empty_id_kp = {};

		const genID = ((count = 0) => () => `_${count++}`)();

		const filepaths = await glob(join(fp, isIntergration ? "/**" : "/*"));

		const id_imported = new Set();

		const dir_kps = [];
		const not_default_kps = [];

		// { name: Set }
		const name_source = {};

		for (let f of filepaths) {
			if (normalize(f) === normalize(fp)) continue;

			const dir_name = dirname(f);
			const filename = basename(f, extname(f));
			const is_dir = isDir(f);
			const kp = relative(fp, is_dir ? f : join(dir_name, filename));

			if (!isBeing)
				console.log("XXXXXXXXXXXXXXXXXXXXXXXX", fp, f, filepaths);


			if (!is_dir) {
				const exports = await getFlatExports(f, candidateExt, {
					getVirtualModule: (fp, isIntergration) => getVirtualModule(fp, isIntergration, true)
				});
				if (!isBeing)
					console.log("OOOOOOOOOOOOOOOOOOOOOOOOO", f, exports);

				const ids = m_f_ids[f] || new Set();

				m_f_ids[f] = ids;

				if (!isIntergration) {
					await dualAll(exports)((p, { names }) => {
						for (const name of names) {
							const kp = relative(fp, join(dir_name, name));

							const ns = name_source[name] || new Set();
							name_source[name] = ns;

							const kpps = m_kp_ps[p] || new Set();
							m_kp_ps[p] = kpps;

							// named export has a higher priority
							let id = m_kp_id[kp] || genID();

							if (!isBeing) {
								// console.log("%%%%%%%%%%%%%");
								// console.log(p, names);
							}

							kpps.add(kp);

							// console.log(
							// 	relative(process.cwd(), f),
							// 	relative(process.cwd(), p),
							// 	id,
							// 	kp,
							// 	"@@@@@@@@@@@@@@"
							// );

							if (!m_id_isDefault[id] && f !== p) { ns.add(p); }

							if (ns.size > 1) {
								// TODO: need more information for error
								throw new ResolveError(
									ERR_EXPORT_CONFLICT,
									`Export conflict.`
								);
							}

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
						if (!m_kp_id[kp]) {
							if (exports[f].isDefault) {
								// The default export has a lower priority.
								const id = genID();

								id_imported.add(id);
								ids.add(id);

								m_id_f[id] = f;
								m_kp_id[kp] = id;
								m_id_kp[id] = kp;
								// m_kp_isDefault[kp] = true;
								m_id_isDefault[id] = true;
							} else {
								not_default_kps.push(kp);
							}
						}
					}
				} else {
					if (validKeyPath(kp)) {
						const id = genID();

						ids.add(id);

						m_id_f[id] = f;
						m_kp_id[kp] = id;
						m_id_kp[id] = kp;
						m_id_isDefault[id] = exports[f].isDefault;
					}
				}
			} else {
				if (isIntergration && validKeyPath(kp)) {
					dir_kps.push(kp);
				}
			}
		}

		const finalKps = nIntersection(
			filterFinalKeyPath([...dir_kps, ...Object.values(m_id_kp)]),
			dir_kps
		);

		[...finalKps, ...not_default_kps].map(
			kp => (m_empty_id_kp[genID()] = kp)
		);
		if (!isBeing)
			console.log(m_f_ids, m_id_kp, m_id_f, "@@@@@@@@@@@@", fp);

		// Generate the code of virtual-module.
		const code = await genCode(
			{ m_f_ids, m_id_kp, m_empty_id_kp, m_id_isDefault },
			isIntergration
		);

		module = { code };

		isIntergration
			? cache_intergration.set(fp, module)
			: cache_combine.set(fp, module);

		if (!isBeing) {
			// console.log("////////////////////////////////");
			// console.log(cache_combine);
			// console.log(module);
			// console.log(m_kp_ps);
			console.log("++++++++++++++++++++++++++++++++++++++++++", fp);
		}
		return module;
	}

	return getVirtualModule;
}

const to_flagpath = f => (isAbsolute(f) ? f : join("@", f));

async function genCode(
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

	await dualAll(m_f_ids)((f, ids) => {
		for (const id of ids) {
			if (id in m_id_isDefault) {
				if (m_id_isDefault[id]) {
					importer_default[f] = id;
				} else {
					const kp = m_id_kp[id];
					exports_empty.push([id, kp]);
				}
			} else if (!isIntergration) {
				const kp = m_id_kp[id];
				const name = basename(kp);
				const map = importer_named[f] || [];
				importer_named[f] = map;
				map.push([name, id]);
			}
		}
	});

	await dualAll(importer_default)((f, id) =>
		import_lines.push(`import ${id} from "${to_flagpath(f)}";`)
	);

	await dualAll(m_empty_id_kp)((id, kp) => exports_empty.push([id, kp]));

	const exports_empty_raw = exports_empty
		.map(([id]) => `${id} = {}`)
		.join(",");

	const code_empty_defintion =
		exports_empty_raw === "" ? "" : `const ${exports_empty_raw};\n`;

	if (isIntergration) {
		const code_import = import_lines.join("\n") + "\n";
		await dualAll(combine(m_id_kp, m_empty_id_kp))((id, kp) =>
			setByPath(summary, id, kp)
		);
		const summary_raw = JSON.stringify(summary).replace(
			/"([^"]+)":"([^"]+)"/g,
			`"$1": $2`
		);

		const code_default_export = `export default ${summary_raw};\n`;

		return [code_import, code_empty_defintion, code_default_export]
			.filter(Boolean)
			.join("\n");
	}

	await dualAll(importer_named)((f, map) => {
		const rel_f = to_flagpath(f);
		const raw = map.map(([name, id]) => `${name} as ${id}`).join(", ");
		import_lines.push(`import { ${raw} } from "${rel_f}";`);
	});

	await dualAll(m_id_kp)((id, kp) => exports_named.push([id, kp]));

	const code_import = import_lines.join("\n") + "\n";

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
