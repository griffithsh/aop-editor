import Vue from 'vue'
import axios from 'axios'

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
  MdCheckbox,
  MdContent,
  MdDrawer,
  MdEmptyState,
  MdIcon,
  MdList,
  MdSnackbar,
  MdToolbar,
  MdTooltip
} from 'vue-material/dist/components'
Vue.use(MdApp)
Vue.use(MdAvatar)
Vue.use(MdButton)
Vue.use(MdCheckbox)
Vue.use(MdContent)
Vue.use(MdDrawer)
Vue.use(MdEmptyState)
Vue.use(MdIcon)
Vue.use(MdList)
Vue.use(MdSnackbar)
Vue.use(MdToolbar)
Vue.use(MdTooltip)

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))

Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
