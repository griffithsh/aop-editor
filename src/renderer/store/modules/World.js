// World supports the "World" Vue component

const defaultTool = {
  name: '',

  up: null,
  down: null,
  move: null,
  out: null,
  over: null,

  cleanup: null,

  // status can be set to a function that provides a string for the footer.
  status: null
}
const state = {
  layerId: null,
  highlight: {},

  // tool is a map of functions to handle mouse events. The keys up, down, move,
  // out, and over are accepted, as well as a special method called cleanup to
  // be called as the tool is deactivated.
  tool: defaultTool
}

const actions = { }

const mutations = {
  SET_LAYER_ID (state, id) {
    state.layerId = id
  },
  SET_TOOL (state, funcs) {
    if (funcs.name === state.tool.name) { return }

    state.tool = funcs
  },
  UNSET_TOOL (state) {
    state.tool = defaultTool
  },
  SET_HIGHLIGHT_BATCH (state, id) {
    state.highlight = { batchId: id }
  },
  UNSET_HIGHLIGHT (state) {
    state.highlight = { }
  }
}

export default {
  namespaced: true,

  actions,
  mutations,
  state
}
