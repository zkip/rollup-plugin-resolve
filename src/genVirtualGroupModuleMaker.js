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
const entries = Object.entries;
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

	const { getExports, clear: exportAnalayzer_clear } = genExportAnalyzer();

	async function getVirtualModule(fp, isIntergration) {
		if (!isDir(fp)) return null;

		let module = isIntergration
			? cache_intergration.get(fp)
			: cache_combine.get(fp);

		if (module) return module;

		const m_empty = new Set(); // Set<ID>
		const m_all = new Set(); // Set<StylizedPath>
		const m_f_ids = {
			/* { StylizedPath: ID[] } */
		};
		const m_defaults = {
			/* ID: StylizedPath */
		};
		const m_id_name = {
			/* { ID: name } */
		};
		const m_kp_id = {
			/* KeyPath: ID */
		};

		const genID = ((count = 0) => () => `_${count++}`)();

		const filepaths = await glob(join(fp, isIntergration ? "/**" : "/*"));

		const kpExported = new Set();

		for (let f of filepaths) {
			if (normalize(f) === normalize(fp)) continue;

			const dir_name = dirname(f);
			const filename = basename(f, extname(f));
			const is_dir = isDir(f);
			const kp = relative(fp, is_dir ? f : join(dir_name, filename));

			if (!is_dir) {
				const { isDefault, exports } = await getExports(f);

				if (!isIntergration) {
					m_all.add(f);

					await dualAll(exports)((name, source) => {
						const kp = relative(fp, join(dir_name, name));

						if (kpExported.has(kp)) {
							// TODO: need more information for error
							throw new ResolveError(
								ERR_EXPORT_CONFLICT,
								`Export conflict.`
							);
						}

						kpExported.add(kp);

						// named export has a higher priority
						let id = m_kp_id[kp];
						if (m_kp_id[kp]) {
							m_empty.delete(id);
							delete m_defaults[id];
						} else {
							id = genID();
						}

						if (name !== "*") {
							m_id_name[id] = kp;
						}

						m_kp_id[kp] = id;
						(m_f_ids[f] = m_f_ids[f] || new Set()).add(id);
					});

					if (validKeyPath(kp) && !m_kp_id[kp]) {
						// The default export has a lower priority.
						const id = genID();

						m_id_name[id] = kp;
						m_kp_id[kp] = id;
						if (isDefault) {
							m_defaults[id] = f;
						} else {
							m_empty.add(id);
						}
					}
				} else {
					if (validKeyPath(kp)) {
						// TODO:
					}
				}
			} else {
				if (isIntergration && validKeyPath(kp)) {
					// TODO:
				}
			}
		}

		// Generate the code of virtual-module.
		const code = await genCode({
			m_empty,
			m_all,
			m_f_ids,
			m_defaults,
			m_id_name,
			m_kp_id
		});

		module = { code };

		console.log(code);

		isIntergration
			? cache_intergration.set(fp, module)
			: cache_combine.set(fp, module);

		return module;
	}

	return {
		getVirtualModule,
		clear() {
			cache_combine.clear();
			cache_intergration.clear();
			exportAnalayzer_clear();
		}
	};
}

const to_basepath = f => (isAbsolute(f) ? f : join("@", f));

async function genCode({
	m_f_ids,
	m_defaults,
	m_id_name,
	m_empty,
	m_all,
	m_kp_id
}) {
	// Generate the code of virtual-module.

	console.log(m_f_ids, m_defaults, m_id_name, m_empty, m_all, m_kp_id);

	const import_named_frag = (
		await dualAll(m_f_ids)((f, ids) => {
			const transform = ids =>
				ids.map(id => `${m_id_name[id]} as ${id}`).join(", ");
			return `import {${transform(Array.from(ids))}} from "${f}";`;
		})
	).join("\n");

	const import_default_frag = (
		await dualAll(m_defaults)((id, f) => `import ${id} from "${f}";`)
	).join("\n");

	const declarate_frag = "const $;".replace(
		"$",
		Array.from(m_empty)
			.map(id => `${id} = {}`)
			.join(", ")
	);

	const export_all_frag = !m_all
		? ""
		: Array.from(m_all)
				.map(f => `export * from "${f}";`)
				.join("\n");

	const export_default_frag = !m_kp_id
		? ""
		: "export default $;".replace(
				"$",
				JSON.stringify(
					entries(m_kp_id).reduce(
						(summary, [kp, id]) => (
							setByPath(summary, id, kp), summary
						),
						{}
					)
				).replace(/"([^"]+)":"([^"]+)"/g, `"$1": $2`)
		  );

	return [
		import_named_frag,
		import_default_frag,
		declarate_frag,
		export_all_frag,
		export_default_frag
	]
		.filter(Boolean)
		.join("\n");
}
