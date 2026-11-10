// Local development/test adapter; not included in the deployed Worker.
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export function createLocalD1(filename=':memory:',migrationDirectory=resolve(import.meta.dirname,'../drizzle')){
 const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS _qadamx_local_migrations(tag TEXT PRIMARY KEY)');
 const journal=JSON.parse(readFileSync(resolve(migrationDirectory,'meta/_journal.json'),'utf8'));
 for(const entry of journal.entries){if(sqlite.prepare('SELECT tag FROM _qadamx_local_migrations WHERE tag=?').get(entry.tag))continue;sqlite.exec('BEGIN IMMEDIATE');try{sqlite.exec(readFileSync(resolve(migrationDirectory,entry.tag+'.sql'),'utf8'));sqlite.prepare('INSERT INTO _qadamx_local_migrations(tag) VALUES(?)').run(entry.tag);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}}
 class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(column){const row=sqlite.prepare(this.sql).get(...this.args);return row?(column?row[column]:row):null;}
  async all(){return {success:true,results:sqlite.prepare(this.sql).all(...this.args),meta:{}};}
  execute(){const result=sqlite.prepare(this.sql).run(...this.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async run(){return this.execute();}
 }
 return {prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}},close:()=>sqlite.close(),raw:sqlite};
}
