/* Original deterministic scores; no recordings or copyrighted melodies are sampled. */
import {mkdirSync,writeFileSync} from 'node:fs';
const rate=22050,seconds=32,size=rate*seconds,tau=Math.PI*2;
const themes={
 title:{root:73.416,beat:.8,drum:.48,choir:.55,pluck:.18,mode:[0,3,7,10]},
 tavern:{root:110,beat:.5,drum:.2,choir:.06,pluck:.56,mode:[0,5,7,3]},
 havenmere:{root:97.999,beat:.64,drum:.24,choir:.2,pluck:.4,mode:[0,7,5,3]},
 wilderness:{root:82.407,beat:.8,drum:.28,choir:.32,pluck:.22,mode:[0,3,5,7]},
 crypt:{root:65.406,beat:1.6,drum:.22,choir:.7,pluck:.05,mode:[0,1,7,3]},
 combat:{root:73.416,beat:.4,drum:.8,choir:.19,pluck:.26,mode:[0,3,7,5]},
 boss:{root:65.406,beat:.32,drum:.95,choir:.42,pluck:.18,mode:[0,1,7,10]}
};
mkdirSync('assets/audio/overhaul',{recursive:true});
for(const [name,p] of Object.entries(themes)){
 const samples=new Float64Array(size);
 const add=(at,duration,fn,gain)=>{const start=Math.round(at*rate),count=Math.round(duration*rate);for(let i=0;i<count;i++){const index=(start+i)%size;samples[index]+=fn(i/rate)*gain}};
 // Sustained low strings and vowel-like harmonic choir. The choir is synthetic, not a human recording.
 for(let segment=0;segment<4;segment++){
  const root=p.root*2**(p.mode[segment]/12);
  for(const offset of [0,7]){
   const freq=root*2**(offset/12);
   add(segment*8,10,t=>{const env=Math.min(1,t/2)*Math.max(0,Math.min(1,(10-t)/2));return (Math.sin(tau*freq*t)+.35*Math.sin(tau*freq*2*t)+.15*Math.sin(tau*freq*3*t))*env},.035);
   for(const detune of [.998,1.003])add(segment*8,10,t=>{
    const env=Math.min(1,t/1.8)*Math.max(0,Math.min(1,(10-t)/2)),f=freq*2*detune,phase=tau*f*t+.015*Math.sin(tau*4.2*t);
    let voice=0;for(let harmonic=1;harmonic<=10;harmonic++){const hz=f*harmonic,formant=Math.exp(-(((hz-750)/240)**2))+.6*Math.exp(-(((hz-1200)/310)**2));voice+=Math.sin(phase*harmonic)*(formant+.1)/harmonic}
    return voice*env;
   },p.choir*.08);
  }
 }
 // Ceremonial drums, dry frame-drum accents, and a repeating plucked modal melody.
 for(let at=0,index=0;at<seconds;at+=p.beat,index++){
  const strong=index%4===0,gain=(strong?.17:.075)*p.drum;
  add(at,.9,t=>Math.sin(tau*(48*t+45*.018*(1-Math.exp(-t/.018))))*Math.exp(-t*7)+.22*Math.sin(tau*112*t)*Math.exp(-t*18),gain);
  if(index%2)add(at,.13,t=>{const noise=Math.sin(t*rate*12.9898)*Math.sin(t*rate*78.233);return noise*Math.exp(-t*34)},p.drum*.028);
  const tones=[0,7,12,3,10,7,5,3],freq=p.root*2**((tones[index%8]+12)/12);
  add(at,2.8,t=>(Math.sin(tau*freq*t)+.25*Math.sin(tau*freq*2*t)+.15*Math.sin(tau*freq*3*t))*Math.exp(-t*3.5)*(1-Math.exp(-t*90)),p.pluck*.11);
 }
 // Circular delay adds space and makes the loop seam continuous.
 const wet=new Float64Array(samples);for(const [delay,gain] of [[.173,.22],[.347,.16],[.613,.11]]){const shift=Math.round(delay*rate);for(let i=0;i<size;i++)wet[(i+shift)%size]+=samples[i]*gain}
 const header=Buffer.alloc(44+size*2);header.write('RIFF');header.writeUInt32LE(header.length-8,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(size*2,40);
 for(let i=0;i<size;i++)header.writeInt16LE(Math.round(Math.tanh(wet[i]*1.5)*26000),44+i*2);
 writeFileSync('assets/audio/overhaul/'+name+'.wav',header);console.log(name+' · 32s original score');
}
