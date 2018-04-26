<template>
  <div style="height:100%;display:flex;flex-flow:column">
    <md-toolbar class="md-primary">
      <span class="md-title">[{{ details.Id }}] {{ details.Description }}</span>
      <md-button class="md-icon" @click="debug()">create</md-button>
      <md-button class="md-icon" @click="back()">arrow_back</md-button>
    </md-toolbar>
    <div style="display:flex;flex-flow:row;height:100%">
      <aside style="width:200px;">TODO - toolbox goes here</aside>
      <canvas id="pixi-canvas" ref="canvas"></canvas>
    </div>
    <footer style="height:64px;">
      TODO - Info! How wide is this level, where are we focusing? What mode are we in? <span>{{ getFocus.x + '|' + getFocus.y }}</span>
    </footer>
  </div>
</template>

<script>
import * as PIXI from 'pixi.js'

var app = null

export default {
  name: 'world-painter',
  components: { },
  props: {
    Level_Id: Number
  },
  data: () => ({
    currentLayer: 0
  }),
  beforeDestroy: function () {
    if (app) {
      app.destroy()
      app = null
    }
    window.removeEventListener('resize', this.resize)
  },
  mounted: function () {
    // If db is null, kick out to '/'.
    if (!this.$store.state.Database.connection) {
      this.$router.push('/')
      return
    }
    this.$nextTick(() => {
      window.addEventListener('resize', this.resize)
    })
    this.$store.dispatch('Textures/LOAD').then(() => {
      return new Promise((resolve, reject) => {
        let loader = PIXI.loader
        for (let i = 0; i < this.$store.state.Textures.list.length; i++) {
          let t = this.$store.state.Textures.list[i]
          if (PIXI.loader.resources[String(t.id)]) {
            continue
          }
          loader.add(String(t.id), t.dataUri)
        }
        loader.load(() => {
          resolve()
        })
      })
    }).then(() => {
      return this.$store.dispatch('Tiles/GET')
    }).then(() => {
      return this.$store.dispatch('LevelDetails/GET', this.Level_Id)
    }).then(() => {
      if (app) {
        app.destroy()
      }
      let w = this.$refs.canvas.offsetWidth
      let h = this.$refs.canvas.offsetHeight
      app = new PIXI.Application(w, h, {
        view: this.$refs.canvas,
        backgroundColor: 0x1099bb,
        roundPixels: true,
        antialias: false
      })
      this.redraw()

      app.stage.interactive = true
      app.stage.on('mousedown', (e) => {
        app.stage.on('mousemove', (e) => {
          app.stage.x += e.data.originalEvent.movementX
          app.stage.y += e.data.originalEvent.movementY
        })
      })
      app.stage.on('mouseup', (e) => {
        app.stage.off('mousemove')
      })
      app.stage.on('mouseleave', (e) => {
        console.log('lost!')
      })

      app.stage.scale.x = 1
      app.stage.scale.y = 1

      // focus on center of level
      app.stage.x = (w / 2) - (this.$store.state.LevelDetails.details.Width / 2 * app.stage.scale.x)
      app.stage.y = (h / 2) - (this.$store.state.LevelDetails.details.Height / 2 * app.stage.scale.y)
    })
  },
  computed: {
    details () {
      return this.$store.state.LevelDetails.details
    },
    quads () {
      return this.$store.state.LevelDetails.quads
    },
    getFocus () {
      if (app === null) {
        return { x: 0, y: 0 }
      }
      let w = 0
      let h = 0
      if (this.$refs.canvas) {
        w = this.$refs.canvas.offsetWidth
        h = this.$refs.canvas.offsetHeight
      }
      let result = {
        x: app.stage.x - (w / 2) + (this.$store.state.LevelDetails.details.Width / 2),
        y: app.stage.y - (h / 2) + (this.$store.state.LevelDetails.details.Height / 2)
      }
      console.log('getter', result)
      return result
    }
  },
  watch: {
    quads (now, was) {
      this.redraw()
    }
  },
  methods: {
    back () {
      this.$router.push('/level-list')
    },
    scaleTo (s) {
      // let f = this.getFocus
      app.stage.scale.x = s
      app.stage.scale.y = s
      // this.focus(f)
    },
    focus (point) {
      if (app === null) {
        return { x: 0, y: 0 }
      }
      let w = 0
      let h = 0
      if (this.$refs.canvas) {
        w = this.$refs.canvas.offsetWidth
        h = this.$refs.canvas.offsetHeight
      }
      console.log('setter', point)

      // Then adjust app.stage. x and y until the center of the screen focuses on point
      app.stage.x = point.x + (w / 2) - (this.$store.state.LevelDetails.details.Width / 2)
      app.stage.y = point.y + (h / 2) - (this.$store.state.LevelDetails.details.Height / 2)
    },
    debug () {
      console.log('debugging method does stuff')
      // let q = {
      //   Id: 112344,
      //   QuadBatch_Id: 1,
      //   WorldLocationX: 96,
      //   WorldLocationY: 64,
      //   Tile_Id: 1
      // }
      // this.$store.commit('LevelDetails/APPEND_QUAD', q)
      // this.currentLayer = -1
      // this.redraw()
      this.scaleTo(2)
    },
    redraw () {
      if (!app) {
        return
      }
      app.stage.removeChildren()

      for (let layer of this.$store.state.LevelDetails.layers) {
        let container = new PIXI.Container()

        // QuadBatches
        for (let batch of this.$store.state.LevelDetails.batchesByLayer[layer.Id] || []) {
          let batchContainer = new PIXI.Container()
          let lowest = 0
          if (batch.Id === 1) {
            console.log('quad batch 1 found', layer)
          }
          for (let quad of this.$store.state.LevelDetails.quadsByBatch[batch.Id] || []) {
            let tile = this.$store.state.Tiles.tiles[quad.Tile_Id]
            let texture = PIXI.loader.resources[String(tile.Texture_Id)].texture
            texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
            let frame = new PIXI.Rectangle(tile.TextureX, tile.TextureY, tile.Width, tile.Height)
            let sprite = new PIXI.Sprite(new PIXI.Texture(texture, frame))
            sprite.x = quad.WorldLocationX
            sprite.y = quad.WorldLocationY
            lowest = lowest >= sprite.y + tile.Height ? lowest : sprite.y + tile.Height

            batchContainer.addChild(sprite)
          }
          batchContainer.aop = {
            z: batch.ZIndex,
            y: lowest
          }
          container.addChild(batchContainer)
        }

        // Cicadas
        for (let c of this.$store.state.LevelDetails.cicadasByLayer[layer.Id] || []) {
          let cicadaContainer = new PIXI.Container()

          let lowest = 0
          for (let cl of this.$store.state.LevelDetails.cicadaLayersByCicada[c.Id] || []) {
            let texture = PIXI.loader.resources[String(cl.Texture_Id)].texture
            texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
            texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT

            let sprite = new PIXI.extras.TilingSprite(new PIXI.Texture(texture), c.Width, c.Height)
            sprite.x = c.X
            sprite.y = c.Y

            lowest = lowest >= sprite.y + c.Height ? lowest : sprite.y + c.Height

            cicadaContainer.addChild(sprite)
          }
          cicadaContainer.aop = {
            z: c.ZIndex,
            y: lowest
          }
          container.addChild(cicadaContainer)
        }

        // Sort the components of this container
        container.children.sort((a, b) => {
          if (a.aop.z !== b.aop.z) {
            return a.aop.z - b.aop.z
          }
          return a.aop.y - b.aop.y
        })

        // Layer border and non-current layer effects
        let rectangle = new PIXI.Graphics()
        rectangle.lineStyle(1, 0x0, 0.7)

        if (layer.Index !== this.currentLayer) {
          let colorMatrix = new PIXI.filters.ColorMatrixFilter()
          container.filters = [colorMatrix]
          colorMatrix.greyscale(0.3)
          rectangle.lineStyle(1, 0x555555, 1)
        }
        rectangle.drawRect(0, 0, layer.Width, layer.Height)
        rectangle.endFill()
        container.addChild(rectangle)

        app.stage.addChild(container)
      }
    },
    resize (e) {
      let w = this.$refs.canvas.offsetWidth
      let h = this.$refs.canvas.offsetHeight
      app.renderer.resize(w, h)
    }
  }
}
</script>

<style>
 html, body, #app {
   height:100%;
   min-height:100%;
 }
 .bg {
   background-color:#333;
   height:100%;
   overflow:hidden;
 }
 #pixi-canvas {
   width: 100%;
   height: 100%;
 }
</style>
