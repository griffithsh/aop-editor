<template>
  <feature-page name="Level List" tip="This feature allows you to create, edit and delete levels.">
    <div class="md-layout md-gutter card-wrapper">
      <md-card class="md-layout-item level-card"
                v-for="l in levels"
                :key="l.Id">
        <md-card-header>
          <span class="md-title">{{ l.Description }}</span>
        </md-card-header>
        <md-card-actions>
          <md-button class="md-icon-button" @click="navigate('/world-painter/'+ l.Id)">
            <md-tooltip>Paint the level</md-tooltip>
            <md-icon>brush</md-icon>
          </md-button>
          <md-button class="md-icon-button">
            <md-tooltip>Remove this level</md-tooltip>
            <md-icon>delete</md-icon>
          </md-button>
        </md-card-actions>
      </md-card>
    </div>
    <md-button @click="getLevels()" class="md-icon-button"><md-icon>refresh</md-icon></md-button>
    <md-button @click="add()" class="md-icon-button"><md-icon>add</md-icon></md-button>
  </feature-page>
</template>

<script>
import { mapActions } from 'vuex'
import FeaturePage from './FeaturePage'

export default {
  name: 'level-list',
  components: { FeaturePage },
  mounted: function () {
    if (!this.$store.state.Database.connection) {
      this.$router.push('/')
      return
    }

    this.getLevels()
  },
  computed: {
    loaded () {
      if (this.$store.state.Levels.list) {
        return this.$store.state.Levels.list.length > 0
      }
      return false
    },
    levels () {
      // this.$store.state.Levels.list.forEach((level) => {
      //   console.log('level', level.Id, level.Description)
      // })
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
  .card-wrapper {
    width:95%;
  }
  .level-card {
    margin-bottom:8px;
    margin-top:8px;
    min-width:256px;
    max-width:256px;
  }
</style>
