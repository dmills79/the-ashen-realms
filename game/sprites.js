/* Manifest-driven illustrated characters. Original artwork remains the engine fallback. */
'use strict';
(() => {
  const manifest=window.AshenCharacterManifest||{characters:{}},images=new Map(),reactions=new Map(),frameImages=new Map();
  const clock=()=>performance.now();
  function prepare(ids){for(const id of ids){
    const asset=manifest.characters[id];if(!asset||images.has(id))continue;
    const image=new Image();image.decoding='async';image.src=window.ASHEN_ASSET_DATA?.[asset.src]||'assets/'+asset.src;images.set(id,image);
  }}
  prepare(Object.keys(manifest.characters).filter(id=>manifest.characters[id].kind==='hero'));
  function ready(id){const image=images.get(id);return !!(image?.complete&&image.naturalWidth>0)}
  function animationFrame(asset,state,time=0){
    const animation=asset.animations[state]||asset.animations.idle;
    const progress=animation.loop?((Math.max(0,time)%animation.duration)/animation.duration):Math.min(.999,Math.max(0,time)/animation.duration);
    return animation.frames[Math.floor(progress*animation.frames.length)];
  }
  function isolatedFrame(id,index,image){
    const frame=manifest.characters[id].frames[index];
    if(!frame.exclusions.length||typeof document==='undefined')return null;
    const key=id+':'+index;if(frameImages.has(key))return frameImages.get(key);
    const [x,y,width,height]=frame.rect,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.drawImage(image,x,y,width,height,0,0,width,height);
    context.globalCompositeOperation='destination-out';
    // Remove only pixels belonging to neighboring figures; retain this pose's alpha.
    for(const [sx,sy,length] of frame.exclusions)context.fillRect(sx-x-1,sy-y-1,length+2,3);
    frameImages.set(key,canvas);return canvas;
  }
  function draw(ctx,id,x,y,{state='idle',time=clock(),height=null,facing='right',alpha=1,shadow=true}={}){
    prepare([id]);
    if(!ready(id))return false;
    const asset=manifest.characters[id],index=animationFrame(asset,state,time),frame=asset.frames[index],image=images.get(id);
    const [sx,sy,width,sourceHeight]=frame.rect,visualHeight=height??asset.heightInBattle,scale=visualHeight/asset.referenceHeight;
    ctx.save();ctx.globalAlpha*=alpha;
    if(shadow){ctx.fillStyle='#02070b70';ctx.beginPath();ctx.ellipse(x,y+1,Math.max(3,asset.frames[0].rect[2]*scale*.28),Math.max(1,visualHeight*.035),0,0,Math.PI*2);ctx.fill()}
    ctx.translate(x,y);if(facing!==asset.facing)ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const isolated=isolatedFrame(id,index,image);
    ctx.drawImage(isolated||image,isolated?0:sx,isolated?0:sy,width,sourceHeight,(sx-frame.anchor[0])*scale,(sy-frame.anchor[1])*scale,width*scale,sourceHeight*scale);
    ctx.restore();return true;
  }
  function react(id,state){reactions.set(id,{state,startedAt:clock()})}
  function reaction(id){const value=reactions.get(id);if(!value)return null;
    if(value.state!=='death'&&clock()-value.startedAt>380){reactions.delete(id);return null}return value;
  }
  window.AshenSprites={manifest,ready,prepare,draw,animationFrame,react,reaction,clear:()=>reactions.clear(),
    debug:()=>({ready:Object.keys(manifest.characters).filter(ready),reactions:Array.from(reactions.entries()),frameCount:Object.values(manifest.characters).reduce((sum,a)=>sum+a.frames.length,0)})};
})();
