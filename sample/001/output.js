import peoples from '{./lib/peoples}';

const version = "0.0.5";



var lib = /*#__PURE__*/Object.freeze({
	version: version
});

console.log(lib, peoples);
function hello() {
	return "Hello";
}

export { hello };
