import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dictionary={...JSON.parse(await readFile(path.join(root,'translation-base.json'),'utf8')),...JSON.parse(await readFile(path.join(root,'translation-fixes.json'),'utf8'))};
await writeFile(path.join(root,'web/i18n.js'),'window.QStrings = '+JSON.stringify(dictionary)+';');
const assets={};
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else assets['/'+path.relative(path.join(root,'web'),p).replaceAll('\\','/')]=await readFile(p,'utf8');}}
await walk(path.join(root,'web'));
const dataCode=(await readFile(path.join(root,'worker/data.mjs'),'utf8')).replace('export async function handleData','async function handleData');
const code=await readFile(path.join(root,'worker/index.mjs'),'utf8');
await mkdir(path.join(root,'dist/server'),{recursive:true});
await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await writeFile(path.join(root,'dist/server/index.js'),'const ASSETS = '+JSON.stringify(assets)+';\n'+dataCode+'\n'+code);
await writeFile(path.join(root,'dist/.openai/hosting.json'),await readFile(path.join(root,'.openai/hosting.json')));
console.log('Built Worker with '+Object.keys(assets).length+' embedded assets.');
