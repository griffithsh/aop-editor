<template>
  <div>
    <a href="/#/">Home</a>

    <div>
      <div class="list">
        <icon class="item" v-for="file in unregistered" v-bind:key="file.filename" v-bind="file" />
      </div>
    </div>

    <md-button disabled class="md-primary md-raised">Save</md-button>

    <div class="list">
      <div class="item" v-for="texture in textures" v-bind:key="texture.filename">
          <span>[{{ texture.id }}]</span>
          <md-avatar style="background-color:#EEE;">
            <img :src="texture.dataUri" />
          </md-avatar>
          <span>"{{ texture.filename }}"</span>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from './Textures/Icon'

export default {
  name: 'textures',
  components: { Icon },
  mounted: function () {
    // If db is null, kick out to '/'.
    if (!this.$store.state.Database.connection) {
      console.log('Kicking to "/" due to ', this.$store.state.Database.filename)
      this.$router.push('/')
      return
    }

    // Load all file needed for this component.
    // this.$store.dispatch('Textures/LOAD', null, { root: true })
    this.$store.dispatch('Textures/LOAD_UNREGISTERED', null, { root: true })
  },
  computed: {
    textures () {
      return this.$store.state.Textures.list
    },
    unregistered () {
      return this.$store.state.Textures.unregistered
    }
  }
}
</script>

<style scoped>
  .list>.item {
    display: inline-block;
    width: 350px;
  }
</style>
