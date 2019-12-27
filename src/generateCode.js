import { promisify } from "util";
import fs from "fs";
import _glob from "glob";
import { join } from "path"

const glob = promisify(_glob);
const readFile = promisify(fs.readFile);

export default async ({ fulId, vId, isIntegration }, codes, options) => {
	let files = await glob(join(fulId, "/*"));
	const acornOptions = Object.assign({ sourceType: "module" }, options.acorn);
	let code;
	if (isIntegration) {
		code = await resolveTreeDep(fulId);
	} else {
		const lines = await Promise.all(
			files.map(async (fp, index) => {
				if (isDir(fp)) {
					// ignore
				} else {
					const code = await readFile(fp, "utf8");
					const lines = [];
					const namedExports = [];
					for (const node of this.parse(code, acornOptions).body) {
						const { type } = node;
						if (type === "ExportAllDeclaration") {
							let from = node.source.value;
							if (from.startsWith(".")) {
								from = `./${path
									.join(path.dirname(fp), from)
									.split(path.sep)
									.join("/")}`;
							}
							lines.push(`export * from ${JSON.stringify(from)};`);
						} else if (type === "ExportDefaultDeclaration") {
							const exported = options.renamer(null, fp);
							if (exported) {
								lines.push(`import _${index} from ${JSON.stringify(fp)};`);
								lines.push(`export {_${index} as ${exported}};`);
							}
						} else if (type === "ExportNamedDeclaration") {
							for (const specifier of node.specifiers) {
								namedExports.push(specifier.exported.name);
							}
							if (node.declaration) {
								for (const declaration of node.declaration.declarations || [
									node.declaration
								]) {
									namedExports.push(declaration.id.name);
								}
							}
						}
					}
					const nameMapping = [];
					for (const name of namedExports) {
						const exported = options.renamer(name, fp);
						if (exported) {
							nameMapping.push(`${name} as ${exported}`);
						}
					}
					if (nameMapping.length > 0) {
						lines.push(
							`export {${nameMapping.join(", ")}} from ${JSON.stringify(fp)}`
						);
					}
					if (lines.length === 0) {
						lines.push(`import ${JSON.stringify(fp)};`);
					}
					return lines.join("\n");
				}
			})
		);
		code = lines.join("\n");
	}
	codes.set(vId, code);
	return vId;
}