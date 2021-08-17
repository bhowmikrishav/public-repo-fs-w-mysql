var MYSQL = require('mysql');
const { MANIFEST } = require("../server");

class DB_Manager {
  static mk_new_connection() {
    return new Promise(function (resolve, reject) {
      try {
        var conn = MYSQL.createConnection(MANIFEST.DB_CONFIG);
        conn.connect((err) => {
          if (err) { reject(err); return; }
          resolve(conn);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  static insert(tablename, dataset, conn) {
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn);
        if (connabsent)
          conn = await DB_Manager.mk_new_connection();

        conn.query(`INSERT INTO ${tablename} SET ? ;`, dataset, (error, results) => {
          if (error) { reject(error); conn.end(); return; }
          if (connabsent)
            conn.end();
          resolve(results.insertId);
        });

      } catch (e) {
        reject(e);
      }
    });
  }
  static find(tablename, outputs, dataset, conn) {
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn);
        if (connabsent)
          conn = await DB_Manager.mk_new_connection();

        var query = `SELECT ${outputs.join(', ')} FROM ${tablename}`, q_diminsh = false;
        for (var i in dataset) {
          if (!q_diminsh) { query += ' WHERE'; }
          if (q_diminsh) { query += ' &&'; }
          query += ` ${i} = ?`;
          q_diminsh = true;
        }
        console.log(query);
        conn.query(query, Object.values(dataset), (error, results) => {
          if (error) { reject(error); conn.end(); return; }
          if (connabsent)
            conn.end();
          resolve(results);
        });

      } catch (e) {
        reject(e);
      }
    });
  }
  static update_set(tablename, new_dataset, dataset, conn) {
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn);
        if (connabsent)
          conn = await DB_Manager.mk_new_connection();

        var query = `UPDATE ${tablename} SET ?`, q_diminsh = false;
        for (var i in dataset) {
          if (!q_diminsh) { query += ' WHERE'; }
          if (q_diminsh) { query += ' &&'; }
          query += ` ${i} = ?`;
          q_diminsh = true;
        }
        console.log(query);
        conn.query(query, [new_dataset].concat(Object.values(dataset)), (error, results) => {
          if (error) { reject(error); conn.end(); return; }
          if (connabsent)
            conn.end();
          resolve(results);
        });

      } catch (e) {
        reject(e);
      }
    });
  }
  static find_delete(tablename, dataset, conn) {
    return new Promise(async (resolve, reject) => {
      try {
        var connabsent = (!conn);
        if (connabsent)
          conn = await DB_Manager.mk_new_connection();
        var query = `DELETE FROM ${tablename}`, q_diminsh = false;
        for (var i in dataset) {
          if (!q_diminsh) { query += ' WHERE'; }
          if (q_diminsh) { query += ' &&'; }
          query += ` ${i} = ?`;
          q_diminsh = true;
        }
        console.log(query);
        conn.query(query, Object.values(dataset), (error, results) => {
          if (error) { reject(error); conn.end(); return; }
          if (connabsent)
            conn.end();
          resolve(results);
        });

      } catch (e) {
        reject(e);
      }
    });
  }
}
module.exports = {DB_Manager};
