# rollup-plugin-resolve

![npm (scoped)](https://img.shields.io/npm/v/@zrlps/rollup-plugin-resolve) [![codecov](https://codecov.io/gh/zkip/rollup-plugin-resolve/branch/zero/graph/badge.svg)](https://codecov.io/gh/zkip/rollup-plugin-resolve)

Rollup 的 resolve 插件。

这个插件让你可以定义一个项目的起点，使得你可以拥有额外的搜寻文件的模式。
它提供了：

-   Base 起点
-   Combine 组合
-   Integration 集成
-   Variable 自定义变量
-   Navigator 导航

## Base import

这种方式允许你使用一个自定义的起点，在导入时使用`@`来表示起点的位置。这样一来我们就拥有了一个可以参照的起点。

我们可以在 `选项` 中设置它表示的起点，通过指定`option.base`选项来达到这一点。`option.base`可以设定为任意有效路径，除非它是绝对路径，否则它将表示为以`process.cwd()`为起点的相对路径。请确保它的指向是一个有效的目录，否则它会在正常工作之前报告错误。

> 注意：@表示占位符，与任何路径连接必须使用`/`进行分隔，这样也可以和 npm 包管理体系中的 scoped package 区分开来。

看下面的例子：

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

## Combine import

Comine import 允许你导入一个文件夹。它的语义由选项 `option.dirBehaviour` 来决定。

`option.dirBehaviour` 的选项为以下枚举值中的任何一个：

-   "es6"
-   "collective"
-   "auto"

### `es6`

这是 es6 默认的文件夹导入行为。它会寻找目标文件夹中的一个 index.js 的文件并将该文件导出，如果没有找到则会导致错误。

### `collective`

它将目标文件夹中的所有有效的文件中的导出组合在一起进行导出，并且有效文件中的默认导出会被命名为对应的文件名进行导出，当它与该文件夹中的其它有效文件中的具名导出的标识相同时，具名导出具有更高的优先级。

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

需要注意的是，同一个文件夹中的多个文件中的具名导出的标识可能会重复，这种情况被视为一个错误。

```
PROJECT
	pkg
		a.js export const x = 1;
		b.js export const x = 2;
	main.js

// main.js
import { x } from "./pkg"; // Error
```

另外，ExportAll 声明的标识可能与目标文件夹中的具名导出相同，就像 es6 那样，这种情况不会导致错误，它会选择一个优先级最高的标识作为最终结果。
如果称目标文件中的具名导出为“本地导出”，ExportAll 声明的导出称为“远程导出”，那么可以规定“本地导出”具有更高的优先级。

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

关于有效的文件：
如果文件的名字符合 ecma262 标识符<sup>[es]</sup>命名规范并且拓展名是有效的，那么它是一个有效的文件。

关于有效的拓展名：
有效的拓展名是`"js","mjs","node","json"`中的任何一个，并且可以通过选项 `option.candidateExt` 来指定额外的拓展名。

> 注意：即便文件名不是有效的文件，仍会导出其中的具名导出。

```
// option.dirBehaviour: "collective"

PROJECT
	pkg
		@a.js export x = 3;

// main.js
import { x } from "./pkg"
x // 3
```

### `auto`

这种方式会在 es6 和 collective 中自动进行选择，如果目标文件夹中有一个 index.js 的文件，它将遵循 es6 的语义，否则它遵循 collective 的语义。

> 注意：在使用这个选项时，导入语法将具有多重语义，使用者必须小心的处理目标文件夹中的文件，否则可能带来非预期的结果，因此不建议使用这个选项。

## Variable import

你可以在 options 中设定一些路径变量，在导入时使用`$`来引用这些变量。该插件在正常工作前会对这些变量进行检查，如果发现无效的路径变量，将会导致错误。

使用 `option.variables` 来设定变量。它是一个对象，key 表示变量的名字(符合 ecma262 标识符<sup>[es]</sup>命名规范)，value 表示对应的路径，与 base import 一样，除非是绝对路径，否则它表示以`process.cwd()`为起点的相对路径。

使用案例：

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

### Internal variables

该插件内置了一些变量，它们不需要使用`$`进行引用。

-   `~`表示该系统中的环境变量 HOME，无法更改
-   `@`表示 base，见`Base import`

```js
import conf from "~/config.js";
import conf from "@/config.js";
```

## Integration import

Integration import 会递归地将目标文件夹以及有效文件夹中的所有有效文件的默认导出组织成一个对象进行导出，与 Combine 类似，文件中的默认导出将会被命名为该文件的名字，如果文件中没有默认导出，那么它会被仍然会被视作导出为空对象`{}`。同样的，无效的文件和文件夹会被忽略，需要注意的是，当文件夹被忽略时，该文件夹及其子文件夹下所有的文件都不会被导出。

这在导出大量结构性的数据时非常有用。

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

## Navigator

在任何地方（以上的所有模式中），你都可以使用导航式的路径来表示，但是占位符和变量必须处于第一位。

```
import a from "@/../";
import b from "{@/../a/../a/..};
import c from "{@/../a/../a/../};
import d from "$res/../icon/d.ico;
import e from "{$data/../animal}";
import f from "~/../../../../../../";
```

### type Option

```typescript
type Option {
	base URL.Path
	dirBehaviour "es6" | "collective" | "auto"
	variables { key Identity: value URL.Path }
	candidateExt: []string
}
```

[es]: https://tc39.es/ecma262/#prod-IdentifierName
