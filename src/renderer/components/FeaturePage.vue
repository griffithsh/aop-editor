<template>
  <md-app>
    <md-app-toolbar class="md-primary">
      <router-link to="/"><md-icon>home</md-icon></router-link>
      <span class="md-title">
        {{ name }}
        <md-tooltip>
          {{ tip }}
        </md-tooltip>
      </span>
    </md-app-toolbar>
    <md-app-content>
      <slot />
      <user-notifications></user-notifications>
    </md-app-content>
  </md-app>
</template>

<script>
import UserNotifications from './UserNotifications'
export default {
  name: 'feature-page',
  props: ['name', 'tip'],
  components: {UserNotifications}
}
</script>

<style>
</style>