import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'welcome',
      component: require('@/components/Welcome').default
    },
    {
      path: '/texture-editor',
      name: 'texture-editor',
      component: require('@/components/Textures').default
    },
    {
      path: '/level-list',
      name: 'level-list',
      component: require('@/components/LevelList').default
    },
    {
      path: '/world-painter/:LevelId',
      props: (route) => ({ LevelId: parseInt(route.params.LevelId) }),
      name: 'world-painter',
      component: require('@/components/WorldPainter').default
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
