import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'..');
const dictionary={...JSON.parse(await readFile(path.join(root,'translation-base.json'),'utf8')),...JSON.parse(await readFile(path.join(root,'translation-fixes.json'),'utf8'))};
await writeFile(path.join(root,'web/i18n.js'),'window.QStrings = '+JSON.stringify(dictionary)+';');
// Vendored MIT QR encoder (kazuhikoarase/qrcode-generator) for patient status codes.
await copyFile(path.join(root,'node_modules/qrcode-generator/qrcode.js'),path.join(root,'web/qrcode.js'));
// Inter (SIL OFL 1.1) embedded as base64 so pages need no third-party font requests.
// Latin + Cyrillic + Cyrillic-ext covers Russian and Kazakh (ә ғ қ ң ө ұ ү һ і).
{const dir=path.join(root,'node_modules/@fontsource-variable/inter');const css=await readFile(path.join(dir,'index.css'),'utf8');
 const blocks=css.split('@font-face').slice(1).map(b=>'@font-face'+b.slice(0,b.indexOf('}')+1)).filter(b=>/inter-(latin|cyrillic|cyrillic-ext)-wght-normal\.woff2/.test(b));
 const out=[];for(const b of blocks){const file=b.match(/url\(\.\/files\/([^)]+)\)/)[1];const data=(await readFile(path.join(dir,'files',file))).toString('base64');out.push(b.replace(/url\([^)]+\)/,`url(data:font/woff2;base64,${data})`));}
 await writeFile(path.join(root,'web/fonts.css'),'/* Inter Variable, SIL Open Font License 1.1, see attribution/INTER-OFL.txt */\n'+out.join('\n')+'\n');
 await copyFile(path.join(dir,'LICENSE'),path.join(root,'web/attribution/INTER-OFL.txt'));}
const assets={};
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else assets['/'+path.relative(path.join(root,'web'),p).split(path.sep).join('/')]=await readFile(p,'utf8');}}
await walk(path.join(root,'web'));
const strip=code=>code.split('\n').filter(l=>!l.startsWith('import ')&&!l.startsWith('export {')).join('\n').replace(/^export async function /gm,'async function ').replace(/^export function /gm,'function ');
const dataCode=strip(await readFile(path.join(root,'worker/data.mjs'),'utf8'));
const platformCode=strip(await readFile(path.join(root,'worker/platform.mjs'),'utf8'));
const ai=await build({entryPoints:[path.join(root,'worker/ai.mjs')],bundle:true,format:'iife',globalName:'QadamAI',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'inline',conditions:['worker','browser']});
const code=await readFile(path.join(root,'worker/index.mjs'),'utf8');
await mkdir(path.join(root,'dist/server'),{recursive:true});
await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await writeFile(path.join(root,'dist/server/index.js'),ai.outputFiles[0].text+'\nconst ASSETS = '+JSON.stringify(assets)+';\n'+dataCode+'\n'+platformCode+'\n'+code);
await writeFile(path.join(root,'dist/.openai/hosting.json'),await readFile(path.join(root,'.openai/hosting.json')));
console.log('Built Worker with '+Object.keys(assets).length+' embedded assets.');
