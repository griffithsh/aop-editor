const state = {
  list: []
}

function model (sql) {
  return { Id: sql.Id, Description: sql.Description }
}

const actions = {
  GET ({ commit, dispatch, rootState }) {
    commit('ASSIGN', [])
    rootState.Database.connection.each('SELECT * FROM Levels;', (err, row) => {
      if (err) {
        dispatch('ERROR', 'Could not load Levels: ' + err, { root: true })
        return
      }
      commit('APPEND', model(row))
    }, (err, count) => {
      if (err) {
        dispatch('ERROR', 'Could not load Levels: ' + err, { root: true })
      }
    })
  }
}

const mutations = {
  ASSIGN (state, levels) {
    state.list = levels
  },
  APPEND (state, level) {
    state.list.push(level)
  }
}

export default {
  namespaced: true,

  actions,
  mutations,
  state
}
