<template>
  <world :level-id="LevelId">
    <template slot="tools">
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
        <div v-else-if="currentTool === 'Paint'">
          <md-card class="select-quad-batch">
            <md-button @click="showSelectBatch = true" class="md-icon-button" style="float:right">
              <md-icon>edit</md-icon>
            </md-button>
            <span class="md-subheading">{{ selectedQuadBatch.texture }}</span> <span class="md-caption">[{{ selectedQuadBatch.Id }}]</span><br><span class="md-caption">{{ selectedQuadBatch.quads }} quads at elevation {{ selectedQuadBatch.ZIndex }}</span>
          </md-card>
          <md-dialog :md-active.sync="showSelectBatch">
            <md-dialog-title>Select QuadBatch</md-dialog-title>
            <md-dialog-content style="width:500px;padding:8px;">
              <md-card v-for="batch in quadBatches" :key="batch.Id" class="select-quad-batch" style="width:48%;display:inline-block">
                <span class="md-subheading">{{ batch.texture }}</span> <span class="md-caption">[{{ batch.Id }}]</span><br><span class="md-caption">{{ batch.quads }} quads at elevation {{ batch.ZIndex }}</span>
                <md-button class="md-icon-button md-primary" @click="showSelectBatch = false;selectedQuadBatch = batch">
                  <md-icon v-if="batch.Id == selectedQuadBatch.Id">check_box</md-icon>
                  <md-icon v-else>check_box_outline_blank</md-icon>
                </md-button>
                <md-tooltip>
                  <div style="background-color:#000;"><img :src="batch.img" width="256px"/></div>
                </md-tooltip>
              </md-card>
            </md-dialog-content>
            <md-dialog-actions>
              <md-button>
                New
              </md-button>
              <md-button class="md-primary" @click="showSelectBatch = false">
                Cancel
              </md-button>
            </md-dialog-actions>
          </md-dialog>
          v-for of buttons to select the TileGroup
        </div>
      </div>
    </template>
  </world>
</template>

<script>
import * as PIXI from 'pixi.js'
import { without } from 'lodash'
import World from './World'

function tmpId () {
  return Math.random().toString(36).substring(2, 15)
}

export default {
  name: 'world-painter',
  components: { World },
  props: {
    LevelId: Number
  },
  data: () => {
    return {
      tools: [
        { name: 'Paint', tooltip: 'Add tiles to the level.', icon: 'edit' }
      ],

      currentTool: null,

      // For paint tool
      selectedTileGroup: {},
      selectedQuadBatch: {},
      showSelectBatch: false
    }
  },
  beforeDestroy: function () {
    this.$store.commit('World/UNSET_CURSOR')
  },
  computed: {
    quadBatches () {
      let tiles = this.$store.state.Tiles.tiles
      return without(this.$store.state.LevelDetails.quadBatches.map((b) => {
        if (b.LevelLayer_Id !== this.$store.state.World.layerId) {
          return null
        }
        let qs = this.$store.state.LevelDetails.quadsByBatch[b.Id] || []
        let textureId = qs.length ? tiles[qs[0].Tile_Id].Texture_Id : null
        let textureName = ''
        let image = ''
        for (let i = 0; i < this.$store.state.Textures.list.length; i++) {
          if (textureId === this.$store.state.Textures.list[i].id) {
            textureName = this.$store.state.Textures.list[i].filename
            image = this.$store.state.Textures.list[i].dataUri
            break
          }
        }
        return Object.assign({}, b, {
          quads: qs.length,
          texture: textureName,
          img: image
        })
      }), null)
    }
  },
  methods: {
    selectTool (name) {
      this.currentTool = null
      if (this.toolCleanup) {
        this.toolCleanup()
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

    selectPaint () {
      this.selectedQuadBatch = {}
      this.selectedTileGroup = {}

      // TODO(griffithsh): Auto-select a QuadBatch to operate on.
      for (let l of this.$store.state.LevelDetails.layers) {
        if (l.Id === this.$store.state.World.layerId) {
          for (let b of this.$store.state.LevelDetails.quadBatches) {
            if (b.LevelLayer_Id === l.Id) {
              // This is the first quadbatch of this layer, it's as good as any other.

              // omg
              let qs = this.$store.state.LevelDetails.quadsByBatch[b.Id] || []
              let tiles = this.$store.state.Tiles.tiles
              let textureId = qs.length ? tiles[qs[0].Tile_Id].Texture_Id : null
              let textureName = ''
              let image = ''
              for (let i = 0; i < this.$store.state.Textures.list.length; i++) {
                if (textureId === this.$store.state.Textures.list[i].id) {
                  textureName = this.$store.state.Textures.list[i].filename
                  image = this.$store.state.Textures.list[i].dataUri
                  break
                }
              }
              this.selectedQuadBatch = Object.assign({}, b, {
                quads: qs.length,
                texture: textureName,
                img: image
              })
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
      sprite.alpha = 0

      this.$store.commit('World/SET_CURSOR', tile.Id)

      this.$store.commit('World/SET_TOOL', {
        name: 'Paint',
        down: () => {
          this.$store.commit('World/GET_CURSOR', (cursor) => {
            let q = {
              Id: tmpId(),
              QuadBatch_Id: this.selectedQuadBatch.Id,
              WorldLocationX: cursor.x,
              WorldLocationY: cursor.y,
              Tile_Id: tile.Id // TODO(griffithsh): select randomly from tile group
            }
            console.log('TODO(griffithsh): commit new quad!', q)
            this.$store.commit('LevelDetails/APPEND_QUAD', q)
          })
        },
        cleanup: () => {
          console.log('cleanup Paint tool')
          this.$store.commit('World/UNSET_CURSOR')
        }
      })
    }
  }
}
</script>

<style>
.select-quad-batch {
  padding:4px;
  margin:4px;
  cursor:pointer;
}
</style>
