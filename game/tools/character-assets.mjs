/** Read and register PNG sheets without altering generated artwork or requiring packages. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIRECTORY=path.join(ROOT,'assets/characters_v2');
const ALPHA_THRESHOLD=24;

export function readPng(bytes){
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected PNG');
  let width,height,depth,color,interlace;const data=[];
  for(let offset=8;offset<bytes.length;){
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
    const chunk=bytes.subarray(offset+8,offset+8+length);
    if(type==='IHDR'){width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);depth=chunk[8];color=chunk[9];interlace=chunk[12]}
    if(type==='IDAT')data.push(chunk);
    offset+=length+12;
  }
  if(depth!==8||color!==6||interlace!==0||!width||!height||width>8192||height>8192)throw Error('Expected a non-interlaced 8-bit RGBA PNG');
  const stride=width*4,raw=inflateSync(Buffer.concat(data),{maxOutputLength:(stride+1)*height});
  if(raw.length!==(stride+1)*height)throw Error('PNG has invalid scanline length');
  const pixels=new Uint8Array(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c};
  for(let y=0;y<height;y++){
    const start=y*(stride+1),filter=raw[start];if(filter>4)throw Error('Invalid PNG filter');
    for(let x=0;x<stride;x++){
      const at=y*stride+x,left=x>=4?pixels[at-4]:0,up=y?pixels[at-stride]:0,diagonal=y&&x>=4?pixels[at-stride-4]:0;
      const add=filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,diagonal):0;
      pixels[at]=(raw[start+1+x]+add)&255;
    }
  }
  return {width,height,pixels};
}

export function registerFrames(png,columns=4,rows=3){
  const {width,height,pixels}=png,total=width*height;
  const labels=new Int32Array(total),queue=new Int32Array(total),components=[null];
  // Identify complete connected figures, not rectangular cells. Long staffs and
  // spell silhouettes can cross grid lines without becoming part of another pose.
  for(let index=0;index<total;index++){
    if(labels[index]||pixels[index*4+3]<=ALPHA_THRESHOLD)continue;
    const label=components.length;let head=0,count=1,sumX=0,sumY=0,minX=width,minY=height,maxX=0,maxY=0;
    queue[0]=index;labels[index]=label;
    while(head<count){
      const at=queue[head++],x=at%width,y=Math.floor(at/width);
      sumX+=x;sumY+=y;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const neighbor=ny*width+nx;
        if(!labels[neighbor]&&pixels[neighbor*4+3]>ALPHA_THRESHOLD){labels[neighbor]=label;queue[count++]=neighbor}
      }
    }
    const cell=Math.min(rows-1,Math.floor(sumY/count/height*rows))*columns+Math.min(columns-1,Math.floor(sumX/count/width*columns));
    components.push({label,count,cell,rect:[minX,minY,maxX-minX+1,maxY-minY+1]});
  }
  const primary=Array(columns*rows).fill(null);
  for(const component of components.slice(1)){
    if(!primary[component.cell]||component.count>primary[component.cell].count)primary[component.cell]=component;
  }
  return primary.map((component,index)=>{
    if(!component||component.count<1000)throw Error(`Missing complete sprite figure ${index}`);
    const [x,y,w,h]=component.rect,footStart=y+h-Math.max(3,Math.floor(h*.06));let footX=0,footCount=0;
    for(let py=footStart;py<y+h;py++)for(let px=x;px<x+w;px++)if(labels[py*width+px]===component.label){footX+=px;footCount++}
    const exclusions=[];
    for(let py=y;py<y+h;py++){
      let start=null;
      for(let px=x;px<=x+w;px++){
        const label=px<x+w?labels[py*width+px]:0;
        const foreign=label&&components[label].cell!==index;
        if(foreign&&start===null)start=px;
        if(!foreign&&start!==null){exclusions.push([start,py,px-start]);start=null}
      }
    }
    return {rect:component.rect,anchor:[Math.round(footX/footCount),y+h],exclusions};
  });
}

export function buildManifest({allowMissing=false}={}){
  const generation=JSON.parse(readFileSync(path.join(DIRECTORY,'generation.json'),'utf8'));
  const characters={};
  for(const [id,definition] of Object.entries(generation.characters)){
    const filename=path.join(DIRECTORY,id+'.png');
    if(!existsSync(filename)){if(allowMissing)continue;throw Error(`Missing sprite sheet: ${id}`)}
    const png=readPng(readFileSync(filename)),frames=registerFrames(png);
    let transparent=0;for(let i=3;i<png.pixels.length;i+=4)if(png.pixels[i]===0)transparent++;
    if(transparent/(png.width*png.height)<.2)throw Error(`Sheet lacks sufficient true transparency: ${id}`);
    characters[id]={name:definition.name,kind:definition.kind,src:'characters_v2/'+id+'.png',
      width:png.width,height:png.height,heightInBattle:definition.height,heightInWorld:definition.worldHeight,
      referenceHeight:Math.round((frames[0].rect[3]+frames[1].rect[3])/2),facing:'right',frames,
      animations:{idle:{frames:[0,1],duration:1500,loop:true},walk:{frames:[2,3],duration:360,loop:true},
        attack:{frames:[4,5],duration:850,loop:false},cast:{frames:[6,7],duration:850,loop:false},
        hit:{frames:[8,9],duration:380,loop:false},death:{frames:[10,11],duration:350,loop:false}}};
  }
  return {version:1,style:'Illustrated dark fantasy',generator:'Built-in image_gen',characters};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const manifest=buildManifest({allowMissing:process.argv.includes('--allow-missing')});
  const json=JSON.stringify(manifest,null,2)+'\n';
  const script="/* Generated by tools/character-assets.mjs. Edit generation.json and rebuild. */\n'use strict';\nwindow.AshenCharacterManifest="+JSON.stringify(manifest)+';\n';
  if(process.argv.includes('--check')){
    const current=file=>readFileSync(file,'utf8').replace(/\r\n/g,'\n');
    if(current(path.join(DIRECTORY,'manifest.json'))!==json||current(path.join(ROOT,'character-assets.js'))!==script)throw Error('Character manifest is stale; rebuild with node tools/character-assets.mjs');
  }else{
    writeFileSync(path.join(DIRECTORY,'manifest.json'),json);writeFileSync(path.join(ROOT,'character-assets.js'),script);
  }
  for(const [id,asset] of Object.entries(manifest.characters)){
    const isolated=asset.frames.filter(f=>f.exclusions.length).length;
    console.log(`${id}: ${asset.width}×${asset.height}, ${asset.frames.length} complete figures${isolated?`, ${isolated} overlapping frame regions isolated`:''}`);
  }
}
