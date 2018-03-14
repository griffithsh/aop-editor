<template>
  <div>
    <md-avatar class="md-large">
      <span style="background-color:#EEE;">
        <!-- <canvas ref="canvas"></canvas> -->
        <img :src="dataUri" />
      </span>
      <md-tooltip>
        {{ filename }} (0x0 px)
        <div style="overflow:hidden;background-color:#EEE;border:1px solid #444">
          <img :src="dataUri" />
        </div>
      </md-tooltip>
    </md-avatar>
    {{ filename }}
  </div>
</template>

<script>
export default {
  name: 'icon',
  props: ['dataUri', 'filename'],
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
