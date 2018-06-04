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
      <keyboard-event :k="'s'" :down="this.save"/>
      <keyboard-event :k="'Delete'" :down="this.deletePicked"/>
      <keyboard-event :k="'Backspace'" :down="this.deletePicked"/>
      <user-notifications></user-notifications>
      <hr>
      <div>
        <div v-if="currentTool === 'Paint'">
          <span class="md-headline" style="padding:8px">
            QuadBatch
            <md-button class="md-icon-button">
              <md-icon>add</md-icon>
            </md-button>
          </span>
          <md-card v-if="selectedQuadBatch" class="select-quad-batch">
            <md-button @click="showSelectBatch = true" class="md-icon-button" style="float:right">
              <md-icon>edit</md-icon>
            </md-button>
            <span class="md-subheading">{{ selectedQuadBatch.texture }}</span>
            <span class="md-caption">[{{ selectedQuadBatch.Id }}]</span>
            <br>
            <span class="md-caption">{{ selectedQuadBatch.quads }} quads at elevation {{ selectedQuadBatch.ZIndex }}</span>
          </md-card>
          <md-dialog v-if="selectedQuadBatch" :md-active.sync="showSelectBatch">
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
          <md-card v-if="selectedTileGroup" class="select-tile-group">
            <md-button @click="showSelectGroup = true" class="md-icon-button" style="float:right">
              <md-icon>edit</md-icon>
            </md-button>
            <span class="md-subheading">{{ selectedTileGroup.description }}</span>
            <br>
            <span class="md-caption">{{ selectedTileGroup.tiles.length }} tile(s)</span>
          </md-card>
          <image-slice v-if="selectedTileGroup"
                       :url="selectedTileGroup.texture.dataUri"
                       :x="selectedTileGroup.first.TextureX"
                       :y="selectedTileGroup.first.TextureY"
                       :width="selectedTileGroup.first.Width"
                       :height="selectedTileGroup.first.Height"/>
          <md-dialog v-if="selectedTileGroup" :md-active.sync="showSelectGroup">
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
import KeyboardEvent from './KeyboardEvent'
import UserNotifications from './UserNotifications'

function tmpId () {
  return 'id' + Math.random().toString(36).substring(2, 15)
}

export default {
  name: 'world-painter',
  components: { ImageSlice, World, KeyboardEvent, UserNotifications },
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
      paintCursor: null,
      selectedTileGroup: { tiles: [] },
      selectedQuadBatch: {},
      showSelectBatch: false,
      showSelectGroup: false,

      pickerDragging: false,
      pickedSprite: null
    }
  },
  beforeDestroy: function () {
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
      if (!this.selectedQuadBatch) {
        return []
      }
      let result = []
      let tilesByTileGroupId = {}
      for (let prop in this.$store.state.Tiles.tiles) {
        let tile = this.$store.state.Tiles.tiles[prop]
        if (tile.Texture_Id === this.selectedQuadBatch.textureId || this.selectedQuadBatch.quads === 0) {
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
      return groups.concat(result)
    }
  },
  watch: {
    layerId () {
      this.autoSelectQuadBatch()
      this.autoSelectTileGroup()
    },
    selectedQuadBatch (now) {
      this.autoSelectTileGroup()
      if (this.currentTool === 'Paint' && now) {
        this.$refs.world.highlightQuadBatch(now.Id)
      }
    },
    selectedTileGroup (now) {
      this.$refs.world.destroyLevelTile(this.paintCursor)
      if (this.currentTool === 'Paint' && this.selectedTileGroup.tiles) {
        this.paintCursor = this.$refs.world.newLevelTile(this.selectedTileGroup.tiles[0])
        this.paintCursor.alpha = 0
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
      if (this.$store.state.World.tool.cleanup) {
        this.$store.state.World.tool.cleanup()
      }

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
      this.$refs.world.destroyLevelTile(this.paintCursor)
      if (this.currentTool && this.selectedTileGroup) {
        this.paintCursor = this.$refs.world.newLevelTile(this.selectedTileGroup.tiles[0])
        this.paintCursor.alpha = 0
      }
    },

    selectPaint () {
      this.autoSelectQuadBatch()
      this.autoSelectTileGroup()

      if (this.selectedTileGroup) {
        this.paintCursor = this.$refs.world.newLevelTile(this.selectedTileGroup.tiles[0])
        this.paintCursor.alpha = 0
      }

      if (this.selectedQuadBatch) {
        this.$refs.world.highlightQuadBatch(this.selectedQuadBatch.Id)
      }
      this.$store.commit('World/SET_TOOL', {
        name: 'Paint',
        down: () => {
          let q = {
            Id: tmpId(),
            QuadBatch_Id: this.selectedQuadBatch.Id,
            WorldLocationX: this.paintCursor.x,
            WorldLocationY: this.paintCursor.y,
            Tile_Id: sample(this.selectedTileGroup.tiles),
            dirty: true
          }
          this.$store.commit('LevelDetails/APPEND_QUAD', q)
          let qs = this.$store.state.LevelDetails.quadsByBatch[this.selectedQuadBatch.Id]
          this.selectedQuadBatch.quads = qs.length
          if (qs.length === 1) {
            let tiles = this.$store.state.Tiles.tiles
            let textureId = qs.length ? tiles[qs[0].Tile_Id].Texture_Id : null
            let texture = this.$store.state.Textures.byId[textureId] || {}
            this.selectedQuadBatch.texture = texture.filename
            this.selectedQuadBatch.textureId = texture.id
            this.selectedQuadBatch.img = texture.dataUri
          }
        },
        move: (e) => {
          if (this.paintCursor) {
            let coords = this.$refs.world.clickToLevel(e)
            this.paintCursor.x = Math.round(coords.x - (this.paintCursor.width / 2))
            this.paintCursor.y = Math.round(coords.y - (this.paintCursor.height / 2))
          }
        },
        out: () => {
          if (this.paintCursor) {
            this.paintCursor.alpha = 0
          }
        },
        over: () => {
          if (this.paintCursor) {
            this.paintCursor.alpha = 0.75
          }
        },
        cleanup: () => {
          if (this.$refs.world) {
            this.$refs.world.removeHighlight()
            if (this.paintCursor) {
              this.$refs.world.destroyLevelTile(this.paintCursor)
            }
          }
          this.paintCursor = null
        }
      })
    },

    deletePicked () {
      if (this.pickedSprite) {
        this.$store.commit('LevelDetails/DELETE_QUAD', this.pickedSprite.Quad_Id)
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
    },

    save (e) {
      if (e.metaKey) {
        this.$store.dispatch('LevelDetails/SAVE').then(() => {
          return this.$store.dispatch('LevelDetails/GET', this.LevelId)
        })
      }
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
