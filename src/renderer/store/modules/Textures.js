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
    // If this file is a subdirectory, recurse.
    let fi = fs.statSync(dir + '/' + file)
    if (fi.isDirectory()) {
      let recursion = filesIn(dir + '/' + file).map((v) => {
        return file + '/' + v
      })
      result = result.concat(recursion)
      return
    }

    // Disregard anything not a jpg or a png
    let ext = file.split('.').pop().toLowerCase()
    if (ext !== 'png' && ext !== 'jpg') {
      return
    }

    // Add file to list
    result.push(file)
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
  },

  REMOVE_UNREGISTERED (state, file) {
    for (let i = 0; i < state.unregistered.length; i++) {
      if (state.unregistered[i].filename === file) {
        state.unregistered.splice(i, 1)
        break
      }
    }
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
      let resources = path.dirname(rootState.Database.filename)
      let files = filesIn(resources)
      files.forEach(f => {
        getData(resources + '/', f, null, (err, t) => {
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
  },

  REGISTER ({ commit, dispatch, rootState }, payload) {
    rootState.Database.connection.run('INSERT INTO Textures (Filename) VALUES (?);', payload, (err) => {
      if (err) {
        dispatch('ERROR', 'Textures/REGISTER/Insert "' + payload + '": ' + err, { root: true })
        return
      }
      // Remove from unregistered
      commit('REMOVE_UNREGISTERED', payload)
      rootState.Database.connection.get('SELECT Id,FileName FROM Textures WHERE FileName = ?;', payload, (err, row) => {
        if (err) {
          dispatch('ERROR', 'Textures/REGISTER/Select: ' + err, { root: true })
          return
        }
        // Add to list
        let dir = path.dirname(rootState.Database.filename) + '/'
        getData(dir, row.FileName, row.Id, (err, t) => {
          if (err) {
            dispatch('ERROR', 'getData: ' + err, { root: true })
          }
          commit('APPEND', t)
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
