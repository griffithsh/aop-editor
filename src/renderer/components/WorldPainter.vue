<template>
  <world :level-id="LevelId" ref="world">
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
        <div v-if="currentTool === 'Paint'">
          <span class="md-title" style="padding:8px">QuadBatch</span>
          <md-card class="select-quad-batch">
            <md-button @click="showSelectBatch = true" class="md-icon-button" style="float:right">
              <md-icon>edit</md-icon>
            </md-button>
            <span class="md-subheading">{{ selectedQuadBatch.texture }}</span>
            <span class="md-caption">[{{ selectedQuadBatch.Id }}]</span>
            <br>
            <span class="md-caption">{{ selectedQuadBatch.quads }} quads at elevation {{ selectedQuadBatch.ZIndex }}</span>
          </md-card>
          <md-dialog :md-active.sync="showSelectBatch">
            <md-dialog-title>Select QuadBatch</md-dialog-title>
            <md-dialog-content style="width:500px;padding:8px;">
              <md-card v-for="batch in quadBatches" :key="batch.Id" class="select-quad-batch" style="width:48%;display:inline-block">
                <span class="md-subheading">{{ batch.texture }}</span> <span class="md-caption">[{{ batch.Id }}]</span><br><span class="md-caption">{{ batch.quads }} quads at elevation {{ batch.ZIndex }}</span>
                <md-button class="md-icon-button md-primary" @click="selectQuadBatch(batch)">
                  <md-icon v-if="batch.Id == selectedQuadBatch.Id">check_box</md-icon>
                  <md-icon v-else>check_box_outline_blank</md-icon>
                </md-button>
                <md-tooltip>
                  <img :src="batch.img" width="256px" style="background-color:#000"/>
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
          <br>
          <span class="md-title" style="padding:8px">Tile</span>
          <md-card class="select-tile-group">
            <md-button @click="showSelectGroup = true" class="md-icon-button" style="float:right">
              <md-icon>edit</md-icon>
            </md-button>
            <span class="md-subheading">{{ selectedTileGroup.description }}</span>
            <br>
            <span class="md-caption">{{ selectedTileGroup.tiles.length }} tile(s)</span>
          </md-card>
          <image-slice :url="selectedTileGroup.texture.dataUri"
                        :x="selectedTileGroup.first.TextureX"
                        :y="selectedTileGroup.first.TextureY"
                        :width="selectedTileGroup.first.Width"
                        :height="selectedTileGroup.first.Height"/>
          <md-dialog :md-active.sync="showSelectGroup">
            <md-dialog-title>Select Tile Group</md-dialog-title>
            <md-dialog-content>
              <md-card v-for="group in tileGroups" :key="group.description" class="select-tile-group" style="width:48%;display:inline-block">
                <span class="md-subheading">{{ group.description }}</span>
                <br>
                <span class="md-caption">{{ group.tiles.length }} tile(s)</span>
                <md-button class="md-icon-button md-primary" @click="selectTileGroup(group)">
                  <md-icon v-if="group.description == selectedTileGroup.description">check_box</md-icon>
                  <md-icon v-else>check_box_outline_blank</md-icon>
                </md-button>
                <md-tooltip>
                  <image-slice :url="group.texture.dataUri"
                                :x="group.first.TextureX"
                                :y="group.first.TextureY"
                                :width="group.first.Width"
                                :height="group.first.Height"/>
                </md-tooltip>
              </md-card>
            </md-dialog-content>
            <md-dialog-actions>
              <md-button class="md-primary" @click="showSelectGroup = false">
                Cancel
              </md-button>
            </md-dialog-actions>
          </md-dialog>
        </div>
        <div v-else-if="currentTool === 'Picker'">
          <!-- Picking existing quads ... -->
          <md-button @click="deletePicked()" class="md-icon-button" :disabled="!pickedSprite">
            <md-icon>delete</md-icon>
            <md-tooltip>Delete the selected Tile</md-tooltip>
          </md-button>
        </div>
      </div>
    </template>
  </world>
</template>

<script>
import { without, sample } from 'lodash'
import ImageSlice from './ImageSlice'
import World from './World'

function tmpId () {
  return Math.random().toString(36).substring(2, 15)
}

export default {
  name: 'world-painter',
  components: { ImageSlice, World },
  props: {
    LevelId: Number
  },
  data: () => {
    return {
      tools: [
        { name: 'Paint', tooltip: 'Add tiles to the Level.', icon: 'add' },
        { name: 'Picker', tooltip: 'Pick Tiles in the Level.', icon: 'search' }
      ],

      currentTool: null,

      // For paint tool
      selectedTileGroup: { tiles: [] },
      selectedQuadBatch: {},
      showSelectBatch: false,
      showSelectGroup: false,

      pickerDragging: false,
      pickedSprite: null
    }
  },
  beforeDestroy: function () {
    this.$store.commit('World/SET_CURSOR', 0)
    this.selectNone()
  },
  computed: {
    layerId () {
      return this.$store.state.World.layerId
    },
    quadBatches () {
      let tiles = this.$store.state.Tiles.tiles
      return without(this.$store.state.LevelDetails.quadBatches.map((b) => {
        if (b.LevelLayer_Id !== this.$store.state.World.layerId) {
          return null
        }
        let qs = this.$store.state.LevelDetails.quadsByBatch[b.Id] || []
        let textureId = qs.length ? tiles[qs[0].Tile_Id].Texture_Id : null
        let texture = this.$store.state.Textures.byId[textureId] || {}
        return Object.assign({}, b, {
          quads: qs.length,
          texture: texture.filename,
          textureId: texture.id,
          img: texture.dataUri
        })
      }), null)
    },

    // tileGroups are the Tiles that are available to add to the current
    // quadbatch, grouped. If Tiles in the database do not have a TileGroup,
    // then they form their own group, with only the one tile.
    tileGroups () {
      let result = []
      let tilesByTileGroupId = {}
      for (let prop in this.$store.state.Tiles.tiles) {
        let tile = this.$store.state.Tiles.tiles[prop]
        if (tile.Texture_Id === this.selectedQuadBatch.textureId) {
          if (tile.TileGroup_Id) {
            // This tile has a Tile Group.
            if (tilesByTileGroupId[tile.TileGroup_Id]) {
              // This tilegroup has already been created.
              tilesByTileGroupId[tile.TileGroup_Id].tiles.push(tile.Id)
            } else {
              // This Tile group needs to be initialised.
              tilesByTileGroupId[tile.TileGroup_Id] = {
                texture: this.$store.state.Textures.byId[tile.Texture_Id],
                // FIXME(hgriffiths): description should be the description field in the DB.
                description: 'TileGroup: ' + tile.TileGroup_Id,
                tiles: [tile.Id],
                first: tile
              }
            }
          } else {
            // This tile is un-grouped.
            result.push({
              texture: this.$store.state.Textures.byId[tile.Texture_Id],
              description: 'ungrouped Tile: ' + tile.Id,
              tiles: [tile.Id],
              first: tile
            })
          }
        }
      }
      let groups = []
      for (let prop in tilesByTileGroupId) {
        let group = tilesByTileGroupId[prop]
        groups.push(group)
      }
      console.log('tileGroups:', tilesByTileGroupId, groups, result)
      return groups.concat(result)
    }
  },
  watch: {
    layerId () {
      this.autoSelectQuadBatch()
      this.autoSelectTileGroup()
    },
    selectedQuadBatch (now, was) {
      this.autoSelectTileGroup()
    },
    selectedTileGroup (now, was) {
      if (this.currentTool) {
        this.$store.commit('World/SET_CURSOR', now.tiles[0])
      }
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
      this.$store.commit('World/UNSET_TOOL')
    },

    selectQuadBatch (batch) {
      this.showSelectBatch = false
      this.selectedQuadBatch = batch
      this.autoSelectTileGroup()
    },

    autoSelectQuadBatch () {
      this.selectedQuadBatch = this.quadBatches[0]
    },
    selectTileGroup (group) {
      this.showSelectGroup = false
      this.selectedTileGroup = group
    },

    // autoSelectTileGroup picks a tile group from the available tile groups.
    autoSelectTileGroup () {
      this.selectedTileGroup = this.tileGroups[0]
      if (this.currentTool) {
        this.$store.commit('World/SET_CURSOR', this.selectedTileGroup.tiles[0])
      } else {
        this.$store.commit('World/SET_CURSOR', 0)
      }
    },

    selectPaint () {
      this.autoSelectQuadBatch()
      this.autoSelectTileGroup()

      this.$store.commit('World/SET_CURSOR', this.selectedTileGroup.tiles[0])

      this.$store.commit('World/SET_TOOL', {
        name: 'Paint',
        down: () => {
          this.$store.commit('World/GET_CURSOR', (cursor) => {
            let q = {
              Id: tmpId(),
              QuadBatch_Id: this.selectedQuadBatch.Id,
              WorldLocationX: cursor.x,
              WorldLocationY: cursor.y,
              Tile_Id: sample(this.selectedTileGroup.tiles)
            }
            console.log('TODO(griffithsh): commit new quad!', q)
            this.$store.commit('LevelDetails/APPEND_QUAD', q)
          })
        },
        cleanup: () => {
          this.$store.commit('World/SET_CURSOR', 0)
        }
      })
    },

    deletePicked () {
      if (this.pickedSprite) {
        console.log('TODO(griffithsh): delete quad', this.pickedSprite.Quad_Id)
      }
    },

    selectPicker () {
      this.$store.commit('World/SET_TOOL', {
        name: 'Picker',
        down: (e) => {
          if (this.pickedSprite) {
            this.pickedSprite.alpha = 1
            this.pickedSprite = null
          }
          let coords = this.$refs.world.clickToLevel(e)
          this.pickedSprite = this.$refs.world.quadAt(coords.x, coords.y)
          if (this.pickedSprite) {
            this.pickerDragging = true
            this.pickedSprite.alpha = 0.25
          }
        },
        up: () => {
          if (this.pickerDragging) {
            this.pickerDragging = false
            this.pickedSprite.alpha = 0.5
            this.$store.commit('LevelDetails/REPOSITION_QUAD', {
              Id: this.pickedSprite.Quad_Id,
              x: this.pickedSprite.x,
              y: this.pickedSprite.y
            })
          }
        },
        out: () => {
          if (this.pickerDragging) {
            this.pickerDragging = false
            this.pickedSprite.alpha = 0.5
            this.$store.commit('LevelDetails/REPOSITION_QUAD', {
              Id: this.pickedSprite.Quad_Id,
              x: this.pickedSprite.x,
              y: this.pickedSprite.y
            })
          }
        },
        move: (e) => {
          if (this.pickerDragging) {
            // Set the sprite we found to the coordinate indicated by the event.
            let l = this.$refs.world.clickToLevel(e)
            let s = this.pickedSprite
            s.x = Math.round(l.x - s.width / 2)
            s.y = Math.round(l.y - s.height / 2)
          }
        }
      })
    }
  }
}
</script>

<style>
.select-quad-batch, .select-tile-group {
  padding:4px;
  margin:4px;
}
</style>
