<template>
  <div>
    <md-app v-if="db">
      <md-app-toolbar class="md-primary">
        <span class="md-title">Features</span>
      </md-app-toolbar>
      <md-app-content>
        Features
        <md-list>
          <md-list-item v-for="feature in features" v-bind:key="feature.route">
            <div class="md-layout md-gutter md-alignment-center-left">
              <md-button @click="navigate(feature.route)" class="md-icon-button"><md-icon>mode_edit</md-icon></md-button>
              <router-link :to="feature.route">{{ feature.name }}</router-link>
            </div>
          </md-list-item>
        </md-list>
        <md-button @click="closeDB" class="md-primary md-raised">Close DB</md-button>
      </md-app-content>
    </md-app>
    <md-empty-state
      v-else
      md-icon="insert_drive_file"
      md-label="No database loaded"
      md-description="Open a core database for the An Other Place game.">
      <md-button @click="pickDB" class="md-primary md-raised">Pick a database</md-button>
    </md-empty-state>
    <user-notifications></user-notifications>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import UserNotifications from './UserNotifications'

export default {
  name: 'welcome',
  components: { UserNotifications },

  data: function () {
    return {
      features: [
        { name: 'Texture Editor', route: 'texture-editor' },
        { name: 'Level List', route: 'level-list' }
      ]
    }
  },
  computed: {
    db () {
      return this.$store.state.Database.connection
    }
  },
  methods: {
    navigate (route) {
      this.$router.push(route)
    },
    ...mapActions({
      pickDB: 'Database/PICK',
      closeDB: 'Database/CLOSE'
    })
  }
}
</script>

<style>

</style>