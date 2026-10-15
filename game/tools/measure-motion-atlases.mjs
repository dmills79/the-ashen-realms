/* Measure generated artwork only. PNG bytes are never rewritten. Node 20+, no packages. */
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,relative,dirname,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROLES=['Fighter','Rogue','Wizard','Cleric'];
const RACES=['human','elf','dwarf','halfling'];
const SEXES=['male','female'];
const ACTIONS=['windup','meleeimpact','castprepare','castrelease','hit','defend','death','rangedrelease'];
const SEATED=['idle','drink','converse'];
// These four generated sheets contain five genuine phases; no phase is duplicated.
const WALK_ROW_OVERRIDES=Object.freeze({'elf_rogue_female_motion.png':5,'halfling_fighter_male_motion.png':5,'halfling_rogue_male_motion.png':5,'human_rogue_female_motion.png':5});
const AMBIENT=['drink','serve','converse','seatedIdle','seatedDrink','seatedConverse'];
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b),n=sorted.length;return n%2?sorted[n>>1]:(sorted[n/2-1]+sorted[n/2])/2};
export function decodePng(buffer){
  if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Not a PNG');
  let width,height,depth,type,interlace,palette=null,transparency=null;const chunks=[];
  for(let at=8;at<buffer.length;){
    const size=buffer.readUInt32BE(at),name=buffer.toString('ascii',at+4,at+8),data=buffer.subarray(at+8,at+8+size);
    if(at+12+size>buffer.length)throw Error('Truncated PNG');
    if(name==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];interlace=data[12]}
    if(name==='PLTE')palette=data;if(name==='tRNS')transparency=data;if(name==='IDAT')chunks.push(data);
    at+=size+12;if(name==='IEND')break;
  }
  if(depth!==8||interlace!==0)throw Error('Requires noninterlaced 8-bit PNG; received depth '+depth+' interlace '+interlace);
  const channels={0:1,2:3,3:1,4:2,6:4}[type];if(!channels)throw Error('Unsupported PNG color type '+type);
  const stride=width*channels,raw=inflateSync(Buffer.concat(chunks));
  if(raw.length!==(stride+1)*height)throw Error('PNG scanline length mismatch');
  const decoded=Buffer.alloc(stride*height),data=new Uint8Array(width*height*4);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];if(filter>4)throw Error('Invalid PNG row filter');
    for(let x=0;x<stride;x++){
      const a=x>=channels?decoded[y*stride+x-channels]:0,b=y?decoded[(y-1)*stride+x]:0,c=y&&x>=channels?decoded[(y-1)*stride+x-channels]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);decoded[y*stride+x]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  for(let i=0;i<width*height;i++){
    const src=i*channels,dst=i*4;
    if(type===6){data.set(decoded.subarray(src,src+4),dst);continue}
    if(type===3){const index=decoded[src];if(!palette||index*3+2>=palette.length)throw Error('PNG palette index out of bounds');data[dst]=palette[index*3];data[dst+1]=palette[index*3+1];data[dst+2]=palette[index*3+2];data[dst+3]=transparency?.[index]??255;continue}
    if(type===0||type===4){data[dst]=data[dst+1]=data[dst+2]=decoded[src];data[dst+3]=type===4?decoded[src+1]:(transparency&&decoded[src]===transparency.readUInt16BE(0)?0:255);continue}
    data[dst]=decoded[src];data[dst+1]=decoded[src+1];data[dst+2]=decoded[src+2];
    data[dst+3]=transparency&&[0,1,2].every(c=>decoded[src+c]===transparency.readUInt16BE(c*2))?0:255;
  }
  return {width,height,data};
}
export function measureCell(image,cell){
  const [sx,sy,cw,ch]=cell,{width,data}=image,n=cw*ch,mask=new Uint8Array(n),queue=new Int32Array(n),components=[];
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((sy+y)*width+sx+x)*4+3]>64)mask[y*cw+x]=1;
  for(let index=0;index<n;index++){
    if(!mask[index])continue;let head=0,tail=1;queue[0]=index;mask[index]=0;
    while(head<tail){const at=queue[head++],x=at%cw,y=Math.floor(at/cw);
      for(const next of [x?at-1:-1,x<cw-1?at+1:-1,y?at-cw:-1,y<ch-1?at+cw:-1])if(next>=0&&mask[next]){mask[next]=0;queue[tail++]=next}
    }
    components.push(Array.from(queue.subarray(0,tail)));
  }
  if(!components.length)throw Error('Empty alpha cell '+cell.join(','));
  const largest=components.reduce((largest,c)=>Math.max(largest,c.length),0),minimum=Math.max(12,Math.ceil(largest*.004));
  const retained=components.filter(c=>c.length>=minimum);if(!retained.length)throw Error('Only alpha specks in cell '+cell.join(','));
  let minX=cw,minY=ch,maxX=-1,maxY=-1,pixels=0;
  for(const component of retained)for(const at of component){const x=at%cw,y=Math.floor(at/cw);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);pixels++}
  const torso=new Uint32Array(cw),rows=new Uint32Array(ch),bodyHeight=maxY-minY+1;
  for(const component of retained)for(const at of component){const x=at%cw,y=Math.floor(at/cw);rows[y]++;if(y>=minY+bodyHeight*.23&&y<=minY+bodyHeight*.68)torso[x]++}
  let total=torso.reduce((a,b)=>a+b,0),sum=0,anchorX=(minX+maxX+1)/2;
  if(total)for(let x=0;x<cw;x++){sum+=torso[x];if(sum>=total/2){anchorX=x+.5;break}}
  // Subpixel center avoids a consistent left bias when torso has an even pixel width.
  const medianLeft=anchorX-.5;if(total&&sum===total/2){let right=medianLeft+1;while(right<cw&&!torso[right])right++;anchorX=(medianLeft+right+1)/2}
  let foot=maxY;while(foot>minY&&rows[foot]<Math.max(2,(maxX-minX+1)*.025))foot--;
  const left=Math.max(0,minX-2),top=Math.max(0,minY-2),right=Math.min(cw,maxX+3),bottom=Math.min(ch,maxY+3);
  const silhouette=Buffer.alloc((maxX-minX+1)*bodyHeight);for(const component of retained)for(const at of component){const x=at%cw,y=Math.floor(at/cw);silhouette[(y-minY)*(maxX-minX+1)+x-minX]=1}
  return {rect:[sx+left,sy+top,right-left,bottom-top],anchor:[sx+anchorX,sy+foot+1],bodyHeight,pixels,components:retained.length,removedComponents:components.length-retained.length,shape:createHash('sha256').update(String(maxX-minX+1)+':'+bodyHeight+':').update(silhouette).digest('hex'),touchesCellEdge:minX===0||minY===0||maxX===cw-1||maxY===ch-1};
}
export function measureWholeAtlas(image,columns,rows,{adaptiveRows=false}={}){
  const {width,height,data}=image,total=width*height,labels=new Int32Array(total),queue=new Int32Array(total),components=[null],count=columns*rows;
  for(let index=0;index<total;index++){
    if(labels[index]||data[index*4+3]<=240)continue;
    const id=components.length,overlaps=new Uint32Array(count);let head=0,tail=1,sumX=0,sumY=0,minX=width,minY=height,maxX=0,maxY=0;queue[0]=index;labels[index]=id;
    while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);
      sumX+=x;sumY+=y;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      overlaps[Math.min(rows-1,Math.floor(y/height*rows))*columns+Math.min(columns-1,Math.floor(x/width*columns))]++;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(Math.abs(dx)+Math.abs(dy)!==1)continue;
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const next=ny*width+nx;
        if(!labels[next]&&data[next*4+3]>240){labels[next]=id;queue[tail++]=next}
      }
    }
    const center=[sumX/tail,sumY/tail];let cell=Math.min(rows-1,Math.floor(center[1]/height*rows))*columns+Math.min(columns-1,Math.floor(center[0]/width*columns));
    for(let candidate=0;candidate<count;candidate++)if(overlaps[candidate]>overlaps[cell])cell=candidate;
    components.push({id,count:tail,cell,center,bounds:[minX,minY,maxX,maxY],pixels:queue.slice(0,tail),overlaps});
  }
  // Strong-alpha markers prevent faint painted edge halos from welding two bodies.
  // Grow all markers simultaneously back through original alpha >64, retaining full artwork.
  let head=0,tail=0;for(let at=0;at<total;at++)if(labels[at])queue[tail++]=at;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);for(const next of [x?at-1:-1,x<width-1?at+1:-1,y?at-width:-1,y<height-1?at+width:-1]){
    if(next>=0&&!labels[next]&&data[next*4+3]>64){labels[next]=labels[at];queue[tail++]=next}
  }}
  const expanded=components.map(c=>c?[]:null);
  for(let at=0;at<total;at++)if(labels[at])expanded[labels[at]].push(at);
  for(const c of components.slice(1)){
    c.pixels=Int32Array.from(expanded[c.id]);c.count=c.pixels.length;c.bounds=[width,height,0,0];c.overlaps.fill(0);let sumX=0,sumY=0;
    for(const at of c.pixels){const x=at%width,y=Math.floor(at/width);sumX+=x;sumY+=y;c.bounds[0]=Math.min(c.bounds[0],x);c.bounds[1]=Math.min(c.bounds[1],y);c.bounds[2]=Math.max(c.bounds[2],x);c.bounds[3]=Math.max(c.bounds[3],y);c.overlaps[Math.min(rows-1,Math.floor(y/height*rows))*columns+Math.min(columns-1,Math.floor(x/width*columns))]++}
    c.center=[sumX/c.count,sumY/c.count];let cell=Math.min(rows-1,Math.floor(c.center[1]/height*rows))*columns+Math.min(columns-1,Math.floor(c.center[0]/width*columns));for(let i=0;i<count;i++)if(c.overlaps[i]>c.overlaps[cell])cell=i;c.cell=cell;
  }
  if(adaptiveRows){
    // The five-phase originals leave extra empty canvas below their last row.
    // Rank actual body centers rather than assigning those figures to equal-height cells.
    const bodies=components.slice(1).sort((a,b)=>b.count-a.count).slice(0,count).sort((a,b)=>a.center[1]-b.center[1]);
    const centers=Array.from({length:rows},(_,row)=>median(bodies.slice(row*columns,(row+1)*columns).map(c=>c.center[1])));
    for(const component of components.slice(1)){
      let row=0;for(let r=1;r<rows;r++)if(Math.abs(component.center[1]-centers[r])<Math.abs(component.center[1]-centers[row]))row=r;
      component.cell=row*columns+Math.min(columns-1,Math.floor(component.center[0]/width*columns));
    }
  }
  const primary=Array(count).fill(null);for(const component of components.slice(1))if(!primary[component.cell]||component.count>primary[component.cell].count)primary[component.cell]=component;
  const typical=median(primary.filter(Boolean).map(c=>c.count));
  for(let cell=0;cell<count;cell++)if(!primary[cell]||primary[cell].count<Math.max(24,typical*.035))throw Error('Missing separate whole-body component for frame '+cell+'; possible connected neighboring poses require inspection/regeneration');
  const owners=new Int16Array(components.length).fill(-1),groups=primary.map(c=>[c]);
  for(let cell=0;cell<count;cell++)owners[primary[cell].id]=cell;
  for(const component of components.slice(1)){
    if(owners[component.id]>=0)continue;
    const [x1,y1,x2,y2]=component.bounds;let best=-1,score=Infinity;
    for(let cell=0;cell<count;cell++){
      const body=primary[cell],[bx1,by1,bx2,by2]=body.bounds;
      const dx=Math.max(bx1-x2,x1-bx2,0),dy=Math.max(by1-y2,y1-by2,0);
      const centerDistance=Math.hypot(component.center[0]-body.center[0],component.center[1]-body.center[1]);
      const candidate=Math.hypot(dx,dy)+centerDistance*.08;
      if(candidate<score){score=candidate;best=cell}
    }
    if(best>=0&&component.count>=Math.max(12,primary[best].count*.002)&&score<Math.max(width/columns,height/rows)*.45){owners[component.id]=best;groups[best].push(component)}
  }
  return groups.map((group,cell)=>{
    let minX=width,minY=height,maxX=0,maxY=0,pixels=0;
    for(const c of group){minX=Math.min(minX,c.bounds[0]);minY=Math.min(minY,c.bounds[1]);maxX=Math.max(maxX,c.bounds[2]);maxY=Math.max(maxY,c.bounds[3]);pixels+=c.count}
    let coreTop=height,coreBottom=0;for(const c of group)for(const at of c.pixels)if(data[at*4+3]>192){coreTop=Math.min(coreTop,Math.floor(at/width));coreBottom=Math.max(coreBottom,Math.floor(at/width))}
    const bodyHeight=coreBottom-coreTop+1,torso=new Uint32Array(width),rowCounts=new Uint32Array(height);
    for(const c of group)for(const at of c.pixels){if(data[at*4+3]<=192)continue;const x=at%width,y=Math.floor(at/width);rowCounts[y]++;if(y>=coreTop+bodyHeight*.23&&y<=coreTop+bodyHeight*.68)torso[x]++}
    const totalTorso=torso.reduce((a,b)=>a+b,0);let sum=0,anchorX=(minX+maxX+1)/2;
    for(let x=minX;totalTorso&&x<=maxX;x++){sum+=torso[x];if(sum>=totalTorso/2){anchorX=x+.5;if(sum===totalTorso/2){let next=x+1;while(next<=maxX&&!torso[next])next++;anchorX=(x+next+1)/2}break}}
    let foot=coreBottom;while(foot>coreTop&&rowCounts[foot]<Math.max(2,(maxX-minX+1)*.025))foot--;
    const left=Math.max(0,minX-2),top=Math.max(0,minY-2),right=Math.min(width,maxX+3),bottom=Math.min(height,maxY+3),exclusions=[];
    for(let y=top;y<bottom;y++){let start=-1;for(let x=left;x<=right;x++){
      const label=x<right?labels[y*width+x]:0,foreign=label&&owners[label]!==cell;
      if(foreign&&start<0)start=x;if(!foreign&&start>=0){exclusions.push([start,y,x-start]);start=-1}
    }}
    const silhouette=Buffer.alloc((maxX-minX+1)*(maxY-minY+1));for(const c of group)for(const at of c.pixels){const x=at%width,y=Math.floor(at/width);silhouette[(y-minY)*(maxX-minX+1)+x-minX]=1}
    const col=cell%columns,row=Math.floor(cell/columns),cx1=Math.floor(col*width/columns),cy1=Math.floor(row*height/rows),cx2=Math.floor((col+1)*width/columns),cy2=Math.floor((row+1)*height/rows);
    const crossesCellBoundary=minX<cx1||minY<cy1||maxX>=cx2||maxY>=cy2;
    const substantialCells=[...primary[cell].overlaps].map((n,i)=>n>primary[cell].count*.25?i:-1).filter(i=>i>=0);
    return {rect:[left,top,right-left,bottom-top],anchor:[anchorX,foot+1],exclusions,bodyHeight,pixels,components:group.length,removedComponents:components.length-1-groups.reduce((n,g)=>n+g.length,0),shape:createHash('sha256').update(String(maxX-minX+1)+':'+bodyHeight+':').update(silhouette).digest('hex'),touchesCellEdge:minX<=cx1||minY<=cy1||maxX>=cx2-1||maxY>=cy2-1,crossesCellBoundary,possibleConnectedMerge:substantialCells.length>1&&primary[cell].count>typical*1.9};
  });
}
// Visually calibrated estimates in each complete pose's measured source rectangle.
// Order within each column is Fighter, Rogue, Wizard, Cleric. These are attachment
// guides, not image-derived anatomical measurements; preserve that distinction.
const COMBAT_HAND_CALIBRATION={
  human_male:{windup:[[.28,.13],[.24,.08],[.32,.05],[.32,.05]],hit:[[.30,.55],[.28,.54],[.29,.64],[.31,.58]],defend:[[.87,.30],[.87,.31],[.76,.43],[.86,.40]]},
  human_female:{windup:[[.15,.20],[.28,.18],[.16,.23],[.25,.18]],hit:[[.32,.35],[.37,.36],[.33,.34],[.39,.35]],defend:[[.86,.30],[.88,.35],[.85,.30],[.84,.27]]},
  elf_male:{windup:[[.32,.10],[.32,.04],[.32,.05],[.32,.05]],hit:[[.29,.48],[.27,.48],[.35,.43],[.34,.47]],defend:[[.42,.35],[.42,.35],[.39,.35],[.40,.36]]},
  elf_female:{windup:[[.35,.06],[.34,.04],[.45,.04],[.37,.04]],hit:[[.33,.64],[.28,.66],[.28,.49],[.32,.63]],defend:[[.65,.35],[.65,.35],[.82,.20],[.77,.22]]},
  dwarf_male:{windup:[[.16,.25],[.15,.16],[.15,.22],[.15,.22]],hit:[[.31,.40],[.31,.40],[.33,.56],[.35,.44]],defend:[[.72,.40],[.72,.40],[.72,.40],[.72,.40]]},
  dwarf_female:{windup:[[.30,.23],[.18,.18],[.18,.22],[.30,.18]],hit:[[.43,.46],[.27,.53],[.18,.54],[.38,.36]],defend:[[.68,.32],[.68,.32],[.68,.32],[.68,.32]]},
  halfling_male:{windup:[[.29,.27],[.29,.14],[.27,.17],[.39,.10]],hit:[[.10,.65],[.10,.60],[.10,.70],[.10,.70]],defend:[[.68,.35],[.68,.35],[.68,.35],[.68,.35]]},
  halfling_female:{windup:[[.34,.11],[.28,.09],[.24,.14],[.28,.15]],hit:[[.32,.41],[.32,.41],[.36,.48],[.34,.45]],defend:[[.72,.27],[.72,.27],[.72,.27],[.72,.27]]}
};
const COMBAT_HAND_POSE_REFINEMENTS={
  dwarf_male:{1:[.93,.32],9:[.94,.35],17:[.91,.34],27:[.93,.21]},
  elf_female:{11:[.93,.23],19:[.93,.17]},
  halfling_female:{1:[.92,.33],3:[.94,.25],9:[.93,.31],25:[.93,.31]},
  halfling_male:{3:[.93,.29],28:[.10,.62]},
  human_female:{19:[.91,.15],25:[.92,.20],27:[.92,.16]},
  human_male:{8:[.28,.14],27:[.93,.18]}
};
export function annotateCombatHands(asset,identity){
  const guide=COMBAT_HAND_CALIBRATION[identity];if(!guide)return asset;
  for(let row=0;row<4;row++){
    const normalized=[guide.windup[row],[.96,.25],[.55,.32],[.95,.20],guide.hit[row],guide.defend[row]];
    const angles=[0,Math.PI/2,-.15,Math.PI/2,-.4,.35];
    for(let col=0;col<6;col++){
      const frame=asset.frames[row*8+col],[x,y,width,height]=frame.rect,[u,v]=COMBAT_HAND_POSE_REFINEMENTS[identity]?.[row*8+col]||normalized[col];
      frame.hand=[Math.round((x+width*u)*2)/2,Math.round((y+height*v)*2)/2];frame.weaponAngle=angles[col];
    }
    // Defeat has no held gear; ranged release already contains its painted bow.
    for(const col of [6,7]){delete asset.frames[row*8+col].hand;delete asset.frames[row*8+col].weaponAngle}
  }
  asset.handCalibration='Visually estimated per identity, class and pose; source-pixel coordinates';return asset;
}
export function measureAtlas(image,kind,{rowCount,identity}={}){
  const [columns,defaultRows]=kind==='walk'?[4,6]:kind==='combat'?[8,4]:kind==='seated'?[4,3]:[2,6];
  const rows=rowCount??defaultRows;if(!Number.isInteger(rows)||rows<1)throw Error('Invalid atlas row count');
  const measured=measureWholeAtlas(image,columns,rows,{adaptiveRows:kind==='walk'&&rows===5});
  const frames=measured.map(({rect,anchor,exclusions})=>({rect,anchor,exclusions})),asset={frames,referenceHeight:median(measured.map(f=>f.bodyHeight)),width:image.width,height:image.height,layout:{columns,rows,frameCount:columns*rows}};
  if(kind==='walk')asset.animations=Object.fromEntries(['down','left','right','up'].map((direction,col)=>[direction,{frames:Array.from({length:rows},(_,row)=>row*4+col),duration:660,loop:true}]));
  if(kind==='combat'){
    asset.classes={};for(let row=0;row<4;row++){
      const height=median([0,2,4,5].map(col=>measured[row*8+col].bodyHeight));
      for(let col=0;col<8;col++)frames[row*8+col].referenceHeight=height;
      asset.classes[ROLES[row]]=Object.fromEntries(ACTIONS.map((name,col)=>[name,row*8+col]));
    }
  }
  if(kind==='seated'){
    asset.classes={};for(let col=0;col<4;col++){
      for(let row=0;row<3;row++)frames[row*4+col].referenceHeight=measured[col].bodyHeight;
      asset.classes[ROLES[col]]=Object.fromEntries(SEATED.map((name,row)=>[name,row*4+col]));
    }
  }
  if(kind==='ambient'){
    asset.poses={};for(let col=0;col<2;col++){
      const upright=median([0,1,2].map(row=>measured[row*2+col].bodyHeight)),seated=measured[6+col].bodyHeight;
      for(let row=0;row<6;row++)frames[row*2+col].referenceHeight=row<3?upright:seated;
      asset.poses[['Rogue','Cleric'][col]]=Object.fromEntries(AMBIENT.map((name,row)=>[name,row*2+col]));
    }
  }
  if(kind==='combat')annotateCombatHands(asset,identity);
  return {...asset,measurement:measured};
}
export async function buildManifest({directory,gameRoot,ambient,reportOnly=false}){
  const files=(await readdir(directory)).filter(name=>name.endsWith('.png')).sort(),manifest={version:1,walk:{},combat:{},seated:{}},report={version:1,complete:false,counts:{walk:0,combat:0,seated:0,ambient:0},errors:[],warnings:[],sheets:[]};let ambientManifest=null;
  const candidates=files.map(name=>resolve(directory,name));if(ambient&&!candidates.includes(resolve(ambient)))candidates.push(resolve(ambient));
  for(const path of candidates){
    const name=basename(path),match=name.match(/^(human|elf|dwarf|halfling)_(?:(fighter|rogue|wizard|cleric)_)?(male|female)_(motion|combat|seated)\.png$/);
    const kind=match?(match[4]==='motion'?'walk':match[4]):/ambient/i.test(name)?'ambient':null;
    if(!kind)continue;
    try{
      if(kind==='walk'&&!match[2])throw Error('Walk filename requires class');
      const image=decodePng(await readFile(path)),asset=measureAtlas(image,kind,{rowCount:kind==='walk'?WALK_ROW_OVERRIDES[name]:undefined,identity:match?match[1]+'_'+match[3]:undefined}),measurements=asset.measurement;delete asset.measurement;
      asset.src=relative(gameRoot,path).replaceAll('\\','/');
      if(kind==='walk'){
        for(let col=0;col<4;col++){const shapes=measurements.filter((_,i)=>i%4===col).map(m=>m.shape);if(new Set(shapes).size!==asset.layout.rows)throw Error('Identical alpha silhouettes among direction '+['down','left','right','up'][col]+' walk poses')}
      }
      const key=match?match[1]+'_'+(kind==='walk'?match[2]+'_':'')+match[3]:name;
      if(kind==='ambient'){if(ambientManifest)throw Error('Multiple ambient sheets; pass --ambient and keep one in directory');ambientManifest={version:1,...asset}}else manifest[kind][key]=asset;
      report.counts[kind]++;report.sheets.push({name,key,kind,width:image.width,height:image.height,frames:measurements});
      for(let index=0;index<measurements.length;index++)if(measurements[index].possibleConnectedMerge)report.warnings.push(name+' frame '+index+' has possible connected neighboring bodies; inspect/regenerate');
    }catch(error){report.errors.push(name+': '+error.message)}
  }
  for(const race of RACES)for(const sex of SEXES){
    for(const role of ROLES){const key=race+'_'+role.toLowerCase()+'_'+sex;if(!manifest.walk[key])report.errors.push('Missing validated walk '+key)}
    if(!manifest.combat[race+'_'+sex])report.errors.push('Missing validated combat '+race+'_'+sex);
    if(race!=='human'&&!manifest.seated[race+'_'+sex])report.errors.push('Missing validated seated '+race+'_'+sex);
  }
  report.complete=report.errors.length===0;
  await mkdir(directory,{recursive:true});await writeFile(resolve(directory,'measurement-report.json'),JSON.stringify(report,null,2)+'\n');
  if(!reportOnly){
    if(!report.complete)throw Error('Incomplete or invalid atlases: '+report.errors.length+' errors; see '+resolve(directory,'measurement-report.json'));
    await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    if(ambientManifest)await writeFile(resolve(ambient?dirname(ambient):dirname(directory),'ambient_manifest.json'),JSON.stringify(ambientManifest,null,2)+'\n');
  }
  return report;
}
async function main(){
  const args=process.argv.slice(2),gameRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  if(args.includes('--help')){console.log('node tools/measure-motion-atlases.mjs [--dir assets/living_world/motion] [--ambient PATH] [--report-only]\nMeasures PNG alpha without rewriting images. Final manifest requires 32 unique real-pose walks (28 six-frame, 4 explicit five-frame), 8 combats and 6 nonhuman seated sheets.');return}
  const option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined};
  const directory=resolve(gameRoot,option('--dir')||'assets/living_world/motion'),ambient=option('--ambient')?resolve(gameRoot,option('--ambient')):undefined;
  const report=await buildManifest({directory,gameRoot,ambient,reportOnly:args.includes('--report-only')});
  console.log(JSON.stringify({complete:report.complete,counts:report.counts,errors:report.errors.length,warnings:report.warnings.length,report:resolve(directory,'measurement-report.json')},null,2));
  if(!report.complete)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.message);process.exitCode=1});
