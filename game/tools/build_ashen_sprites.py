from pathlib import Path
from PIL import Image, ImageDraw
import io, json, math
import cairosvg

ROOT=Path('/mnt/data/The_Ashen_Realms_v1.0_Sprites')
ASSETS=ROOT/'assets'/'sprites'
ASSETS.mkdir(parents=True,exist_ok=True)
W,H=240,280
POSES=['idle_a','idle_b','attack','cast','hurt']

COLORS={
 'fighter':{'skin':'#d8a681','hair':'#52382c','main':'#45688c','secondary':'#84939e','trim':'#dfb970','cape':'#313e5a','weapon':'sword','face':'human'},
 'rogue':{'skin':'#b99077','hair':'#1f2728','main':'#244d46','secondary':'#3d514a','trim':'#879d7e','cape':'#192b2c','weapon':'dagger','face':'human','hood':True},
 'cleric':{'skin':'#e9bba0','hair':'#714f35','main':'#e4ddd0','secondary':'#b8b3a2','trim':'#dfbd76','cape':'#d5cab4','weapon':'staff','face':'human','female':True},
 'wizard':{'skin':'#d4b098','hair':'#e0d8d0','main':'#514f8d','secondary':'#333762','trim':'#b0a8e8','cape':'#292954','weapon':'staff','face':'human','hood':True},
 'goblin':{'skin':'#95b567','hair':'#4d5733','main':'#795843','secondary':'#506b42','trim':'#baa17c','cape':'#453d32','weapon':'dagger','face':'goblin'},
 'shaman':{'skin':'#a5b974','hair':'#b98b53','main':'#8a4a35','secondary':'#663b35','trim':'#cfac61','cape':'#683d35','weapon':'staff','face':'goblin','hood':True},
 'orc':{'skin':'#779866','hair':'#292d26','main':'#554e42','secondary':'#717d79','trim':'#c3a17c','cape':'#4c3a31','weapon':'axe','face':'orc'},
 'warboss':{'skin':'#718d54','hair':'#282c29','main':'#533d38','secondary':'#72685f','trim':'#dfaa60','cape':'#3e292a','weapon':'axe','face':'orc','horns':True},
 'bandit':{'skin':'#c89b7a','hair':'#272326','main':'#65544e','secondary':'#535764','trim':'#ae9478','cape':'#302d31','weapon':'sword','face':'human','hood':True},
 'sentinel':{'skin':'#989c91','hair':'#7f7770','main':'#666f77','secondary':'#838b92','trim':'#d18b6a','cape':'#34394b','weapon':'axe','face':'human','helmet':True},
 'boss':{'skin':'#d2a493','hair':'#302d35','main':'#52434d','secondary':'#77747c','trim':'#d19a6b','cape':'#342d42','weapon':'axe','face':'human','helmet':True,'horns':True},
 'bone':{'skin':'#d9d0b3','hair':'#a99c85','main':'#4c555b','secondary':'#696f70','trim':'#c2b99b','cape':'#353a3d','weapon':'sword','face':'skeleton'},
 'wolf':{'skin':'#878b95','hair':'#515765','main':'#767c86','secondary':'#5a5e6b','trim':'#bec8c9','cape':'#525964','weapon':None,'face':'wolf'},
 'slime':{'skin':'#70d0b5','hair':'#3f9b88','main':'#5cc6ae','secondary':'#b3f2d8','trim':'#c7ffee','cape':'#6dcdb2','weapon':None,'face':'slime'},
 'wisp':{'skin':'#84c7f1','hair':'#c2f3ff','main':'#4f7cbb','secondary':'#90d2e8','trim':'#e4ffff','cape':'#5168a2','weapon':None,'face':'wisp'},
 'bat':{'skin':'#a98baf','hair':'#574f76','main':'#6f617f','secondary':'#8a719a','trim':'#dccadd','cape':'#514566','weapon':None,'face':'bat'},
}

def common_defs(c):
 main=c['main']; sec=c['secondary']; trim=c['trim']; cape=c['cape']; skin=c['skin']
 return f'''<defs>
<linearGradient id="armor" x1="0" y1="0" x2="1" y2="0"><stop stop-color="{main}"/><stop offset=".30" stop-color="{sec}"/><stop offset=".61" stop-color="{main}"/><stop offset="1" stop-color="#202534"/></linearGradient>
<linearGradient id="cape" x1="0" y1="0" x2="1" y2=".6"><stop stop-color="{cape}"/><stop offset=".5" stop-color="{main}"/><stop offset="1" stop-color="#151c2a"/></linearGradient>
<linearGradient id="metal" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#f7efdf"/><stop offset=".18" stop-color="#9da9b3"/><stop offset=".55" stop-color="#667987"/><stop offset=".74" stop-color="#dfe0d7"/><stop offset="1" stop-color="#4e5a66"/></linearGradient>
<linearGradient id="skin" x1="0" y1="0" x2=".85" y2=".5"><stop stop-color="#f4d8af"/><stop offset=".38" stop-color="{skin}"/><stop offset="1" stop-color="#735445"/></linearGradient>
<linearGradient id="trim" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1c3"/><stop offset=".55" stop-color="{trim}"/><stop offset="1" stop-color="#7b5843"/></linearGradient>
<radialGradient id="spell"><stop stop-color="#ffffff"/><stop offset=".18" stop-color="#c9edff"/><stop offset=".5" stop-color="#6eaff3" stop-opacity=".75"/><stop offset="1" stop-color="#4b93e5" stop-opacity="0"/></radialGradient>
</defs>'''

def humanoid(c,pose):
 spell=pose=='cast'; attack=pose=='attack'; hurt=pose=='hurt'; bob=-3 if pose=='idle_b' else 0
 face=c['face']; is_orc=face=='orc'; gob=face=='goblin'; skeletal=face=='skeleton'
 # local body facing right, armor and greebles
 body_shift=7 if attack else -4 if hurt else 0
 head_y=-4 if hurt else -2 if attack else 0
 torso='''
<!-- rear cape: not a pasted image, complete illustrated sprite geometry -->
<path d="M93 106 Q73 130 65 205 Q69 236 100 245 L112 195 Q140 233 151 247 Q171 211 158 144 L139 102Z" fill="url(#cape)" stroke="#181d28" stroke-width="5"/>
<path d="M81 143 Q69 185 77 229" fill="none" stroke="#e8d5ab" stroke-opacity=".38" stroke-width="3"/>
<!-- boots and leg armor -->
<path d="M97 190 L117 190 L116 238 L88 244 L87 229 Z" fill="url(#armor)" stroke="#171d28" stroke-width="5"/>
<path d="M125 189 L146 189 L157 244 L130 245 L120 225 Z" fill="url(#armor)" stroke="#171d28" stroke-width="5"/>
<path d="M90 221 L118 220 M126 224 L152 224" stroke="url(#trim)" stroke-width="4"/>
<path d="M90 244 Q96 248 116 244 M131 245 Q143 250 159 244" stroke="#131822" stroke-width="7" stroke-linecap="round"/>
<!-- armored torso -->
<path d="M100 109 Q120 95 146 109 L159 188 Q130 207 96 187 Z" fill="url(#armor)" stroke="#17202b" stroke-width="6"/>
<path d="M105 124 Q129 116 148 130 L145 171 Q125 185 105 168Z" fill="none" stroke="url(#trim)" stroke-width="4"/>
<path d="M125 124 L126 180" stroke="#f0d49a" stroke-opacity=".45" stroke-width="3"/>
<path d="M97 182 L155 182 L156 194 L97 194Z" fill="#362c2b" stroke="#d6a970" stroke-width="3"/>
<rect x="119" y="181" width="15" height="14" rx="3" fill="url(#trim)" stroke="#352d2d" stroke-width="3"/>
<!-- left arm and hand -->
<path d="M100 116 Q82 119 78 149 L82 187 L96 189 L105 150Z" fill="url(#armor)" stroke="#17202b" stroke-width="5"/>
<path d="M76 174 L99 178 L97 192 L78 191Z" fill="url(#metal)" stroke="#29303d" stroke-width="3"/>
<ellipse cx="88" cy="199" rx="9" ry="10" fill="url(#skin)" stroke="#2a2325" stroke-width="3"/>
'''
 torso += '''<path d="M104 107 Q123 121 146 108" stroke="url(#trim)" fill="none" stroke-width="6"/>'''
 # right arm position + arm pose
 if attack:
  arm='<path d="M149 117 L177 112 L200 75 L209 83 L188 140 L168 162 L151 142Z" fill="url(#armor)" stroke="#1a202b" stroke-width="6"/><ellipse cx="204" cy="78" rx="11" ry="9" fill="url(#skin)" stroke="#26303b" stroke-width="3"/>'
 elif spell:
  arm='<path d="M148 117 L168 108 L199 108 L205 126 L173 135 L160 155Z" fill="url(#armor)" stroke="#1a202b" stroke-width="6"/><ellipse cx="207" cy="114" rx="11" ry="10" fill="url(#skin)" stroke="#26303b" stroke-width="3"/>'
 else:
  arm='<path d="M145 116 L162 127 L169 184 L149 187 L142 150Z" fill="url(#armor)" stroke="#1a202b" stroke-width="6"/><path d="M151 173 L173 171 L176 188 L153 193Z" fill="url(#metal)" stroke="#27303c" stroke-width="3"/><ellipse cx="164" cy="198" rx="9" ry="10" fill="url(#skin)" stroke="#2a2325" stroke-width="3"/>'
 # human head skin, nose, brows, hair, hood / helmet
 hx=126; hy=78+head_y
 ears=''
 if gob or is_orc:
  ears=f'<path d="M102 {hy-3} L73 {hy-25} L89 {hy+6}Z M147 {hy-4} L179 {hy-26} L162 {hy+7}Z" fill="{c["skin"]}" stroke="#30402f" stroke-width="4"/>'
 head=f'''{ears}<path d="M106 {hy-26} Q126 {hy-45} 148 {hy-23} Q159 {hy+3} 145 {hy+22} Q132 {hy+35} 115 {hy+23} Q98 {hy+13} 106 {hy-26}Z" fill="url(#skin)" stroke="#20252b" stroke-width="4"/>
<path d="M108 {hy-3} Q113 {hy-9} 121 {hy-5} M133 {hy-7} Q143 {hy-11} 150 {hy-5}" stroke="#372b27" stroke-width="4" fill="none"/>
<ellipse cx="117" cy="{hy}" rx="3" ry="2.8" fill="#161d23"/><ellipse cx="140" cy="{hy-1}" rx="3" ry="2.8" fill="#161d23"/>
<path d="M129 {hy} L126 {hy+12} L133 {hy+13}" fill="none" stroke="#875848" stroke-width="2"/>
<path d="M119 {hy+18} Q130 {hy+23} 141 {hy+16}" stroke="#6f4842" fill="none" stroke-width="2.5"/>'''
 if is_orc:
  head+=f'<path d="M114 {hy+17} L109 {hy+5} L121 {hy+15}Z M143 {hy+16} L150 {hy+4} L147 {hy+19}Z" fill="#f4eacb" stroke="#725f50" stroke-width="2"/>'
 if skeletal:
  head+=f'<path d="M111 {hy-3} L123 {hy+2} L119 {hy+10} L109 {hy+7}Z M134 {hy-3} L147 {hy-4} L144 {hy+8} L134 {hy+8}Z" fill="#171d28"/>'
 if c.get('female'):
  head+=f'<path d="M108 {hy-18} Q94 {hy+25} 98 {hy+71} L110 {hy+69} L113 {hy+15} M150 {hy-21} Q169 {hy+17} 163 {hy+69} L151 {hy+68} L146 {hy+15}" stroke="{c["hair"]}" stroke-width="11" fill="none"/>'
 if c.get('hood'):
  head+=f'<path d="M99 {hy+12} Q82 {hy-27} 112 {hy-49} Q145 {hy-63} 161 {hy-15} L152 {hy+13} Q157 {hy-25} 131 {hy-34} Q100 {hy-26} 99 {hy+12}Z" fill="url(#cape)" stroke="#24232d" stroke-width="5"/><path d="M100 {hy-20} Q127 {hy-50} 150 {hy-26}" fill="none" stroke="{c["trim"]}" stroke-width="3"/>'
 else:
  head+=f'<path d="M105 {hy-11} Q91 {hy-36} 108 {hy-49} Q127 {hy-56} 148 {hy-43} Q162 {hy-31} 148 {hy-13} Q137 {hy-25} 125 {hy-27} Q111 {hy-15} 105 {hy-11}Z" fill="{c["hair"]}" stroke="#282029" stroke-width="4"/><path d="M111 {hy-38} Q137 {hy-55} 152 {hy-31}" stroke="{c["trim"]}" stroke-opacity=".5" stroke-width="3" fill="none"/>'
 if c.get('helmet'):
  head+=f'<path d="M102 {hy-7} L98 {hy-39} Q125 {hy-65} 152 {hy-39} L154 {hy-6} L146 {hy-26} Q127 {hy-37} 109 {hy-23}Z" fill="url(#metal)" stroke="#2a313c" stroke-width="5"/><path d="M126 {hy-56} L126 {hy-18}" stroke="url(#trim)" stroke-width="7"/>'
 if c.get('horns'):
  head+=f'<path d="M104 {hy-40} Q73 {hy-57} 92 {hy-83} Q86 {hy-61} 112 {hy-58}Z M146 {hy-40} Q176 {hy-63} 163 {hy-81} Q165 {hy-58} 139 {hy-56}Z" fill="#e0d7b3" stroke="#817e75" stroke-width="4"/>'
 # armor shinplate details and heraldry
 adorn=f'<path d="M124 133 L134 144 L124 156 L114 144Z" fill="url(#trim)" stroke="#3d3831" stroke-width="3"/><circle cx="124" cy="145" r="3.5" fill="#f5f2d0"/>'
 if c['weapon'] in ('sword','dagger','axe'):
  if attack:
   weapon=f'<g transform="translate(205,76) rotate(-23)">{weapon_svg(c["weapon"])}</g>'
  else:
   weapon=f'<g transform="translate(166,190) rotate(14)">{weapon_svg(c["weapon"])}</g>'
 else:
  weapon=f'<g transform="translate({212 if spell else 169},{112 if spell else 191}) rotate({-42 if spell else 14})">{weapon_svg("staff")}</g>'
 spell_fx=f'<circle cx="216" cy="108" r="29" fill="url(#spell)"/><circle cx="216" cy="108" r="7" fill="#edf7ff"/><g stroke="#8fd9ff" stroke-width="2"><path d="M198 108 L189 108 M233 108 L242 108 M216 92 L216 81 M216 124 L216 135"/></g>' if spell else ''
 return f'<g transform="translate({body_shift},{bob})">{torso}{arm}{head}{adorn}{weapon}{spell_fx}</g>'

def weapon_svg(kind):
 if kind=='axe':
  return '<path d="M-3 5 L-3 -75" stroke="#674b31" stroke-width="7"/><path d="M-2 -67 Q-31 -88 -35 -107 Q-15 -98 -4 -108 Q11 -95 20 -109 Q32 -88 10 -67Z" fill="url(#metal)" stroke="#25303c" stroke-width="4"/><path d="M-30 -99 Q-10 -97 -4 -85" stroke="#eef5f5" stroke-width="3" fill="none"/>'
 if kind=='dagger':
  return '<path d="M0 8 L0 -9" stroke="#6d4930" stroke-width="6"/><path d="M-5 -7 L5 -7 L3 -55 L-3 -55Z" fill="url(#metal)" stroke="#263542" stroke-width="3"/><path d="M-12 -10 L12 -10" stroke="#d6ac66" stroke-width="5"/>'
 if kind=='staff':
  return '<path d="M-1 13 L-1 -96" stroke="#796044" stroke-width="8" stroke-linecap="round"/><path d="M0 -80 L-9 -102 L0 -123 L9 -102Z" fill="#87bfff" stroke="url(#trim)" stroke-width="5"/><path d="M-5 -108 L2 -119" stroke="#ebffff" stroke-width="3"/>'
 return '<path d="M0 10 L0 -24" stroke="#6c4b32" stroke-width="7" stroke-linecap="round"/><path d="M-8 -23 L8 -23 L5 -111 L0 -126 L-5 -111Z" fill="url(#metal)" stroke="#33404d" stroke-width="3"/><path d="M-15 -21 L15 -21" stroke="url(#trim)" stroke-width="7"/><circle cy="11" r="5" fill="#f2d78d"/>'

def beast_svg(name,c,pose):
 bob=-3 if pose=='idle_b' else 0
 if name=='slime':
  return f'''<g transform="translate(0,{bob})"><path d="M46 197 Q32 163 56 116 Q83 67 125 70 Q171 69 194 118 Q222 170 194 205 Q179 224 120 229 Q61 227 46 197Z" fill="url(#skin)" stroke="#295d5a" stroke-width="8"/><path d="M64 149 Q71 103 121 91 Q164 90 181 127" fill="none" stroke="#c9fff1" stroke-opacity=".62" stroke-width="13" stroke-linecap="round"/><ellipse cx="90" cy="158" rx="10" ry="13" fill="#153d3b"/><ellipse cx="157" cy="158" rx="10" ry="13" fill="#153d3b"/><circle cx="86" cy="153" r="3" fill="#ffffff"/><path d="M96 187 Q119 205 150 185" fill="none" stroke="#2c7668" stroke-width="6" stroke-linecap="round"/><ellipse cx="72" cy="188" rx="15" ry="7" fill="#f8abc4" fill-opacity=".3"/><circle cx="76" cy="108" r="12" fill="#ffffff" fill-opacity=".23"/></g>'''
 if name=='wisp':
  return f'<g transform="translate(0,{bob})"><path d="M120 30 Q186 103 173 169 Q161 216 122 230 Q80 220 67 170 Q49 110 120 30Z" fill="url(#spell)"/><path d="M122 82 Q158 128 148 176 Q116 208 97 171 Q84 131 122 82Z" fill="#84cbed" fill-opacity=".57" stroke="#9be4fd" stroke-width="3"/><circle cx="112" cy="147" r="6" fill="#f4ffff"/><circle cx="142" cy="146" r="6" fill="#f4ffff"/></g>'
 if name=='bat':
  return f'''<g transform="translate(0,{bob})"><path d="M118 112 Q61 65 17 111 Q46 96 51 145 L77 133 L98 161Z M127 112 Q188 64 227 105 Q201 99 189 150 L165 132 L145 162Z" fill="url(#cape)" stroke="#343443" stroke-width="5"/><ellipse cx="121" cy="145" rx="35" ry="45" fill="url(#armor)" stroke="#2a2530" stroke-width="6"/><path d="M100 113 L95 87 L117 106 M141 111 L148 86 L133 103" fill="#9b84a5" stroke="#30303b" stroke-width="4"/><circle cx="106" cy="138" r="6" fill="#f0b7be"/><circle cx="137" cy="138" r="6" fill="#f0b7be"/><path d="M116 157 L120 165 L124 157" fill="#fbf5e7"/></g>'''
 # wolf from quadruped shapes
 return f'''<g transform="translate(0,{bob})"><path d="M47 176 Q76 117 156 130 L185 145 L196 184 Q179 207 138 194 L85 202Z" fill="url(#armor)" stroke="#32353b" stroke-width="6"/><path d="M58 145 Q36 123 28 92 Q52 102 72 130 M148 138 Q178 107 208 110 Q201 125 180 143" fill="#77818b" stroke="#32353b" stroke-width="5"/><path d="M81 168 L76 241 L92 244 L106 187 M160 174 L172 244 L187 241 L184 166" stroke="#4b525e" stroke-width="15" stroke-linecap="round"/><path d="M139 129 Q142 76 177 80 Q210 75 214 110 L222 137 L181 164 L148 156Z" fill="url(#skin)" stroke="#353b49" stroke-width="6"/><path d="M156 96 L153 60 L179 86Z M193 85 L215 60 L211 112Z" fill="#616878" stroke="#353a41" stroke-width="5"/><path d="M190 124 L220 134 L193 152" fill="#aeb5b4" stroke="#43454b" stroke-width="4"/><ellipse cx="167" cy="112" rx="6" ry="5" fill="#f4c87c"/><circle cx="168" cy="112" r="2" fill="#1c2429"/></g>'''

for name,c in COLORS.items():
 atlas=Image.new('RGBA',(W*len(POSES),H),(0,0,0,0))
 for i,pose in enumerate(POSES):
  kind=c['face']
  figur=beast_svg(name,c,pose) if kind in ('slime','wisp','bat','wolf') else humanoid(c,pose)
  svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 240 280">{common_defs(c)}<g stroke-linejoin="round" stroke-linecap="round">{figur}</g></svg>'''
  data=cairosvg.svg2png(bytestring=svg.encode(),output_width=W,output_height=H)
  img=Image.open(io.BytesIO(data)).convert('RGBA')
  atlas.paste(img,(i*W,0),img)
 atlas.save(ASSETS/f'{name}.png')

manifest={'frameWidth':W,'frameHeight':H,'frames':{pose:i for i,pose in enumerate(POSES)},'characters':list(COLORS.keys()),'license':'Original procedural illustrated sprite artwork created specifically for The Ashen Realms'}
(ASSETS/'manifest.json').write_text(json.dumps(manifest,indent=2))
# contact sheet
thumb=Image.new('RGB',(220*7,260*2),(26,30,42));d=ImageDraw.Draw(thumb)
for idx,(name,c) in enumerate(COLORS.items()):
 atlas=Image.open(ASSETS/f'{name}.png').convert('RGBA')
 sprite=atlas.crop((0,0,W,H));sprite.thumbnail((190,225))
 x=(idx%7)*220+(220-sprite.width)//2;y=(idx//7)*260
 thumb.paste(sprite,(x,y),sprite)
 d.text(((idx%7)*220+80,y+230),name,fill='white')
thumb.save('/mnt/data/ashen_sprite_contact.png')
print('Generated',len(COLORS),'spritesheets in',ASSETS)
