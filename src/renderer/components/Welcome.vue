<template>
  <div>
    <md-app>
      <md-app-toolbar class="md-primary">
        <span class="md-title">Toolbar.Title</span>
      </md-app-toolbar>
      <md-app-drawer>Drawer</md-app-drawer>
      <md-app-content>
        Content
        <md-button class="md-raised md-primary">Clicker</md-button>
        <md-empty-state
          md-icon="home"
          md-label="Create your first project"
          md-description="Creating project, you'll be able to upload your design and collaborate with people.">
          <md-button class="md-primary md-raised">Create first project</md-button>
          <md-icon>home</md-icon>
        </md-empty-state>
      </md-app-content>
    </md-app>
  </div>
</template>

<script>
export default {
  name: 'welcome'
}
</script>

<style>

</style>