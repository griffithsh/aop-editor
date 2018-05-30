<template>
</template>

<script>
export default {
  name: 'keyboard-event',
  props: {
    k: String,
    up: Function,
    down: Function,
    press: Function
  },
  mounted: function () {
    this.$nextTick(() => {
      if (this.down) {
        window.addEventListener('keydown', this.globalDownHandler)
      }
      if (this.up) {
        window.addEventListener('keyup', this.globalUpHandler)
      }
      if (this.press) {
        window.addEventListener('keypress', this.globalPressHandler)
      }
    })
  },
  beforeDestroy: function () {
    if (this.down) {
      window.removeEventListener('keydown', this.globalDownHandler)
    }
    if (this.up) {
      window.removeEventListener('keyup', this.globalUpHandler)
    }
    if (this.press) {
      window.removeEventListener('keypress', this.globalPressHandler)
    }
  },
  methods: {
    globalDownHandler (e) {
      if (e.key === this.k) {
        this.down(e)
      }
    },
    globalUpHandler (e) {
      if (e.key === this.k) {
        this.up(e)
      }
    },
    globalPressHandler (e) {
      if (e.key === this.k) {
        this.press(e)
      }
    }
  }
}
</script>

<style>

</style>
