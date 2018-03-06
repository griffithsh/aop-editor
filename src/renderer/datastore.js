// import path from 'path'
// import fs from 'fs'
// import { remote } from 'electron'

// const sqlite3 = require('sqlite3').verbose();
import sqlite3 from 'sqlite3'

let db = {}

export default {
  f: function (p) {
    db.get('SELECT * FROM Actor;', [], (err, row) => {
      if (err) {
        console.log('db.get:', err)
        return
      }
      console.log('Actor:', row)
      return row
    })
  },
  open: function (file) {
    db = new sqlite3.Database('/Users/hgriffiths/banana.sqlite', sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error(err.message)
      }
      console.log('Connected to the database.')
    })
  }
}
