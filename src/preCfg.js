export default {
	sapper: {
		exclude: [
			/svelte\/internal/,
			/\.\/(internal|shared)/,
			/(@sapper)|svelte/
		],
		basedir: "src",
		candidateExt: ["js", "svelte"]
	}
};
