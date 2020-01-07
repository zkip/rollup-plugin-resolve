
const genConstantMaker = (c = 0) => () => c++

const gen = genConstantMaker();

export const ERR_EXPORT_CONFLICT = "EXPORT_CONFLICT";

export class CombineExportError extends Error {
	constructor(code, message) {
		super(`@zrlps/resolve: ${code}: ${message}`);
		this.code = code;
	}
}
