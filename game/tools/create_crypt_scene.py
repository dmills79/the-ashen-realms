"""Original hand-programmed dark-fantasy crypt battle scene. Pillow only."""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, random, math
from pathlib import Path
random.seed(31)
W,H=1440,864
Y,X=np.mgrid[0:H,0:W]
# Deep slate-blue atmosphere with torch-lit pockets, central moonlit falloff.
base=np.zeros((H,W,3),dtype=np.float32)
y=Y/H
for i,(a,b) in enumerate([(13,29),(20,39),(31,52)]):base[:,:,i]=a+(b-a)*(1-y)**1.3
for cx,cy,rad,power,color in [(720,345,470,.55,(59,88,116)),(220,365,215,.9,(161,89,42)),(1240,320,235,.8,(170,94,40)),(720,535,330,.45,(41,84,114))]:
 d=np.sqrt((X-cx)**2+(Y-cy)**2);v=np.clip(1-d/rad,0,1)**2*power
 for j in range(3):base[:,:,j]+=v*color[j]
noise=np.random.default_rng(29).normal(0,2.7,(H,W,1));base=np.uint8(np.clip(base+noise,0,255))
im=Image.fromarray(base,'RGB');d=ImageDraw.Draw(im,'RGBA')
# Distant pointed arches, decorated stonework, receding vanishing-point geometry.
for off in [-530,-260,0,260,530]:
 cx=720+off
 d.polygon([(cx-175,480),(cx-175,180),(cx,10),(cx+175,180),(cx+175,480)],fill=(12,18,32,220))
 d.polygon([(cx-145,480),(cx-145,189),(cx,49),(cx+145,189),(cx+145,480)],outline=(116,130,137,160),width=7)
 d.polygon([(cx-125,480),(cx-125,216),(cx,78),(cx+125,216),(cx+125,480)],outline=(83,101,115,200),width=3)
 # Arc tracery window
 if abs(off)<300:
  d.ellipse((cx-35,136,cx+35,206),outline=(103,142,165,150),width=4)
  d.line([(cx,130),(cx,237)],fill=(121,158,175,120),width=5)
  d.line([(cx-31,177),(cx+31,177)],fill=(121,158,175,120),width=4)
# main monumental arch
for width,rgba in [(35,(17,24,34,240)),(25,(52,65,78,230)),(10,(114,125,129,250))]:
 pts=[(330,580),(330,262),(405,173),(505,99),(650,45),(720,32),(790,45),(935,99),(1035,173),(1110,262),(1110,580)]
 d.line(pts,fill=rgba,width=width,joint='curve')
# architecture: columns, sconces
for cx in [100,385,1055,1340]:
 d.ellipse((cx-60,547,cx+60,569),fill=(5,9,17,170))
 d.rectangle((cx-33,131,cx+33,566),fill=(39,53,65,255),outline=(91,102,111,255),width=5)
 for a in [-24,-15,17,27]:d.line((cx+a,145,cx+a,545),fill=(73,85,92,130),width=2)
 for yy in [125,145,525,547]:
  d.rectangle((cx-48,yy,cx+48,yy+17),fill=(67,78,84,255),outline=(130,129,111,155),width=3)
 for yy in [182,263,355,450]:d.line((cx-30,yy,cx+30,yy),fill=(17,24,37,80),width=2)
 # Chains and hanging hooks
 for dx in [-50,50]:
  d.line((cx+dx,0,cx+dx+5,130),fill=(95,100,94,110),width=3)
  for i in range(12):d.ellipse((cx+dx-3,15+i*9,cx+dx+5,26+i*9),outline=(134,127,103,120),width=2)
# Perspective floor vanishing to raised altar
floor=[(0,621),(1440,621),(1440,864),(0,864)];d.polygon(floor,fill=(26,33,42,255))
for i in range(1,19):
 f=i/19;yy=int(621+(f**1.55)*360);d.line((0,yy,1440,yy),fill=(110,116,116,int(30+f*75)),width=max(1,int(1+f*2)))
for x in range(-900,2300,115):
 d.line((720,582,x,864),fill=(105,106,105,75),width=2)
for j in range(140):
 x=random.randint(0,1439);y=random.randint(630,863)
 r=random.randint(2,8)
 d.line((x,y,x+r,y-1),fill=(150,147,135,random.randrange(22,80)),width=1)
# sarcophagus platform
for poly,col in [([(545,606),(900,606),(987,667),(477,667)],(21,25,33,255)), ([(565,586),(881,586),(914,624),(529,624)],(72,77,81,255)), ([(583,576),(862,576),(873,596),(572,596)],(103,108,111,255))]:d.polygon(poly,fill=col)
d.line((588,586,861,586),fill=(210,182,124,170),width=4)
# Large arcane glyph in background; multiple concentric ancient symbols.
for r,rgba,wd in [(123,(83,168,189,65),9),(110,(90,183,211,160),4),(92,(140,202,214,90),2),(49,(140,223,226,180),5)]:
 d.ellipse((720-r,372-r,720+r,372+r),outline=rgba,width=wd)
for i in range(16):
 t=2*math.pi*i/16
 xa,ya=720+100*math.cos(t),372+100*math.sin(t)
 xb,yb=720+115*math.cos(t+.06),372+115*math.sin(t+.06)
 d.line((xa,ya,xb,yb),fill=(160,231,226,160),width=3)
 if i%2==0:
  d.polygon([(720+86*math.cos(t),372+86*math.sin(t)),(720+77*math.cos(t+.18),372+77*math.sin(t+.18)),(720+77*math.cos(t-.18),372+77*math.sin(t-.18))],outline=(100,185,205,110))
# sconces, painted fire over bloom; soft glows layered using Gaussian
light=Image.new('RGBA',(W,H));ld=ImageDraw.Draw(light)
for cx,cy in [(225,365),(1215,360)]:
 for r in range(150,10,-10):
  a=round(3.0*(150-r)/150+1)
  ld.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(255,145,65,a))
light=light.filter(ImageFilter.GaussianBlur(24))
im=Image.alpha_composite(im.convert('RGBA'),light)
d=ImageDraw.Draw(im,'RGBA')
for cx,cy in [(225,365),(1215,360)]:
 d.line((cx,cy,cx,cy+80),fill=(58,44,35,255),width=13)
 d.line((cx,cy+14,cx,cy+40),fill=(173,136,91,255),width=3)
 for i in range(3):
  xx=cx+random.randrange(-12,13)
  d.polygon([(cx-20,cy+9),(xx,cy-40-random.randrange(7,24)),(cx+18,cy+9)],fill=(215+min(i*12,40),90+i*38,31+i*20,210))
 d.ellipse((cx-12,cy-8,cx+13,cy+9),fill=(255,219,118,200))
# Low fog anchored to the ground
fog=Image.new('RGBA',(W,H));fd=ImageDraw.Draw(fog,'RGBA')
for i in range(80):
 xx=random.randrange(-100,W+100);yy=random.randrange(560,H+100)
 rr=random.randrange(45,200)
 fd.ellipse((xx-rr,yy-rr//4,xx+rr,yy+rr//4),fill=(99,128,145,random.randrange(3,10)))
fog=fog.filter(ImageFilter.GaussianBlur(37));im=Image.alpha_composite(im,fog)
# Subtle camera grain/dark vignette
img=np.asarray(im.convert('RGB'),dtype=np.float32)
rad=np.clip(np.sqrt(((X-720)/910)**2+((Y-380)/710)**2),0,1.2)
img=img*(1-.34*(rad**2)[:,:,None]);Image.fromarray(np.uint8(np.clip(img,0,255))).save(Path(__file__).parents[1]/'assets/battle_crypt.jpg',quality=90,optimize=True)
print('Wrote original crypt environment')
