<template>
  <div id="world-painter">
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
        <md-button v-for="tool in tools"
                   :key="tool.name"
                   class="md-icon-button md-dense"
                   v-bind:class="{ 'md-raised': currentTool === tool.name }"
                   @click="selectTool(tool.name)">
          <md-tooltip>{{ tool.tooltip }}</md-tooltip>
          <md-icon>{{ tool.icon }}</md-icon>
        </md-button>
        <hr>
        <div>
          <div v-if="currentTool === 'Zoom'">
            <md-radio v-model="invert" :value="false">Zoom In</md-radio>
            <md-radio v-model="invert" :value="true">Zoom Out</md-radio>
          </div>
          <div v-else-if="currentTool === 'Pan'">
            panning
          </div>
        </div>
      </aside>
      <canvas ref="canvas"></canvas>
    </div>
    <footer>
      TODO - Info! How wide is this level, where are we focusing? What mode are we in? <span>{{ x + '|' + y }}</span> zoom: {{ scale*100 }}%
    </footer>
  </div>
</template>

<script>
import * as PIXI from 'pixi.js'

function tmpId () {
  return Math.random().toString(36).substring(2, 15)
}

var app = null

export default {
  name: 'world-painter',
  components: { },
  props: {
    Level_Id: Number
  },
  data: () => {
    return {
      tools: [
        { name: 'Pan', tooltip: 'Pan the level.', icon: 'pan_tool' },
        { name: 'Paint', tooltip: 'Add tiles to the level.', icon: 'edit' },
        { name: 'Zoom', tooltip: 'Change the zoom the level.', icon: 'zoom_in' }
      ],
      currentLayer: 0,
      scale: 2,
      x: 0,
      y: 0,

      // handler delegators
      mousemoveHandler: null,
      mousedownHandler: null,
      mouseupHandler: null,
      mouseoutHandler: null,
      mouseoverHandler: null,
      mouseX: 0,
      mouseY: 0,
      toolCleanup: null,
      alt: false,
      meta: false,

      currentTool: null,

      // for the zoom tool
      invert: false,

      // For paint tool
      selectedTileGroup: null,
      selectedQuadBatch: null
    }
  },
  beforeDestroy: function () {
    if (app) {
      app.destroy()
      app = null
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

      // Add an invisible black pixel sprite to collect mouseout events
      let s = PIXI.Sprite.fromImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC')
      let cw = this.$refs.canvas.offsetWidth
      let ch = this.$refs.canvas.offsetHeight
      s.width = cw
      s.height = ch
      s.alpha = 0.25
      app.stage.addChild(s)

      this.redraw()

      app.stage.interactive = true

      // Bind handler delegators.
      app.stage.on('mousedown', (e) => {
        if (this.mousedownHandler) {
          this.mousedownHandler(e.data.originalEvent)
        }
      })
      app.stage.on('mouseup', (e) => {
        if (this.mouseupHandler) {
          this.mouseupHandler(e.data.originalEvent)
        }
      })
      app.stage.on('mousemove', (e) => {
        // record where the mouse is ...
        this.mouseX = e.data.originalEvent.offsetX
        this.mouseY = e.data.originalEvent.offsetY

        if (this.mousemoveHandler) {
          this.mousemoveHandler(e.data.originalEvent)
        }
      })
      app.stage.on('mouseout', (e) => {
        if (this.mouseoutHandler) {
          this.mouseoutHandler(e.data.originalEvent)
        }
      })

      app.stage.on('mouseover', (e) => {
        if (this.mouseoverHandler) {
          this.mouseoverHandler(e.data.originalEvent)
        }
      })

      // Configure default mouse handlers with the delegators by selecting the Pan tool.
      this.selectTool('Pan')

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
    details () {
      return this.$store.state.LevelDetails.details
    },
    quads () {
      return this.$store.state.LevelDetails.quads
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

    selectTool (name) {
      this.currentTool = null
      if (this.toolCleanup) {
        this.toolCleanup()
        this.toolCleanup = this.selectNone
      }
      this['select' + name]()
      this.currentTool = name
    },

    selectNone () {
      this.mousedownHandler = null
      this.mouseupHandler = null
      this.mousemoveHandler = null
      this.mouseoutHandler = null
      this.mouseoverHandler = null

      this.toolCleanup = null
    },

    selectZoom () {
      this.toolCleanup = null
      this.mousedownHandler = (e) => {
        if (this.invert) {
          this.zoomOut()
        } else {
          this.zoomIn()
        }
      }
    },

    selectPaint () {
      this.selectedQuadBatch = null
      this.selectedTileGroup = null

      // TODO(griffithsh): Auto-select a QuadBatch to operate on.
      for (let l of this.$store.state.LevelDetails.layers) {
        if (l.Index === this.currentLayer) {
          for (let b of this.$store.state.LevelDetails.quadBatches) {
            if (b.LevelLayer_Id === l.Id) {
              // This is the first quadbatch of this layer, it's as good as any other.
              this.selectedQuadBatch = b
              break
            }
          }
        }
      }

      // TODO(griffithsh): Auto-select a tile group to randomly pick tiles from.
      // ... go through all the tilegroups, discarding ones that use a texture
      // other than the one the selected quadbatch uses, and select the first
      // one encountered...

      // Set mouse cursor to be a semi-transparent image of the first tile in the selected tile group.
      let tile = this.$store.state.Tiles.tiles[11]
      let texture = PIXI.loader.resources[String(tile.Texture_Id)].texture
      texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
      let frame = new PIXI.Rectangle(tile.TextureX, tile.TextureY, tile.Width, tile.Height)
      let sprite = new PIXI.Sprite(new PIXI.Texture(texture, frame))
      app.stage.layerChild.addChild(sprite)
      sprite.alpha = 0
      this.mousemoveHandler = () => {
        sprite.x = Math.round((this.mouseX - app.stage.layerChild.x) / this.scale) - tile.Width / 2
        sprite.y = Math.round((this.mouseY - app.stage.layerChild.y) / this.scale) - tile.Height / 2
      }
      this.mouseoutHandler = () => {
        sprite.alpha = 0
      }
      this.mouseoverHandler = () => {
        sprite.alpha = 0.75
      }

      // When you `mousedown`, the selected tile group is placed.
      this.mousedownHandler = () => {
        let q = {
          Id: tmpId(),
          QuadBatch_Id: null,
          WorldLocationX: sprite.x,
          WorldLocationY: sprite.y,
          Tile_Id: tile.Id
        }
        console.log('TODO(griffithsh): commit new quad!', q)
      }

      // Custom cleanup to remove the sprite
      this.toolCleanup = () => {
        this.selectNone()
        app.stage.layerChild.removeChild(sprite)
      }
    },

    selectPan () {
      this.mousedownHandler = (e) => {
        this.mousemoveHandler = this.handlePan
      }
      this.mouseupHandler = (e) => {
        this.mousemoveHandler = null
      }
      this.mouseoutHandler = (e) => {
        // If the cursor has left the window, then end any panning we were
        // in the middle of.
        this.mousemoveHandler = null
      }
      this.toolCleanup = this.selectNone
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

        if (layer.Index !== this.currentLayer) {
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
    },

    globalKeydownHandler (e) {
      // console.log('key down:', e)
      this.invert = !this.invert
      if (e.key === 'Meta') {
        this.meta = true
      } else if (e.key === 'Alt') {
        this.alt = true
      }
    },

    globalKeyupHandler (e) {
      // console.log('key up:', e)
      this.invert = !this.invert
      if (e.key === 'Meta') {
        this.meta = false
      } else if (e.key === 'Alt') {
        this.alt = false
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
#world-painter {
  height:100%;
  display:flex;
  flex-flow:column;
}
#world-painter>.middle {
  display:flex;
  flex-flow:row;
  height:100%;
}
#world-painter>.middle>aside {
  width:212px;
  min-width:212px;
  padding-top:8px
}
#world-painter>.middle>aside>div {
  padding:0px 12px;
}
#world-painter>footer {
  padding:0.1rem;
  height:1.2rem;
}
#world-painter canvas {
  width: 100%;
  height: 100%;
}
</style>
