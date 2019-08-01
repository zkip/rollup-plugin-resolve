const version = "0.0.5";



var lib = /*#__PURE__*/Object.freeze({
	version: version
});

var jackie = {
	name: "Jackie",
	age: 34
};

var Jhons_JhonThom = {
	name: "JhonThom",
	age: 12
};

var Jhons_older_JessJhon = {
	name: "JessJhon",
	age: 71
};

const rst={jackie:jackie,Jhons:{JhonThom:Jhons_JhonThom,older:{JessJhon:Jhons_older_JessJhon}}};

console.log(lib, rst);
function hello() {
	return "Hello";
}

export { hello };
