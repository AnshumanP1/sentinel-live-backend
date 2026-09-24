import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { EventEmitter } from 'node:events';
export const redact = v => {
  if (Array.isArray(v)) return v.map(redact);
  if(v && typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,/password|authorization|api_key|ssn|secret|credential/i.test(k)?'[REDACTED]':redact(x)]));
  if(typeof v==='string') return v.replace(/Bearer\s+[^\s"']+/gi,'Bearer [REDACTED]').slice(0,16000);
  return v;
};
export class Store extends EventEmitter {
  constructor(path){super();if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path,{timeout:5000});this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS objects(kind TEXT,id TEXT,data TEXT NOT NULL,PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,time TEXT NOT NULL,type TEXT NOT NULL,api TEXT NOT NULL,actor TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY,role TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,name TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS dedupe(actor TEXT,key TEXT,result TEXT,PRIMARY KEY(actor,key));`);
  }
  get(kind,id,fallback=null){const r=this.db.prepare('SELECT data FROM objects WHERE kind=? AND id=?').get(kind,id);return r?JSON.parse(r.data):fallback;}
  put(kind,id,v){this.db.prepare('INSERT INTO objects VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind,id,JSON.stringify(v));return v;}
  list(kind,limit=200,offset=0){return this.db.prepare('SELECT data FROM objects WHERE kind=? ORDER BY rowid DESC LIMIT ? OFFSET ?').all(kind,limit,offset).map(r=>JSON.parse(r.data));}
  event(type,api='',actor='system',data={}){const time=new Date().toISOString(),clean=redact(data);const r=this.db.prepare('INSERT INTO events(time,type,api,actor,data) VALUES(?,?,?,?,?)').run(time,type,api,actor,JSON.stringify(clean));const e={seq:Number(r.lastInsertRowid),time,type,api,actor,data:clean};this.emit('event',e);return e;}
  events({after=0,before=Number.MAX_SAFE_INTEGER,limit=100}={}){return this.db.prepare('SELECT * FROM events WHERE seq>? AND seq<? ORDER BY seq DESC LIMIT ?').all(after,before,limit).map(r=>({...r,data:JSON.parse(r.data)}));}
  latest(){return Number(this.db.prepare('SELECT COALESCE(MAX(seq),0) n FROM events').get().n);}
  close(){this.db.close();}
}
