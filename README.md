# rollup-plugin-resolve
Resolve plugin for rollupjs.

# Extended ES import grammer

+ Alias
+ Group
+ HOME and Root
+ Integration

### Alias import

The file structure like this:

```
project
	rollup.config.js
	src
        util
        	...
		app
			main.js
```

```js
// project/rollup.config.js
...
plugins: [
    resolve({
        alias: path.join(__dirname,"src")
    })
]
...
```

```js
// project/src/app/main.js
import A from "@/util";
```

### Group import

The file structure like this:

```
project
	util
		Async
			timeout.js export defalut () => {...}
			all.js export group(), some()
	main.js
```

```js
// main.js
import { timeout, group, some } from "./util/Async";
import { Async } from "./util";
/*
	{
		timeout: ()=>{...},
		group: ()=>{...},
		some: ()=>{...},
	}
*/
```

### HOME and Root import

```js
// The ~ is alias of the HOME Environmental variable
import rand from "~/rand.js";
import math from "/lib/es/math";
```

### Integration import

The file structure like this:

```
project/data/Animal
	Invertebrates
		CellularLevel.js export default {}
		TissueLevel.js export default {}
		OrganLevel
			Acoelomata
				Platyhelminthes
					TaeniaSolium.js export default {}
					Schistosoma.js export default {}
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
// rollup.config.js
{
	alias: path.join(__dirname,""),
}
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
						Schistosoma: {},
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

