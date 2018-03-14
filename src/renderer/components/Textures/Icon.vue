<template>
  <div>
    <!-- <p style="position:absolute;">?x?</p>
    <canvas ref="canvas"></canvas> -->

    <md-checkbox></md-checkbox>
    {{ filename }}
    <md-avatar class="md-large">
      <span style="background-color:#EEE;">
        <img :src="dataUri" />
      </span>
      <md-tooltip>
        {{ filename }}
        <div style="overflow:hidden">
          <img :src="dataUri" />
        </div>
      </md-tooltip>
    </md-avatar>
  </div>
</template>

<script>
export default {
  name: 'icon',
  props: ['dataUri', 'filename', 'jumbo'],
  mounted: function () {
    // let canvas = this.$refs.canvas
    // let ctx = canvas.getContext('2d')

    // let img = new Image()
    // img.onload = function () {
    //   ctx.drawImage(img, 0, 0, 64, 64)
    // }
    // img.src = this.dataUri
  }
}
</script>

<style>
</style>
