# rollup-plugin-resolve

![npm (scoped)](https://img.shields.io/npm/v/@zrlps/rollup-plugin-resolve) [![codecov](https://codecov.io/gh/zkip/rollup-plugin-resolve/branch/zero/graph/badge.svg)](https://codecov.io/gh/zkip/rollup-plugin-resolve)

Resolve plugin for rollupjs.

This plugin allows to you define a base point of a project so that you can have addtional patterns for searching files.

It provides the following patterns:

-   Base
-   Combine
-   Integration
-   Variable
-   Navigator

### Base import

This pattern allows you to use a custom base point, and use `@` to indicate its position the base point when importing. In this way, we have a base point that we can refer to.

We can set the base point in 'option' to do so by specifying the `option.base` option. `option.base` can be set to any valid path, which is represented as a relative path starting with 'process.cwd()' unless it is an absolute path.Make sure that its point is a valid directory, or it will report an error before it works properly.

> Note: @ indicates a placeholder. Any path connection must be separated by ` / ', which can also be distinguished from the scoped package in the NPM package management system.

Look at this case:

```
PROJECT
	rollup.config.js
	src
        util
        	path.js
			math.js
		app
			main.js
```

```js
// PROJECT/rollup.config.js
...
plugins: [
    resolve({
        base: "src"
    })
]
...
```

```js
// PROJECT/src/app/main.js
import path from "@/util/path";
import math from "@/util/math";
import config from "@/../rollup.config.js";
```

### Combine import

Comine import allows you to import a folder. Its semantics are determined by the option `option.dirBehaviour`.

Its options are any of the following enumeration values:

-   "es6"
-   "collective"
-   "auto"

###### `es6`

This is the default folder import behavior of ES6. It looks for a file of index.js in the target folder and exports it. If it is not found, it will cause an error.

###### `collective`

It combines the exports of all valid files in the target folder to export together, and the default exports in valid files will be named corresponding file names for export. When it is the same as the identity of named exports in other valid files in the folder, named exports have a higher priority.

```
PROJECT
	pkg
		a.js export const x = 0;
		x.js export default 10;
	main.js

// main.js
import { x } from "./pkg";
x // 0
```

It should be noted that the identity of named exports in multiple files in the same folder may be duplicate, which is considered an error.

```
PROJECT
	pkg
		a.js export const x = 1;
		b.js export const x = 2;
	main.js

// main.js
import { x } from "./pkg"; // Error
```

In addition, the identity declared by `ExportAll` may be the same as the named export in the target folder. Like ES6, this situation will not lead to an error, and it will choose the identity with the highest priority as the final result.

If the `NamedExport` in the target file is called "local export" and the export declared by `ExportAll` is called "remote export", you can specify that "local export" has a higher priority.

```
PROJECT
	pkg
		a.js export const x = 1;
		b.js export * from "./lib";
		lib
			c.js export x = 2;

// main.js
import { x } from "./pkg";
x // 1
```

About the valid files:
If the name of the file conforms to the "ecma262 identifier naming specification"<sup>[es]</sup> and the extension is valid, then it is a valid file.

About the valid extensions:
The valid extension name is any one of `"js","mjs","node","json"`, and you can specify an additional extension name through `option.candidateExt`.

> Note: even if the file name is invalid, the named export in it will still be exported.

```
// option.dirBehaviour: "collective"

PROJECT
	pkg
		@a.js export x = 3;

// main.js
import { x } from "./pkg"
x // 3
```

###### `auto`

This method will automatically select between ES6 and collective. If there is a file of index.js in the target folder, it will follow the semantics of ES6, otherwise it will follow the semantics of collective.

> Note: when using this option, the import syntax will have multiple semantics. The user must handle the files in the target folder carefully, otherwise it may bring unexpected results. Therefore, this option is not recommended.

### Variable import

You can set some path variables in options and use `$` to reference these variables when importing. The plug-in will check these variables before normal operation. If it finds invalid path variables, it will cause errors.

Use `option.variables` to set variables. It is an Object. Key represents the name of variable ("ecma262 identifier naming specification"<sup>[es]</sup> compliant), and value represents the corresponding path. Like base import, unless it is an absolute path, it represents the relative path starting from "process.cwd()".

Use case:

```
PROJECT
	rollup.config.js
	asset
		images
			cat.png
		icons
			heart.ico
	data
	src
		util
			async
				timeout
		main.js
```

```js
// rollup.config.js
...
plugins: [
	resolve({
		variables: {
			data: "data",
			images: "asset/images",
			icons: "asset/icons",
			async: "src/util/async",
		}
	})
]
...
```

```js
import data from "$data"; // data
import cat from "$images/cat.png"; // asset/images/cat.png
import heart from "$icons/heart.ico"; // asset/icons/heart.ico
import timeout from "$async/timeout"; // src/util/async/timeout
```

###### Internal variables

The plug-in has built-in variables that do not need to be referenced with `$`.

-   The `~` represents the environment variable home in the system, which cannot be changed.
-   The `@` represents base, see `Base import`.

```
import conf from "~/config.js";
import conf from "@/config.js";
```

### Integration import

`Integration import` will recursively organize the default exports of the target folder and all valid files in the valid folder into one object for export. Similar to combine, the default exports in the file will be named as the name of the file. If there is no default export in the file, it will still be regarded as an empty object `{}`. Similarly, invalid files and folders will be ignored. Note that when a folder is ignored, all files under the folder and its subfolders will not be exported.

This is useful when exporting large amounts of structured data.

```
PROJECT/data/Animal
	Invertebrates
		CellularLevel.js export default {}
		TissueLevel.js export default {}
		OrganLevel
			Acoelomata
				Platyhelminthes
					TaeniaSolium.js
					Schistosoma.js export default []
				Nematoda
					Pinworm.js export default {}
			Coelmata
				Annelida.js export default {}
				Arthropoda.js export default {}
				Mollusca.js export default {}
				Echinodermata.js export default {}
	Vertebrate.js export default {}
```

```js
import Animal from "{@/data/Animal}";
/*
	{
		Interebrates{
			CellularLevel: {},
			TissueLevel: {},
			OrganLevel: {
				Acoelomata: {
					Platyhelminthes: {
						TaeniaSolium: {},
						Schistosoma: [],
					}
					Nematoda: {
						Pinworm: {}
					}
				}
				Coelmata: {
					Annelida: {},
					Arthropoda: {},
					Mollusca: {},
					Echinodermata: {},
				}
			}
		}
		Vertebrate: {}
	}
*/
```

### Navigator

You can use navigational paths everywhere (in all of the above modes), but placeholders (like `$`,`@` etc.) and variables must be first.

```
import a from "@/../";
import b from "{@/../a/../a/..};
import c from "{@/../a/../a/../};
import d from "$res/../icon/d.ico;
import e from "{$data/../animal}";
import f from "~/../../../../../../";
```
