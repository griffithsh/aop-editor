<template>
  <div>
    <md-avatar class="md-large">
      <span style="background-color:#EEE;">
        <img :src="dataUri" />
      </span>
      <md-tooltip>
        {{ filename }}
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
  props: ['dataUri', 'filename']
}
</script>

<style>
</style>
