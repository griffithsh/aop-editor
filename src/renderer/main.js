import Vue from 'vue'

import App from './App'
import router from './router'
import store from './store'

// vue-material
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'
import 'material-design-icons/iconfont/material-icons.css'
import 'babel-polyfill'
import {
  MdApp,
  MdAvatar,
  MdButton,
  MdCard,
  MdCheckbox,
  MdContent,
  MdDialog,
  MdDrawer,
  MdEmptyState,
  MdIcon,
  MdList,
  MdRadio,
  MdSnackbar,
  MdToolbar,
  MdTooltip
} from 'vue-material/dist/components'
Vue.use(MdApp)
Vue.use(MdAvatar)
Vue.use(MdButton)
Vue.use(MdCard)
Vue.use(MdCheckbox)
Vue.use(MdContent)
Vue.use(MdDialog)
Vue.use(MdDrawer)
Vue.use(MdEmptyState)
Vue.use(MdIcon)
Vue.use(MdList)
Vue.use(MdRadio)
Vue.use(MdSnackbar)
Vue.use(MdToolbar)
Vue.use(MdTooltip)

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
