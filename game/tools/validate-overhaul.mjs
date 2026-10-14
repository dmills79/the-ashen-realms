import {readFileSync,existsSync} from 'node:fs';
const ancestries=['Human','Elf','Dwarf','Halfling'],roles=['fighter','rogue','wizard','cleric'];let checked=0;
for(const ancestry of ancestries)for(const role of roles)for(const appearance of ['male','female']){
 const prefix=ancestry==='Human'?'':ancestry.toLowerCase()+'_';
 for(const name of [ancestry.toLowerCase()+'_'+role+'_'+appearance,...['up','right','down','left'].flatMap(dir=>[prefix+role+'_'+appearance+'_'+dir,prefix+role+'_'+appearance+'_'+dir+'_walk'])]){
  const path='assets/identity/'+name+'.png';if(!existsSync(path))throw Error('Missing '+path);
  const png=readFileSync(path);
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||png.toString('ascii',12,16)!=='IHDR'||!png.includes(Buffer.from('IEND')))throw Error('Invalid PNG '+path);
  if(png.readUInt32BE(16)<20||png.readUInt32BE(20)<80)throw Error('Undersized '+path);
  // Opaque portraits may be RGB; sprites must retain alpha or indexed transparency.
  if(!name.endsWith('_'+appearance)&&![4,6].includes(png[25])&&!png.includes(Buffer.from('tRNS')))throw Error('Missing sprite transparency '+path);
  checked++;
 }
}
for(const theme of ['title','tavern','havenmere','wilderness','crypt','combat','boss']){
 const wav=readFileSync('assets/audio/overhaul/'+theme+'.wav');if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('Invalid '+theme);
 const samples=wav.readUInt32LE(40)/2,rate=wav.readUInt32LE(24);if(samples/rate!==32)throw Error('Invalid duration '+theme);
 let peak=0,energy=0;for(let i=44;i<wav.length;i+=2){const sample=wav.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(sample));energy+=sample*sample}
 if(peak>=.999||energy<1)throw Error('Silent/clipped '+theme);console.log(theme+': 32s, peak '+peak.toFixed(3)+', RMS '+Math.sqrt(energy/samples).toFixed(3));
}
console.log(checked+' identity assets validated.');
