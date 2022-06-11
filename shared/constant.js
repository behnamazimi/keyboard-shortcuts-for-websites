'use strict';

// shortcut type
const TYPES = {
  click: 0,
  script: 1
}

const globalActions = {
  INIT: "INIT",
  POPUP_INIT: "POPUP_INIT",
  CLEAT_DATA: "CLEAT_DATA",
  IMPORT_DATA: "IMPORT_DATA",
  GET_ALL_DATA: "GET_ALL_DATA",
  NEW_SHORTCUT: "NEW_SHORTCUT",
  DELETE_HOST: "DELETE_HOST",
  DELETE_SHORTCUT: "DELETE_SHORTCUT",
  HOST_OPTION_UPDATE: "HOST_OPTION_UPDATE",
  GLOBAL_OPTIONS_UPDATE: "GLOBAL_OPTIONS_UPDATE",
}

const contentActions = {
  OPTION_UPDATE: "OPTION_UPDATE",
  HOST_SHORTCUTS: "HOST_SHORTCUTS",
  SHORTCUT_ADDED: "SHORTCUT_ADDED",
  START_LISTENING: "START_LISTENING",
  SHORTCUTS_UPDATED: "SHORTCUTS_UPDATED",
}