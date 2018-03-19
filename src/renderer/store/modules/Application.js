const state = {
  notification: {
    show: false,
    message: ''
  }
}

const actions = {
  ERROR (context, err) {
    console.error('Application Error:', err)
  },
  NOTIFY ({ commit }, { message, duration = 2500 }) {
    commit('SET_NOTIFICATION', { message, show: true })
    setTimeout(() => {
      commit('SET_NOTIFICATION', {show: false})
    }, duration)
  },
  DISMISS_NOTIFICATION ({ commit }) {
    commit('SET_NOTIFICATION', {show: false})
  }
}

const mutations = {
  SET_NOTIFICATION (state, { show, message }) {
    state.notification.show = show
    state.notification.message = message
  }
}

export default {
  actions,
  mutations,
  state
}
