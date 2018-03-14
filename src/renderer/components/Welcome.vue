<template>
  <div>
    <md-app v-if="db">
      <md-app-toolbar class="md-primary">
        <span class="md-title">Features</span>
      </md-app-toolbar>
      <md-app-content>
        Features
        <md-list>
          <md-list-item v-for="feature in features" v-bind:key="feature.url">
            <a :href="feature.url">{{ feature.name }}</a><md-icon>mode_edit</md-icon>
          </md-list-item>
        </md-list>
        <md-button @click="closeDB" class="md-primary md-raised">Close DB</md-button>
        <md-snackbar>
          Loaded {{ db.filename }}
        </md-snackbar>
      </md-app-content>
    </md-app>
    <md-empty-state
      v-else
      md-icon="insert_drive_file"
      md-label="No database loaded"
      md-description="Open a core database for the An Other Place game.">
      <md-button @click="pickDB" class="md-primary md-raised">Pick a database</md-button>
    </md-empty-state>
  </div>
</template>

<script>
export default {
  name: 'welcome',
  data: function () {
    return {
      features: [
        { name: 'Texture Editor', url: '/#/texture-editor' }
      ]
    }
  },
  computed: {
    db () {
      return this.$store.state.Database.connection
    }
  },
  mounted: function () {
    // console.log('Welcome::mounted', this.$store.state.Database)
  },
  methods: {
    pickDB () {
      this.$store.dispatch('Database/PICK')
    },
    closeDB () {
      this.$store.dispatch('Database/CLOSE')
    }
  }
}
</script>

<style>

</style>