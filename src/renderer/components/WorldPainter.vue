<template>
  <div>
    <md-button class="md-icon" @click="back()">arrow_back</md-button>
    TODO: render the level: {{ Level_Id }}
    <canvas width="100%" height="100%"/>
  </div>
</template>

<script>
export default {
  name: 'world-painter',
  components: { },
  props: {
    Level_Id: Number
  },
  data: () => ({
  }),
  mounted: function () {
    // this.$router.
  },
  computed: {
  },
  methods: {
    back () {
      this.$router.push('/level-list')
    }
  }
}
</script>

<style scoped>
</style>
