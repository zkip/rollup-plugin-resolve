
export const ERR_EXPORT_CONFLICT = "EXPORT_CONFLICT";
export const ERR_INTERGRATION_TARGET = "INTERGRATION_TARGET";
export const ERR_VARIABLE_MISSING = "VARIABLE_MISSING";
export const ERR_OPTION_INVALID = "OPTION_INVALID";

export class ResolveError extends Error {
	constructor(code, message) {
		super(`@zrlps/resolve: ${code}: ${message}`);
		this.code = code;
	}
}
