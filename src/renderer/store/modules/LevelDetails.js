import { uniqBy, without } from 'lodash'

const state = model([])

function modelQuad (row) {
  if (!row.Quad_Id) {
    return null
  }
  return {
    Id: row.Quad_Id,
    QuadBatch_Id: row.QuadBatch_Id,
    WorldLocationX: row.WorldLocationX,
    WorldLocationY: row.WorldLocationY,
    Tile_Id: row.Tile_Id
  }
}

function modelQuadBatch (row) {
  if (!row.QuadBatch_Id) {
    return null
  }
  return {
    Id: row.QuadBatch_Id,
    LevelLayer_Id: row.LevelLayer_Id,
    ZIndex: row.BatchZIndex
  }
}

function modelCicadaLayer (row) {
  if (!row.CicadaLayer_Id) {
    return null
  }
  return {
    Id: row.CicadaLayer_Id,
    Cicada_Id: row.Cicada_Id,
    Index: row.CicadaLayerIndex,
    Texture_Id: row.Texture_Id
  }
}

function modelCicada (row) {
  if (!row.Cicada_Id) {
    return null
  }
  return {
    Id: row.Cicada_Id,
    LevelLayer_Id: row.LevelLayer_Id,
    Width: row.CicadaWidth,
    Height: row.CicadaHeight,
    X: row.X,
    Y: row.Y,
    ZIndex: row.CicadaZIndex
  }
}

function modelLayer (row) {
  if (!row.LevelLayer_Id) {
    return null
  }
  return {
    Id: row.LevelLayer_Id,
    Level_Id: row.Level_Id,
    Index: row.LayerIndex,
    Width: row.LayerWidth,
    Height: row.LayerHeight
  }
}

function model (rows) {
  let first = rows[0] ? rows[0] : { Width: 0, Height: 0 }
  let m = {
    details: {
      Id: first.Level_Id,
      Description: first.Description,
      Width: first.Width,
      Height: first.Height
    },
    layers: without(uniqBy(rows, 'LevelLayer_Id').map(modelLayer), null),
    quadBatches: without(uniqBy(rows, 'QuadBatch_Id').map(modelQuadBatch), null),
    quads: without(uniqBy(rows, 'Quad_Id').map(modelQuad), null),
    cicadas: without(uniqBy(rows, 'Cicada_Id').map(modelCicada), null),
    cicadaLayers: without(uniqBy(rows, 'CicadaLayer_Id').map(modelCicadaLayer), null),
    quadsByBatch: {},
    batchesByLayer: {},
    cicadasByLayer: {},
    cicadaLayersByCicada: {}
  }

  for (let q of m.quads) {
    m.quadsByBatch[q.QuadBatch_Id] ? m.quadsByBatch[q.QuadBatch_Id].push(q) : m.quadsByBatch[q.QuadBatch_Id] = [q]
  }
  for (let b of m.quadBatches) {
    m.batchesByLayer[b.LevelLayer_Id] ? m.batchesByLayer[b.LevelLayer_Id].push(b) : m.batchesByLayer[b.LevelLayer_Id] = [b]
  }
  for (let cl of m.cicadaLayers) {
    m.cicadaLayersByCicada[cl.Cicada_Id] ? m.cicadaLayersByCicada[cl.Cicada_Id].push(cl) : m.cicadaLayersByCicada[cl.Cicada_Id] = [cl]
  }
  for (let c of m.cicadas) {
    m.cicadasByLayer[c.LevelLayer_Id] ? m.cicadasByLayer[c.LevelLayer_Id].push(c) : m.cicadasByLayer[c.LevelLayer_Id] = [c]
  }

  return m
}

let getSql = `
SELECT
  LV.Id as Level_Id, LV.Description, LAY0.Width, LAY0.Height,
  LAY.Id as LevelLayer_Id, LAY."Index" as LayerIndex, LAY.Width as LayerWidth, LAY.Height as LayerHeight,
  QB.Id as QuadBatch_Id, QB.ZIndex as BatchZIndex,
  Q.Id as Quad_Id, WorldLocationX, WorldLocationY, Tile_Id,
  C.Id as Cicada_Id, C.Width as CicadaWidth, C.Height as CicadaHeight, C.X, C.Y, C.ZIndex as CicadaZIndex,
  CL.Id as CicadaLayer_Id, CL."Index" as CicadaLayerIndex, CL.Texture_Id

FROM
  Levels LV
  INNER JOIN LevelLayers LAY0 on LV.Id = LAY0.Level_Id AND LAY0."Index" = 0
  LEFT JOIN LevelLayers LAY on LV.Id = LAY.Level_Id
    LEFT JOIN QuadBatches QB on LAY.Id = QB.LevelLayer_Id
      LEFT JOIN Quads Q on QB.Id = Q.QuadBatch_Id
    LEFT JOIN Cicadas C ON LAY.Id = C.LevelLayer_Id
      LEFT JOIN CicadaLayers CL on C.Id = CL.Cicada_Id
WHERE
  LV.Id = ?
ORDER BY
  LAY."Index", C.ZIndex, CL."Index";
`

const actions = {
  GET ({ commit, dispatch, rootState }, id) {
    return new Promise((resolve, reject) => {
      rootState.Database.connection.all(getSql, id, (err, rows) => {
        if (err) {
          let msg = 'Could not get details for Level ' + id + ': ' + err
          dispatch('ERROR', msg, { root: true })
          reject(msg)
          return
        }
        commit('ASSIGN', model(rows))
        resolve()
      })
    })
  }
}

const mutations = {
  ASSIGN (state, model) {
    for (let p in model) {
      state[p] = model[p]
    }
  },
  APPEND_QUAD (state, quad) {
    state.quads.push(quad)
    state.quadsByBatch[quad.QuadBatch_Id] ? state.quadsByBatch[quad.QuadBatch_Id].push(quad) : state.quadsByBatch[quad.QuadBatch_Id] = [quad]
  },
  REPOSITION_QUAD (state, data) {
    for (let q of state.quads) {
      if (q.Id === data.Id) {
        // mutate the quad - data.x and data.y
        if (q.WorldLocationX !== data.x || q.WorldLocationY !== data.y) {
          // mutate
          q.WorldLocationX = data.x
          q.WorldLocationY = data.y
          q.dirty = true
          console.log(`REPOSITION_QUAD: set Quad ${data.Id} to ${data.x}/${data.y}`)
        }
      }
    }
  }
}

export default {
  namespaced: true,

  actions,
  mutations,
  state
}
