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
        { name: 'Paint', tooltip: 'Add tiles to the level.', icon: 'edit' }
      ],

      currentTool: null,

      // For paint tool
      selectedTileGroup: { tiles: [] },
      selectedQuadBatch: {},
      showSelectBatch: false,
      showSelectGroup: false
    }
  },
  beforeDestroy: function () {
    this.$store.commit('World/UNSET_CURSOR')
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
        console.log('setting cursor due to currentTool', this.currentTool)
        this.$store.commit('World/SET_CURSOR', this.selectedTileGroup.tiles[0])
      } else {
        console.log('NOT setting cursor due to currentTool', this.currentTool)
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
          console.log('cleanup Paint tool')
          this.$store.commit('World/UNSET_CURSOR')
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
