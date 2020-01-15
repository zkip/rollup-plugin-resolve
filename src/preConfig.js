export default {
	sapper: {
		exclude: [/(svelte\/internal)/, /\.\/(internal|shared)/],
		base: "src",
		candidateExt: ["svelte"]
	}
};
