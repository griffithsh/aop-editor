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
    Tile_Id: row.Tile_Id,
    QuadBottom: row.QuadBottom
  }
}

function modelQuadBatch (row) {
  if (!row.QuadBatch_Id) {
    return null
  }
  return {
    Id: row.QuadBatch_Id,
    LevelLayer_Id: row.LevelLayer_Id,
    ZIndex: row.BatchZIndex,
    Top: Number.MAX_SAFE_INTEGER,
    Bottom: Number.MIN_SAFE_INTEGER
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
    deletedQuadBatches: [],
    quads: without(uniqBy(rows, 'Quad_Id').map(modelQuad), null),
    deletedQuads: [],
    cicadas: without(uniqBy(rows, 'Cicada_Id').map(modelCicada), null),
    cicadaLayers: without(uniqBy(rows, 'CicadaLayer_Id').map(modelCicadaLayer), null),
    quadsByBatch: {},
    batchesById: {},
    batchesByLayer: {},
    cicadasByLayer: {},
    cicadaLayersByCicada: {}
  }

  for (let b of m.quadBatches) {
    if (m.batchesByLayer[b.LevelLayer_Id]) {
      m.batchesByLayer[b.LevelLayer_Id].push(b)
    } else {
      m.batchesByLayer[b.LevelLayer_Id] = [b]
    }

    m.batchesById[b.Id] = b
  }
  for (let q of m.quads) {
    if (m.quadsByBatch[q.QuadBatch_Id]) {
      m.quadsByBatch[q.QuadBatch_Id].push(q)
    } else {
      m.quadsByBatch[q.QuadBatch_Id] = [q]
    }

    if (q.WorldLocationY < m.batchesById[q.QuadBatch_Id].Top) {
      m.batchesById[q.QuadBatch_Id].Top = q.WorldLocationY
    }
    if (q.QuadBottom > m.batchesById[q.QuadBatch_Id].Bottom) {
      m.batchesById[q.QuadBatch_Id].Bottom = q.QuadBottom
    }
  }

  for (let cl of m.cicadaLayers) {
    if (m.cicadaLayersByCicada[cl.Cicada_Id]) {
      m.cicadaLayersByCicada[cl.Cicada_Id].push(cl)
    } else {
      m.cicadaLayersByCicada[cl.Cicada_Id] = [cl]
    }
  }
  for (let c of m.cicadas) {
    if (m.cicadasByLayer[c.LevelLayer_Id]) {
      m.cicadasByLayer[c.LevelLayer_Id].push(c)
    } else {
      m.cicadasByLayer[c.LevelLayer_Id] = [c]
    }
  }

  return m
}

function isNew (id) {
  return typeof id !== 'number'
}

function shouldUpdate (entity) {
  return entity.dirty && !isNew(entity.Id)
}

function shouldInsert (entity) {
  return isNew(entity.Id)
}

let getSql = `
SELECT
  LV.Id as Level_Id, LV.Description, LAY0.Width, LAY0.Height,
  LAY.Id as LevelLayer_Id, LAY."Index" as LayerIndex, LAY.Width as LayerWidth, LAY.Height as LayerHeight,
  QB.Id as QuadBatch_Id, QB.ZIndex as BatchZIndex,
  Q.Id as Quad_Id, WorldLocationX, WorldLocationY, Tile_Id,
  T.Height+Q.WorldLocationY as QuadBottom,
  C.Id as Cicada_Id, C.Width as CicadaWidth, C.Height as CicadaHeight, C.X, C.Y, C.ZIndex as CicadaZIndex,
  CL.Id as CicadaLayer_Id, CL."Index" as CicadaLayerIndex, CL.Texture_Id

FROM
  Levels LV
  INNER JOIN LevelLayers LAY0 on LV.Id = LAY0.Level_Id AND LAY0."Index" = 0
  LEFT JOIN LevelLayers LAY on LV.Id = LAY.Level_Id
    LEFT JOIN QuadBatches QB on LAY.Id = QB.LevelLayer_Id
      LEFT JOIN Quads Q on QB.Id = Q.QuadBatch_Id
        LEFT JOIN Tiles T on Q.Tile_Id = T.Id
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
  },

  // SAVE the current state of the loaded level to the database.
  SAVE ({ dispatch, state, rootState }) {
    return new Promise((resolve, reject) => {
      let newBatchIds = {} // should become { 'sdjufsdsd': 123, 'Sif48dgc': 456 }

      return Promise.resolve().then(() => {
        return Promise.all(state.deletedQuadBatches.map((batch) => {
          return new Promise((resolve, reject) => {
            let sql = 'DELETE FROM Quads WHERE QuadBatch_Id = ?;'
            rootState.Database.connection.run(sql, [batch.Id], (err) => {
              if (err) {
                let msg = 'Could not delete quads for batch ' + batch.Id + ': ' + err
                return reject(msg)
              }
              return resolve()
            })
          }).then(() => {
            return new Promise((resolve, reject) => {
              console.log('Deleting batch', batch.Id)
              let sql = 'DELETE FROM QuadBatches WHERE Id = ?;'
              rootState.Database.connection.run(sql, [batch.Id], (err) => {
                if (err) {
                  let msg = 'Could not delete batch ' + batch.Id + ': ' + err
                  return reject(msg)
                }
                return resolve()
              })
            })
          })
        }))
      }).then(() => {
        return Promise.all(state.quadBatches.map((batch) => {
          return new Promise((resolve, reject) => {
            if (shouldUpdate(batch)) {
              let sql = 'UPDATE QuadBatches SET ZIndex=? WHERE Id = ?;'
              rootState.Database.connection.run(sql, [batch.ZIndex, batch.Id], (err) => {
                if (err) {
                  let msg = 'Could not update batch ' + batch.Id + ': ' + err
                  return reject(msg)
                }
                return resolve()
              })
            } else if (shouldInsert(batch)) {
              let sql = 'INSERT INTO QuadBatches (LevelLayer_Id, ZIndex) VALUES (?,?);'
              rootState.Database.connection.run(sql, [batch.LevelLayer_Id, batch.ZIndex], function (err) {
                if (err) {
                  let msg = 'Could not insert batch ' + batch.Id + ': ' + err
                  return reject(msg)
                }
                newBatchIds[batch.Id] = this.lastID
                return resolve()
              })
            } else {
              resolve()
            }
          })
        }))
      }).then(() => {
        return Promise.all(state.quads.map((quad) => {
          return new Promise((resolve, reject) => {
            if (shouldUpdate(quad)) {
              let sql = 'UPDATE Quads SET WorldLocationX=?,WorldLocationY=? WHERE Id = ?;'
              let params = [quad.WorldLocationX, quad.WorldLocationY, quad.Id]
              rootState.Database.connection.run(sql, params, (err) => {
                if (err) {
                  let msg = 'Could not update quad ' + quad.Id + ': ' + err
                  return reject(msg)
                }
                return resolve()
              })
            } else if (shouldInsert(quad)) {
              if (isNew(quad.QuadBatch_Id)) {
                let sql = 'INSERT INTO Quads (WorldLocationX,WorldLocationY,Tile_Id,QuadBatch_Id) VALUES (?,?,?,?);'
                let params = [quad.WorldLocationX, quad.WorldLocationY, quad.Tile_Id, newBatchIds[quad.QuadBatch_Id]]
                rootState.Database.connection.run(sql, params, (err) => {
                  if (err) {
                    let msg = 'Could not insert new quad ' + quad.Id + ': ' + err
                    return reject(msg)
                  }
                  return resolve()
                })
              } else {
                let sql = 'INSERT INTO Quads (WorldLocationX,WorldLocationY,Tile_Id,QuadBatch_Id) VALUES (?,?,?,?);'
                let params = [quad.WorldLocationX, quad.WorldLocationY, quad.Tile_Id, quad.QuadBatch_Id]
                rootState.Database.connection.run(sql, params, (err) => {
                  if (err) {
                    let msg = 'Could not insert new quad ' + quad.Id + ': ' + err
                    return reject(msg)
                  }
                  return resolve()
                })
              }
            } else {
              resolve()
            }
          })
        }))
      }).then(() => {
        return Promise.all(state.deletedQuads.map((quad) => {
          if (!isNew(quad.Id)) {
            rootState.Database.connection.run('DELETE FROM Quads WHERE Id = ?;', [quad.Id], (err) => {
              if (err) {
                let msg = 'Could not delete quad ' + quad.Id + ': ' + err
                return reject(msg)
              }
              return resolve()
            })
          } else {
            resolve()
          }
        }))
      }).then(() => {
        dispatch('NOTIFY', { message: 'Saved successfully', duration: 5000 }, { root: true })
        resolve()
      }).catch((msg) => {
        dispatch('ERROR', msg, { root: true })
        reject(msg)
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
    if (state.quadsByBatch[quad.QuadBatch_Id]) {
      state.quadsByBatch[quad.QuadBatch_Id].push(quad)
    } else {
      state.quadsByBatch[quad.QuadBatch_Id] = [quad]
    }
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
        }
        break
      }
    }
  },

  // DELETE_QUAD adds the quad to a deleted list ...
  DELETE_QUAD (state, quadId) {
    for (let i = 0; i < state.quads.length; i++) {
      let q = state.quads[i]
      if (q.Id === quadId) {
        // Move this quad into a "deleted quads" list, to be dealt with and
        // purged on LevelDetails/SAVE.
        let deleted = state.quads.splice(i, 1)[0]
        state.deletedQuads.push(deleted)
        let qbb = state.quadsByBatch[q.QuadBatch_Id]
        for (let j = 0; j < qbb.length; j++) {
          if (qbb[j].Id === quadId) {
            qbb.splice(j, 1)
            break
          }
        }
        break
      }
    }
  },

  ADD_BATCH (state, batch) {
    state.quadBatches.push(batch)
    if (state.batchesByLayer[batch.LevelLayer_Id]) {
      state.batchesByLayer[batch.LevelLayer_Id].push(batch)
    } else {
      state.batchesByLayer[batch.LevelLayer_Id] = [batch]
    }
  },

  EDIT_BATCH (state, batch) {
    if (state.batchesById[batch.Id]) {
      if (state.batchesById[batch.Id].ZIndex !== batch.ZIndex) {
        state.batchesById[batch.Id].ZIndex = batch.ZIndex
        state.batchesById[batch.Id].dirty = true
      }
    }
  },

  DELETE_BATCH (state, batch) {
    // The important part of this implementation is to add the batch to deleted
    // batches. Secondary importance is to remove from:
    //   - state.quadBatches
    //   - state.batchesByLayer
    //   - state.batchesById
    for (let i = 0; i < state.quadBatches.length; i++) {
      if (state.quadBatches[i].Id === batch.Id) {
        let deleted = state.quadBatches.splice(i, 1)[0]
        let bbl = state.batchesByLayer[batch.LevelLayer_Id]
        for (let j = 0; j < bbl.length; j++) {
          if (bbl.Id === batch.Id) {
            bbl.splice(j, 1)
            break
          }
        }
        delete state.batchesById[batch.Id]
        if (!isNew(deleted.Id)) {
          state.deletedQuadBatches.push(deleted)
        }
        break
      }
    }

    // Also do the same for any quads this batch referenced
    for (let i = 0; i < state.quads.length; i++) {
      let q = state.quads[i]
      if (q.QuadBatch_Id === batch.Id) {
        // Move this quad into a "deleted quads" list, to be dealt with and
        // purged on LevelDetails/SAVE.
        let deleted = state.quads.splice(i, 1)[0]
        if (!isNew(q.Id)) {
          state.deletedQuads.push(deleted)
        }
        let qbb = state.quadsByBatch[q.QuadBatch_Id]
        for (let j = 0; j < qbb.length; j++) {
          if (qbb[j].Id === q.Id) {
            qbb.splice(j, 1)
            break
          }
        }
        // because we spliced, we need to correct the index.
        i--
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
