<template>
  <div class="image-slice" :style="dimensions">
    <div :style="dimensions">
      <img :src="url" class="display-image" :style="displayImage" />
    </div>
    <img :src="url" class="height-forcer" :style="dimensions">
  </div>
</template>

<script>
export default {
  name: 'image-slice',
  props: {
    url: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  computed: {
    displayImage () {
      return {
        'margin-left': `-${this.x}px`,
        'margin-top': `-${this.y}px`
      }
    },
    dimensions () {
      return {
        'width': `${this.width}px`,
        'height': `${this.height}px`
      }
    }
  }
}
</script>

<style>
  .image-slice {
    display:inline-block;
    background-color:#333;
  }
  .image-slice > div {
    overflow:hidden;
    position:absolute;
    background-color:#606
  }
  .image-slice .display-image {
    max-width:inherit;
    display:relative;
  }
  .image-slice .height-forcer {
    visibility:hidden;
  }
</style>
