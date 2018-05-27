<template>
  <div id="world">
    <md-toolbar class="md-primary">
      <h1 class="md-title"><md-tooltip>Level Id: {{ details.Id }}</md-tooltip>"{{ details.Description }}"</h1>
      <md-button class="md-icon" @click="back()">close</md-button>
    </md-toolbar>
    <div class="middle">
      <aside>
        <!-- <md-button class="md-icon-button md-dense" @click="debug()">
          <md-tooltip>Debug hacks</md-tooltip>
          <md-icon>new_releases</md-icon>
        </md-button>
        <hr> -->
        <md-button class="md-icon-button md-dense" @click="zoomIn()">
          <md-tooltip>Zoom In</md-tooltip>
          <md-icon>zoom_in</md-icon>
        </md-button>
        <md-button class="md-icon-button md-dense" @click="zoomOut()">
          <md-tooltip>Zoom Out</md-tooltip>
          <md-icon>zoom_out</md-icon>
        </md-button>
        <slot name="tools" />
      </aside>
      <canvas ref="canvas" :style="{cursor:panning?'pointer':'inherit'}"></canvas>
    </div>
    <footer>
      TODO - Info! How wide is this level, where are we focusing? What mode are we in? <span>{{ x + '|' + y }}</span> zoom: {{ scale*100 }}%
    </footer>
  </div>
</template>

<script>
import * as PIXI from 'pixi.js'
var app = null
var cursor = null

export default {
  name: 'world',
  components: { },
  props: {
    LevelId: Number
  },
  data: () => {
    return {
      scale: 2,
      x: 0,
      y: 0,
      mouseX: 0,
      mouseY: 0,
      alt: false,
      meta: false,
      panning: false
    }
  },
  beforeDestroy: function () {
    if (app) {
      app.destroy()
      app = null
    }
    if (app && cursor) {
      // remove sprite
      app.stage.layerChild.removeChild(cursor)
    }
    if (cursor) {
      cursor = null
    }
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.globalKeydownHandler)
    window.removeEventListener('keyup', this.globalKeyupHandler)
  },
  mounted: function () {
    // If db is null, kick out to '/'.
    if (!this.$store.state.Database.connection) {
      this.$router.push('/')
      return
    }
    this.$nextTick(() => {
      window.addEventListener('resize', this.resize)
      window.addEventListener('keydown', this.globalKeydownHandler)
      window.addEventListener('keyup', this.globalKeyupHandler)
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
      return this.$store.dispatch('LevelDetails/GET', this.LevelId)
    }).then(() => {
      for (let l of this.$store.state.LevelDetails.layers) {
        if (l.Index === 0) {
          this.$store.commit('World/SET_LAYER_ID', l.Id)
        }
      }
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

      // Add an invisible black pixel sprite to collect mouseout events
      let s = PIXI.Sprite.fromImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
      let cw = this.$refs.canvas.offsetWidth
      let ch = this.$refs.canvas.offsetHeight
      s.width = cw
      s.height = ch
      s.alpha = 0.25
      app.stage.addChild(s)

      if (!this.cursorId) {
        cursor = null
      }

      this.redraw()

      app.stage.interactive = true

      // Bind handler delegators.
      app.stage.on('mousedown', (e) => {
        if (this.$store.state.World.tool.down) {
          this.$store.state.World.tool.down(e.data.originalEvent)
        }
      })
      app.stage.on('mouseup', (e) => {
        if (this.$store.state.World.tool.up) {
          this.$store.state.World.tool.up(e.data.originalEvent)
        }
      })
      app.stage.on('mousemove', (e) => {
        // record where the mouse is ...
        this.mouseX = e.data.originalEvent.offsetX
        this.mouseY = e.data.originalEvent.offsetY

        // If there is a tile cursor move the tile cursor with the mouse.
        if (cursor) {
          cursor.x = Math.round((e.data.originalEvent.offsetX - app.stage.layerChild.x) / this.scale) - (cursor.width / 2)
          cursor.y = Math.round((e.data.originalEvent.offsetY - app.stage.layerChild.y) / this.scale) - (cursor.height / 2)
        }

        // Panning is always checked
        if (this.panning) {
          this.handlePan(e.data.originalEvent)
        }

        // Send event to tool handler if present.
        if (this.$store.state.World.tool.move) {
          this.$store.state.World.tool.move(e.data.originalEvent)
        }
      })
      app.stage.on('mouseout', (e) => {
        this.panning = false

        if (cursor) {
          cursor.alpha = 0
        }

        if (this.$store.state.World.tool.out) {
          this.$store.state.World.tool.out(e.data.originalEvent)
        }
      })

      app.stage.on('mouseover', (e) => {
        if (cursor) {
          cursor.alpha = 0.75
        }

        if (this.$store.state.World.tool.over) {
          this.$store.state.World.tool.over(e.data.originalEvent)
        }
      })

      app.stage.layerChild.scale.x = this.scale
      app.stage.layerChild.scale.y = this.scale

      // focus on center of level
      app.stage.layerChild.x = (w / 2) - (this.$store.state.LevelDetails.details.Width / 2 * this.scale)
      app.stage.layerChild.y = (h / 2) - (this.$store.state.LevelDetails.details.Height / 2 * this.scale)
      let f = this.getFocus()
      this.x = f.x
      this.y = f.y
    })
  },
  computed: {
    cursorId () {
      return this.$store.state.World.cursorTileId
    },
    cursorRequester () {
      return this.$store.state.World.cursorRequester
    },
    details () {
      return this.$store.state.LevelDetails.details
    },
    quads () {
      return this.$store.state.LevelDetails.quads
    },
    currentLayerId () {
      return this.$store.state.World.layerId
    },
    tool () {
      return this.$store.state.World.tool
    }
  },
  watch: {
    quads (now, was) {
      console.log(`watch.quads: was ${was.length}, now ${now.length}`)
      this.redraw()
    },
    tool (now, was) {
      if (was.cleanup) {
        was.cleanup()
      }
    },
    cursorId (now, was) {
      if (was && app && cursor) {
        // remove sprite
        app.stage.layerChild.removeChild(cursor)
        cursor = null
      }
      if (now) {
        // add sprite
        let tile = this.$store.state.Tiles.tiles[now]
        let texture = PIXI.loader.resources[String(tile.Texture_Id)].texture
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
        let frame = new PIXI.Rectangle(tile.TextureX, tile.TextureY, tile.Width, tile.Height)
        cursor = new PIXI.Sprite(new PIXI.Texture(texture, frame))
        cursor.alpha = 0
        app.stage.layerChild.addChild(cursor)
      }
    },
    cursorRequester (now) {
      if (now) { now(cursor) }
    }
  },
  methods: {
    back () {
      this.$router.push('/level-list')
    },

    ascendLayer () {
      let target = null
      for (let i = 0; i < this.$store.state.LevelDetails.layers.length; i++) {
        if (this.$store.state.LevelDetails.layers[i].Id === this.$store.state.World.layerId) {
          target = i + 1
          break
        }
      }
      if (target !== null && target < this.$store.state.LevelDetails.layers.length) {
        this.$store.commit('World/SET_LAYER_ID', this.$store.state.LevelDetails.layers[target].Id)
        this.redraw()
      }
    },
    descendLayer () {
      let target = null
      for (let i = 0; i < this.$store.state.LevelDetails.layers.length; i++) {
        if (this.$store.state.LevelDetails.layers[i].Id === this.$store.state.World.layerId) {
          target = i - 1
          break
        }
      }
      if (target !== null && target >= 0) {
        this.$store.commit('World/SET_LAYER_ID', this.$store.state.LevelDetails.layers[target].Id)
        this.redraw()
      }
    },
    zoomIn () {
      if (this.scale >= 8) {
        return
      }
      if (this.scale >= 1) {
        this.scaleTo(this.scale + 1)
      } else {
        this.scaleTo(this.scale * 2)
      }
    },

    zoomOut () {
      if (this.scale <= 0.25) {
        return
      }
      if (this.scale > 1) {
        this.scaleTo(this.scale - 1)
      } else {
        this.scaleTo(this.scale / 2)
      }

      // If we're scrolling out, and the new scale means the entire level fits
      // on the canvas now, then center it.
      let lw = this.$store.state.LevelDetails.details.Width
      let lh = this.$store.state.LevelDetails.details.Height
      let cw = this.$refs.canvas.offsetWidth
      let ch = this.$refs.canvas.offsetHeight
      let s = this.scale
      if (lw * s <= cw) {
        app.stage.layerChild.x = (cw / 2) - (lw / 2 * s)
      }
      if (lh * s <= ch) {
        app.stage.layerChild.y = (ch / 2) - (lh / 2 * s)
      }
    },

    scaleTo (s) {
      let f = this.getFocus()
      this.scale = s
      app.stage.layerChild.scale.x = s
      app.stage.layerChild.scale.y = s
      this.focus(f)
    },

    handlePan (e) {
      let w = this.$refs.canvas.offsetWidth
      let h = this.$refs.canvas.offsetHeight
      let s = this.scale
      let lw = this.$store.state.LevelDetails.details.Width
      let lh = this.$store.state.LevelDetails.details.Height

      // If the entire level fits on the canvas, don't scroll it.
      if (lw * s > w) {
        app.stage.layerChild.x += e.movementX
      }
      if (lh * s > h) {
        app.stage.layerChild.y += e.movementY
      }

      let f = this.getFocus()

      // Don't let the focus be beyond the bounds of the level.
      if (f.x > lw) {
        f.x = lw
      } else if (f.x < 0) {
        f.x = 0
      }
      if (f.y > lh) {
        f.y = lh
      } else if (f.y < 0) {
        f.y = 0
      }

      this.x = f.x
      this.y = f.y
      this.focus(f)
    },

    // focus pans the view of the level until the level coordinates provided in
    // point are at the center of the screen.
    focus (point) {
      if (app === null) {
        return
      }

      let s = this.scale
      let w = 0
      let h = 0
      if (this.$refs.canvas) {
        w = this.$refs.canvas.offsetWidth
        h = this.$refs.canvas.offsetHeight
      }

      // Adjust app.stage. x and y until the center of the screen focuses on point.
      app.stage.layerChild.x = -1 * ((s * point.x) - (w / 2))
      app.stage.layerChild.y = -1 * ((s * point.y) - (h / 2))
    },

    // getFocus returns the level coordinates that are currently at the center of the screen.
    getFocus () {
      if (!app) {
        return {
          x: 0,
          y: 0
        }
      }
      let cw = 0
      let ch = 0
      if (this.$refs.canvas) {
        cw = this.$refs.canvas.offsetWidth
        ch = this.$refs.canvas.offsetHeight
      }
      let s = this.scale

      let result = {
        x: ((cw / 2) - app.stage.layerChild.x) / s,
        y: ((ch / 2) - app.stage.layerChild.y) / s
      }
      return result
    },

    debug () {
      console.log('debugging method does stuff')

      this.focus({ x: 128, y: 128 })
    },

    redraw () {
      if (!app) {
        return
      }

      if (app.stage.layerChild) {
        app.stage.layerChild.removeChildren()
      } else {
        app.stage.layerChild = new PIXI.Container()
        app.stage.addChild(app.stage.layerChild)
      }

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

        if (layer.Id !== this.$store.state.World.layerId) {
          let colorMatrix = new PIXI.filters.ColorMatrixFilter()
          container.filters = [colorMatrix]
          colorMatrix.greyscale(0.3)
          rectangle.lineStyle(1, 0x555555, 1)
          container.interactiveChildren = false
        }
        rectangle.drawRect(0, 0, layer.Width, layer.Height)
        rectangle.endFill()
        container.addChild(rectangle)

        app.stage.layerChild.addChild(container)
      }

      if (cursor) {
        // let tile = this.$store.state.Tiles.tiles[this.$store.state.World.cursorTileId]
        // let texture = PIXI.loader.resources[String(tile.Texture_Id)].texture
        // texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
        // let frame = new PIXI.Rectangle(tile.TextureX, tile.TextureY, tile.Width, tile.Height)
        // cursor = new PIXI.Sprite(new PIXI.Texture(texture, frame))
        // cursor.alpha = 0.75
        app.stage.layerChild.addChild(cursor)
      }
    },

    globalKeydownHandler (e) {
      if (e.key === 'Meta') {
        this.meta = true
      } else if (e.key === 'Alt') {
        this.alt = true
      } else if (e.key === '-') {
        this.zoomOut()
      } else if (e.key === '+') {
        this.zoomIn()
      } else if (e.key === ' ') {
        // TODO set global grabber icon
        this.panning = true
      } else if (e.key === 'j') {
        this.descendLayer()
      } else if (e.key === 'k') {
        this.ascendLayer()
      }
    },

    globalKeyupHandler (e) {
      if (e.key === 'Meta') {
        this.meta = false
      } else if (e.key === 'Alt') {
        this.alt = false
      } else if (e.key === ' ') {
        // TODO unset global grabber icon
        this.panning = false
      }
    },

    resize (e) {
      let w = this.$refs.canvas.offsetWidth
      let h = this.$refs.canvas.offsetHeight
      app.renderer.resize(w, h)
      app.stage.children[0].width = w
      app.stage.children[0].height = h
    }
  }
}
</script>

<style>
html, body, #app {
  height:100%;
  min-height:100%;
}
h1, footer {
  cursor: default
}
#world {
  height:100%;
  display:flex;
  flex-flow:column;
}
#world>.middle {
  display:flex;
  flex-flow:row;
  height:100%;
}
#world>.middle>aside {
  width:212px;
  min-width:212px;
  padding-top:8px
}
#world>footer {
  padding:0.1rem;
  height:1.2rem;
}
#world canvas {
  width: 100%;
  height: 100%;
}
</style>
