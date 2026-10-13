from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path
import math,random
root=Path('/mnt/data/The_Ashen_Realms_v1.0_Sprites/assets');W,H=1440,864
rng=random.Random(81)
def grad(top,bottom):
 im=Image.new('RGB',(W,H));px=im.load()
 for y in range(H):
  t=y/(H-1); col=tuple(int(a+(b-a)*t) for a,b in zip(top,bottom))
  for x in range(W):px[x,y]=col
 return im
# wild dawn forest glade
im=grad((36,65,82),(129,132,105));d=ImageDraw.Draw(im,'RGBA')
# mist layers and mountains
for layer,base,col in [(0,280,(56,94,91,255)),(1,345,(41,79,78,255)),(2,420,(39,71,62,255))]:
 pts=[(0,H)];x=0
 while x<W:
  y=base+65*math.sin(x*.009+layer)+29*math.sin(x*.028+layer*2)
  pts.append((x,y));x+=13
 pts.extend([(W,H)]);d.polygon(pts,fill=col)
# distant trunks
for i in range(45):
 x=rng.randint(-100,W+100); th=rng.randint(6,25);top=rng.randint(135,295)
 d.polygon([(x-th,660),(x-th//2,top),(x+th//2,top),(x+th,660)],fill=(28,57,50,235))
 # ragged canopy
 for q in range(5):
  cx=x+rng.randint(-65,65);cy=top+rng.randint(-18,90);r=rng.randint(35,90)
  d.ellipse((cx-r,cy-r*.55,cx+r,cy+r*.6),fill=rng.choice([(31,75,56,205),(44,84,61,198),(47,94,67,203)]))
# ground layered earth clearing
d.polygon([(0,550),(280,525),(570,560),(840,536),(1110,550),(W,525),(W,H),(0,H)],fill=(52,81,58,255))
# stone old road perspective
road=[(610,530),(840,530),(1300,H),(220,H)]
d.polygon(road,fill=(129,123,102,255))
d.line(road+[road[0]],fill=(63,76,61,210),width=14)
for j in range(15):
 t=(j/15)**1.4;y=int(536+t*330);left=int(610+(220-610)*t);right=int(840+(1300-840)*t)
 d.line([(left,y),(right,y)],fill=(74,73,70,125),width=max(1,int(2+t*4)))
 for xx in range(left+20,right-10,max(35,int(60*(t+.3)))):d.line([(xx,y),(xx+12*(t+.3),y+23*(t+.3))],fill=(60,72,66,110),width=max(1,int(1+t*3)))
# nearer big bushes and trees around sides
for i in range(115):
 x=rng.randint(0,W);y=rng.randint(490,870)
 if 380<x<1110 and y>570:continue
 rr=rng.randint(16,48) if y<700 else rng.randint(18,58)
 color=rng.choice([(42,97,62,255),(61,105,64,255),(68,124,71,250),(35,75,48,250)])
 d.ellipse((x-rr,y-rr*.5,x+rr,y+rr*.8),fill=color)
 # leaf highlights
 for z in range(3):d.ellipse((x-rr*.5+z*rr*.35,y-rr*.4,x-rr*.3+z*rr*.35,y-rr*.18),fill=(140,154,91,65))
# ruined low stone parapet
for x,y in [(130,515),(1140,520)]:
 d.polygon([(x-100,y+90),(x+130,y+80),(x+105,y-50),(x-84,y-45)],fill=(94,103,102,255));d.line([(x-100,y+90),(x-84,y-45),(x+105,y-50),(x+130,y+80)],fill=(164,164,148,185),width=7)
 for row in range(4):
  yy=y-20+row*24
  d.line((x-85,yy,x+115,yy+6),fill=(50,64,63,170),width=5)
  for col in range(4):
   xx=x-79+col*42+(row%2)*18
   d.line((xx,yy,xx+2,yy+22),fill=(46,58,57,150),width=3)
# flowers and tiny grass
for i in range(560):
 x=rng.randint(0,W-1);y=rng.randint(585,H-1)
 if 360<x<1110:continue
 c=rng.choice([(132,154,96,170),(166,169,96,180),(203,160,96,160)])
 d.line((x,y,x+rng.randint(-5,5),y-rng.randint(5,17)),fill=c,width=2)
for i in range(60):
 x=rng.randrange(30,W-30);y=rng.randrange(610,H-25)
 if 360<x<1110:continue
 d.ellipse((x,y,x+5,y+5),fill=rng.choice([(225,191,143,190),(186,132,168,180)]))
# subtle atmosphere mist
fog=Image.new('RGBA',(W,H));fd=ImageDraw.Draw(fog)
for k in range(8):
 y=400+k*29;fd.ellipse((-200,y,1600,y+130),fill=(171,193,183,11))
fog=fog.filter(ImageFilter.GaussianBlur(37));im=Image.alpha_composite(im.convert('RGBA'),fog)
# dark foreground band for contrast and UI
lay=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(lay)
for y in range(500,H):
 aa=int(20+(y-500)/(H-500)*70);ld.line((0,y,W,y),fill=(10,17,28,aa))
im=Image.alpha_composite(im,lay).convert('RGB')
im.save(root/'battle_forest.jpg',quality=91,subsampling=0)
print('wrote forest')
# town background assembled from original Havenmere building facades
im=grad((111,157,190),(200,177,128));d=ImageDraw.Draw(im,'RGBA')
d.polygon([(0,290),(260,190),(470,293),(620,210),(900,307),(1090,175),(W,287),(W,570),(0,570)],fill=(91,123,101,190))
d.polygon([(0,330),(400,280),(660,352),(830,281),(W,344),(W,H),(0,H)],fill=(77,117,76,255))
# settled cobblestone square
d.polygon([(0,580),(W,555),(W,H),(0,H)],fill=(148,132,108,255))
for row in range(11):
 y=590+row*26
 for x in range(-80+(row%2)*33,W,70):
  d.line([(x,y),(x+66,y-2)],fill=(93,90,79,140),width=3)
  d.line([(x,y),(x-4,y+24)],fill=(101,95,81,135),width=3)
for name,pos,size in [('cottage',(10,175),(340,350)),('smith',(280,142),(330,380)),('hall',(570,75),(480,430)),('inn',(985,145),(430,380))]:
 fp=root/'havenmere'/f'{name}.png'
 if fp.exists():
  asset=Image.open(fp).convert('RGBA');asset.thumbnail(size,Image.Resampling.LANCZOS);im.paste(asset,pos,asset)
# foreground town props
d=ImageDraw.Draw(im,'RGBA')
for x in [110,500,1090,1320]:
 d.line([(x,630),(x,483)],fill=(68,57,52,255),width=12)
 d.rounded_rectangle((x-17,459,x+17,489),radius=5,fill=(201,150,73,225),outline=(247,210,127,255),width=4)
 d.ellipse((x-48,455,x+48,556),fill=(244,176,70,38))
# stalls
d.polygon([(36,565),(210,559),(210,588),(36,594)],fill=(125,79,65,255))
for j in range(6):d.polygon([(40+j*27,547),(65+j*27,545),(68+j*27,564),(40+j*27,566)],fill=(175,93,70,245) if j%2 else (231,205,154,245))
# fountain
for rect in [(667,550,819,642),(681,558,804,635)]:d.ellipse(rect,fill=(193,178,154,255))
d.ellipse((696,566,790,626),fill=(80,135,148,255))
d.rectangle((735,522,750,594),fill=(214,202,175,255));d.ellipse((722,520,763,549),fill=(226,215,186,255))
# bottom atmosphere gradient
im=im.convert('RGBA');layer=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(layer)
for y in range(565,H):
 a=int((y-565)/(H-565)*85);ld.line((0,y,W,y),fill=(20,24,29,a))
im=Image.alpha_composite(im,layer).convert('RGB')
im.save(root/'battle_town.jpg',quality=92,subsampling=0)
print('wrote town')
