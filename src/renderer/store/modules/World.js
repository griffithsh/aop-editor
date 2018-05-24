// World supports the "World" Vue component

const defaultTool = {
  name: '',

  up: null,
  down: null,
  move: null,
  out: null,
  over: null,

  cleanup: null
}
const state = {
  layerId: null,

  // tool is a map of functions to handle mouse events. The keys up, down, move,
  // out, and over are accepted, as well as a special method called cleanup to
  // be called as the tool is deactivated.
  tool: defaultTool,

  cursorTileId: null, // should be a tileId.
  cursorRequester: null // A function that is requesting the current cursor from whoever can provide it.
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

  // You can set a Tile as the cursor
  SET_CURSOR (state, tileId) {
    console.log('set cursor', tileId)
    state.cursorTileId = tileId
  },
  UNSET_CURSOR (state) {
    console.log('unset cursor')
    state.cursorTileId = null
  },
  GET_CURSOR (state, requester) {
    state.cursorRequester = requester
  }
}

export default {
  namespaced: true,

  actions,
  mutations,
  state
}
