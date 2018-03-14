import sqlite3 from 'sqlite3'
const {dialog} = require('electron').remote

const state = {
  filename: null,
  connection: null
}

const mutations = {
  ASSIGN (state, {database, path}) {
    state.connection = database
    state.filename = path
  }
}

const actions = {
  // PICK an aop sqlite game database to open with a OS open-file dialog.
  PICK ({ dispatch }) {
    let filters = [
      {
        name: 'core',
        extensions: [
          'sqlite3'
        ]
      }
    ]

    dialog.showOpenDialog({ filters }, (filepaths) => {
      if (!filepaths) return

      let file = filepaths[0]
      dispatch('OPEN', file)
    })
  },

  // OPEN the aop sqlite database specified by "path".
  OPEN ({ commit, dispatch }, path) {
    var database = new sqlite3.Database(path, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        dispatch('ERROR', err.message, { root: true })
      }
      commit('ASSIGN', {database, path})
    })
  },

  // CLOSE the currently open database.
  CLOSE ({ state, commit, dispatch }) {
    if (state.connection === null) {
      dispatch('ERROR', 'cannot close null db', { root: true })
      return
    }
    state.connection.close((err) => {
      if (err) {
        dispatch('ERROR', err.message, { root: true })
      }
      commit('ASSIGN', {})
    })
  }
}

export default {
  namespaced: true,

  state,
  mutations,
  actions
}
