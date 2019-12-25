# rollup-plugin-resolve

Resolve plugin for rollupjs.

这个插件让你可以定义一个项目的起点，使得你可以拥有额外的搜寻文件的模式。
它提供了：

- Base 起点
- Combine 组合
- Integration 集成
- Variable 自定义变量
- HOME and Root 绝对定位并使用`HOME`环境变量

### Base import

这种方式允许你使用一个自定义的起点，在导入时使用占位符`@`来表示起点代表的绝对位置。这样一来我们就拥有了一个可以参照的起点。

我们可以在 options 中设置它表示的起点，通过指定`base`选项来达到这一点。`base`选项可以设定为任意有效路径，如果它不以`/`开头，它将表示为以`process.cwd()`为起点的相对路径，请确保它的指向是一个有效的目录，否则它会在正常工作之前报告错误。

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

### Combine import

Combine 允许你在目标目录后加上`/*`表示导入文件夹中所有 js 文件中导出的变量或者函数。当使用解构导入时，它使用优化的方式使得未被引用的导出不会被导入。如果文件的名字符合 ecma262 标识符<sup>[es]</sup>命名规范，那么其中的 default 导出会被命名为对应的文件名而导出。

由于在其它文件中导出的标识符可能与该文件所在的目录的其它文件名相同，具名导出会获得更高的优先权。

> 注意：即便文件名不符合 ecma262 标识符命名规范，只是无法导出该文件的默认导出，但是仍然会导出其它的非默认导出。

查看以下示例：

```
PROJECT
	util
		Async
			timeout.js				export defalut () => {...}, interval()
			all.js					export group(), some()
		Tricks
			太极@无形之术.js		export default {}, 老子之道()
			老子之道()				export default []
		B
			A	export default () => {...}
			B	export const A = [...]
	main.js
```

```js
// main.js
import { timeout, group, some } from "./util/Async/*";
import { 老子之道 } from "./util/Tricks/*";
import { A } from "./util/B";
A; // () => {...}
```

### Variable import

你可以在 options 中设定一些路径变量，在导入时使用`$`来引用这些变量。该插件在正常工作前会对这些变量进行检查，如果发现无效的路径变量，将会抛出错误。

使用 option.variables (object) 来设定变量。它是一个对象，key 代表变量的名字，value (string) 表示对应的路径。与 base import 一样，除非 value 以"/"开头，否则它代表以`process.cwd()`为起点的相对位置。

###### Variable 有效值

有效值以 ecma262 标识符<sup>[es]</sup>命名规范为标准

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

### Integration import

该模式会将文件夹以及它的子文件夹中的文件进行全部导入并且将它们集成到一个对象中，它仅仅导出一个文件中的默认导出，如果文件中没有默认导出，那么它会被仍然会被视作导出为空对象`{}`。同样的，不符合 ecma262 标识符命名规范的文件或者文件夹会被忽略，需要注意的是，当文件夹被忽略时，该文件夹及其子文件夹下所有的文件都不会被导出。

它可以与其它的模式共同使用。

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

### HOME and Root import

Javascript 与其它系统编程语言或系统脚本的发展历史有很大不同，在系统中 Javascript 通常以包的形式作为一个应用，尽管习惯上不经常访问包外的文件，但这种需求还是存在的，当 Javascript 也像其它应用程序那样使用全局的配置文件的话或许也是一个好的选择，比如像 ssh 那样在 HOME 下建立相关的全局配置文件等。

提供该功能的另外一个原因是想让导入路径尽量符合人们以往对路径的认知，这样可以减少理解 npm 包管理体系中路径的负担。

在此插件中启用后，使用占位符`~`来代表环境变量中`HOME`的值，以`/`开头表示绝对路径。

```js
import rand from "~/rand.js";
import math from "/lib/es/math";
```

[es]: https://tc39.es/ecma262/#prod-IdentifierName
