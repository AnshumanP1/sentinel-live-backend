import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const source=process.env.DATA_FILE||resolve('data/sentinel.sqlite'),target=process.argv[2]||resolve('backups/sentinel-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
mkdirSync(resolve(target,'..'),{recursive:true});const db=new DatabaseSync(source,{readOnly:true});await backup(db,target);db.close();console.log('Consistent SQLite backup created: '+target);
