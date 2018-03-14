import fs from 'fs'
import path from 'path'

// getData of a file, composing the base64 encoded data-uri
function getData (dir, filename, id, callback) {
  fs.readFile(dir + filename, function (err, data) {
    if (err) {
      callback(new Error('readFile: ' + err), null)
      return
    }
    callback(null, {
      filename,
      id,
      dataUri: 'data:image/' + filename.split('.').pop() + ';base64,' + Buffer.from(data).toString('base64')
    })
  })
}

function filesIn (dir) {
  let files = fs.readdirSync(dir)
  let result = []

  files.forEach(file => {
    let fi = fs.statSync(dir + '/' + file)
    if (fi.isDirectory()) {
      let recursion = filesIn(dir + '/' + file)
      result = result.concat(recursion)
      return
    }
    let ext = file.split('.').pop().toLowerCase()
    if (ext !== 'png' && ext !== 'jpg') {
      return
    }
    result.push({
      file,
      dir
    })
  })

  return result
}

const state = {
  list: [],
  unregistered: []
}

const mutations = {
  ASSIGN (state, textures) {
    state.list = textures
  },

  ASSIGN_UNREGISTERED (state, files) {
    state.unregistered = files
  },

  // APPEND to the texture list
  APPEND (state, texture) {
    state.list.push(texture)
  },

  // APPEND_UNREGISTERED file to the unregistered list
  APPEND_UNREGISTERED (state, file) {
    state.unregistered.push(file)
  }
}

const actions = {
  // LOAD all textures from the database.
  LOAD ({commit, dispatch, rootState}) {
    // Blow away the current list
    commit('ASSIGN', [])
    return new Promise((resolve, reject) => {
      let dir = path.dirname(rootState.Database.filename) + '/'

      // Query for the textures
      rootState.Database.connection.all('SELECT * FROM Textures;', function (err, rows) {
        if (err) {
          dispatch('ERROR', 'SELECT Textures: ' + err, { root: true })
        }
        rows.forEach((row) => {
          getData(dir, row.FileName, row.Id, (err, t) => {
            if (err) {
              dispatch('ERROR', 'getData: ' + err, { root: true })
            }
            commit('APPEND', t)
          })
        })
        resolve()
      })
    })
  },

  // LOAD_UNREGISTERED images that could be promoted to Textures.
  async LOAD_UNREGISTERED ({ commit, dispatch, rootState, state }) {
    commit('ASSIGN_UNREGISTERED', [])
    dispatch('LOAD').then(() => {
      let dir = path.dirname(rootState.Database.filename)
      let files = filesIn(dir)
      files.forEach(o => {
        getData(o.dir + '/', o.file, null, (err, t) => {
          if (err) {
            dispatch('ERROR', 'getData: ' + err, { root: true })
          }

          for (let i = 0; i < state.list.length; i++) {
            if (state.list[i].filename === t.filename) {
              return
            }
          }
          commit('APPEND_UNREGISTERED', t)
        })
      })
    })
  }
}

export default {
  namespaced: true,

  state,
  mutations,
  actions
}
