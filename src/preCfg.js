export default {
	sapper: {
		exclude: [/(svelte\/internal)/, /\.\/(internal|shared)/],
		basedir: "src",
		candidateExt: ["js", "svelte"]
	}
};
