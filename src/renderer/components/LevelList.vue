<template>
  <feature-page name="Level List" tip="This feature allows you to create, edit and delete levels.">
    <md-button @click="getLevels()" class="md-icon-button"><md-icon>refresh</md-icon></md-button>
    <md-button @click="add()" class="md-icon-button"><md-icon>add</md-icon></md-button>
    <div v-for="l in levels"
         :key="l.Id">
      <md-toolbar>
        <h2>{{ l.Description }}</h2>
      </md-toolbar>
      <md-button class="md-icon" @click="navigate('/world-painter/'+ l.Id)">
        <md-tooltip>Paint the level</md-tooltip>
        <md-icon>brush</md-icon>
      </md-button>
      <md-button class="md-icon">
        <md-tooltip>Remove this level</md-tooltip>
        <md-icon>delete</md-icon>
      </md-button>
    </div>
  </feature-page>
</template>

<script>
import { mapActions } from 'vuex'
import FeaturePage from './FeaturePage'

export default {
  name: 'level-list',
  components: { FeaturePage },
  data: () => ({
  }),
  mounted: function () {
    if (!this.$store.state.Database.connection) {
      this.$router.push('/')
      return
    }

    this.getLevels()
  },
  computed: {
    levels () {
      return this.$store.state.Levels.list
    }
  },
  methods: {
    navigate (route) {
      this.$router.push(route)
    },
    add () {
      console.log('TODO: add a new level')
    },
    ...mapActions({
      getLevels: 'Levels/GET'
    })
  }
}
</script>

<style scoped>
</style>
