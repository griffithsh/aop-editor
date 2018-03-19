<template>
  <md-app>
    <md-app-toolbar class="md-primary">
      <a href="#/"><md-icon>home</md-icon></a>
      <span class="md-title">
        {{ name }}
        <md-tooltip>
          {{ tip }}
        </md-tooltip>
      </span>
    </md-app-toolbar>
    <md-app-content>
      <slot>Dummy content</slot>
    </md-app-content>
  </md-app>
</template>

<script>
export default {
  name: 'feature-page',
  props: ['name', 'tip']
}
</script>

<style>
</style>