# aop-editor

> Edits aop game data

## Build Setup

``` bash
# install dependencies
npm install
npm install sqlite3 --build-from-source --runtime=electron --target=1.8.2 --dist-url=https://atom.io/download/electron
# make sure the version of electron specified here in the target parameter matches what has been downloaded by npm in node_modules/electron/package.json

# serve with hot reload at localhost:9080
npm run dev

# build electron application for production
npm run build

# run unit tests
npm test


# lint all JS/Vue component files in `src/`
npm run lint

```

---

This project was generated with [electron-vue](https://github.com/SimulatedGREG/electron-vue)@[1c165f7](https://github.com/SimulatedGREG/electron-vue/tree/1c165f7c5e56edaf48be0fbb70838a1af26bb015) using [vue-cli](https://github.com/vuejs/vue-cli). Documentation about the original structure can be found [here](https://simulatedgreg.gitbooks.io/electron-vue/content/index.html).
