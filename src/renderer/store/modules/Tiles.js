// import { uniqBy, without } from 'lodash'

const state = {
  tiles: {}
}

function model (row) {
  return {
    Id: row.Id,
    Width: row.Width,
    Height: row.Height,
    TextureX: row.TextureX,
    TextureY: row.TextureY,
    TileGroup_Id: row.TileGroup_Id,
    Texture_Id: row.Texture_Id
  }
}

let getSql = `
SELECT
  *
FROM
  Tiles
;
`

const actions = {
  GET ({ commit, dispatch, rootState }) {
    return new Promise((resolve, reject) => {
      rootState.Database.connection.all(getSql, (err, rows) => {
        if (err) {
          let msg = 'Could not get tiles: ' + err
          dispatch('ERROR', msg, { root: true })
          reject(msg)
          return
        }
        let tiles = {}
        for (let i = 0; i < rows.length; i++) {
          let t = model(rows[i])
          tiles[t.Id] = t
        }

        commit('ASSIGN', tiles)
        resolve()
      })
    })
  }
}

const mutations = {
  ASSIGN (state, tiles) {
    state.tiles = tiles
  }
}

export default {
  namespaced: true,

  actions,
  mutations,
  state
}
