from pathlib import Path
from PIL import Image,ImageDraw
import io,math,json,ast,cairosvg
source=Path(__file__).with_name('build_ashen_sprites.py').read_text()
T=ast.parse(source)
# Reuse original game's licensed-original palettes, gradients and weapon drawing.
keep=[]
for item in T.body:
 if isinstance(item,ast.Assign) and any(isinstance(t,ast.Name) and t.id in ('COLORS',) for t in item.targets):keep.append(item)
 if isinstance(item,ast.FunctionDef) and item.name in ('common_defs','weapon_svg','beast_svg'):keep.append(item)
ns={'math':math};exec(compile(ast.Module(body=keep,type_ignores=[]),'<sprites>','exec'),ns)
COLORS=ns['COLORS'];common_defs=ns['common_defs'];weapon_svg=ns['weapon_svg'];beast_svg=ns['beast_svg']
root=Path(__file__).resolve().parents[1]/'assets'/'sprites';root.mkdir(exist_ok=True)
W,H=240,280
poses=['idle_a','idle_b','attack','cast','hurt']

def humanoid(name,c,pose):
    isorc=c['face']=='orc';gob=c['face']=='goblin';skel=c['face']=='skeleton'
    mage=name in ('wizard','cleric','shaman');hood=c.get('hood',False);female=c.get('female',False)
    attack=pose=='attack';cast=pose=='cast';hurt=pose=='hurt';shift=8 if attack else -7 if hurt else 0
    breath=-2 if pose=='idle_b' else 0
    # A battle-ready 3/4 silhouette: narrow head, long legs, asymmetric armor.
    coat=c['cape'];main=c['main'];sec=c['secondary'];trim=c['trim'];skin=c['skin']
    back=f'''<path d="M91 107 Q78 133 68 217 Q80 250 106 249 L122 197 L153 250 Q168 231 160 181 L152 104Z" fill="url(#cape)" stroke="#1b2127" stroke-width="3"/>
    <path d="M81 151 Q75 184 81 226" stroke="{trim}" stroke-opacity=".27" fill="none" stroke-width="1.7"/>
    <path d="M153 145 Q160 185 152 217" stroke="#0b1721" stroke-opacity=".65" stroke-width="5" fill="none"/>'''
    legs=f'''<path d="M101 174 L125 175 L121 227 L114 260 L91 261 L93 221Z" fill="url(#armor)" stroke="#1b252c" stroke-width="3"/>
    <path d="M128 173 L150 172 L157 223 L169 259 L142 261 L127 225Z" fill="url(#armor)" stroke="#1b252c" stroke-width="3"/>
    <path d="M96 208 L122 205 L120 213 L94 216Z M133 205 L153 202 L155 210 L135 216Z" fill="url(#metal)" stroke="#262b32" stroke-width="2"/>
    <path d="M90 249 Q103 247 115 251 L114 260 L84 263 Q79 259 90 249Z M140 250 Q150 247 164 251 L174 263 L142 263Z" fill="#282a2a" stroke="#13171c" stroke-width="2"/>
    <path d="M99 219 L112 217 M138 220 L151 216" stroke="{trim}" stroke-opacity=".58" stroke-width="1.6"/>'''
    if mage:
       legs+=f'''<path d="M96 167 L149 166 L165 236 Q153 251 144 247 L126 215 L111 249 L81 239Z" fill="url(#cape)" stroke="#1b2028" stroke-width="3"/>
       <path d="M120 179 L124 241 M91 218 Q108 232 115 228" stroke="{trim}" stroke-opacity=".5" stroke-width="2" fill="none"/>'''
    shoulder= f'''<path d="M98 103 L145 99 Q159 107 158 125 L151 173 L138 188 L100 182 L91 166 L88 130 Q87 107 98 103Z" fill="url(#armor)" stroke="#1c222a" stroke-width="3.4"/>
    <path d="M100 112 Q124 121 149 109" fill="none" stroke="url(#trim)" stroke-width="4"/>
    <path d="M103 122 Q126 129 146 120 L140 164 L117 175 L104 159Z" fill="{main}" stroke="{trim}" stroke-opacity=".65" stroke-width="2.2"/>
    <path d="M112 129 L130 136 L126 165 L111 156" fill="#030a12" opacity=".17"/>
    <path d="M97 175 L151 174 L152 185 L95 185Z" fill="#2d2926" stroke="{trim}" stroke-width="1.8"/>
    <path d="M122 175 L136 177 L133 185 L121 186Z" fill="url(#trim)" stroke="#3d332e" stroke-width="1"/>
    <path d="M110 146 L120 151 L109 155 M133 147 L142 143" fill="none" stroke="{trim}" stroke-opacity=".7" stroke-width="1.7"/>
    <path d="M92 114 Q78 112 80 131 L97 139 L108 117Z" fill="url(#metal)" stroke="#28313a" stroke-width="3"/>
    <path d="M80 116 L95 118 M82 122 L97 124" stroke="#fff4da" opacity=".5" stroke-width="1.5"/>'''
    if name in ('orc','warboss'):
       shoulder += f'''<path d="M92 111 L74 99 L84 126 L101 137Z" fill="url(#metal)" stroke="#34312a" stroke-width="3"/><path d="M154 108 L171 101 L160 126 L145 131Z" fill="url(#metal)" stroke="#34312a" stroke-width="3"/>'''
    elif name=='fighter':
       shoulder +=f'''<path d="M112 139 L124 131 L136 139 L130 157 L118 159Z" fill="url(#trim)" stroke="#282f38" stroke-width="2"/><path d="M114 140 L133 154" stroke="#fff5d7" stroke-opacity=".7" stroke-width="1.5"/>'''
    elif name=='rogue':
       shoulder+=f'''<path d="M101 119 L98 167 M147 119 L141 163" fill="none" stroke="{trim}" stroke-opacity=".4" stroke-width="2"/><path d="M90 126 L107 120" stroke="#c8c5ad" stroke-width="1.7"/>'''
    elif mage:
       shoulder+=f'''<path d="M121 122 L128 140 L121 152 L113 140Z" fill="url(#trim)" stroke="#4e443b" stroke-width="2"/><path d="M104 153 L120 171 L143 153" stroke="{trim}" stroke-opacity=".5" fill="none" stroke-width="2"/>'''
    # Arms angled, physically attached. Casting extends an arm; weapon swing rotates the forearm.
    left=f'''<path d="M91 115 Q79 119 76 139 L68 177 L77 188 L91 174 L99 139Z" fill="url(#armor)" stroke="#1d242d" stroke-width="3"/>
    <path d="M68 169 L89 173 L86 183 L68 182Z" fill="url(#metal)" stroke="#222b35" stroke-width="2"/>
    <path d="M71 184 L85 186 L84 198 Q72 201 68 193Z" fill="{sec}" stroke="#1b232c" stroke-width="2"/>
    <path d="M71 182 L81 182" stroke="{trim}" stroke-width="1.5"/>'''
    if attack:
      right=f'''<path d="M151 113 L168 111 L192 83 L202 92 L179 135 L162 153Z" fill="url(#armor)" stroke="#20252c" stroke-width="3"/>
      <path d="M186 85 L199 95 L210 82 L202 70Z" fill="url(#metal)" stroke="#273039" stroke-width="2"/>'''
      weapon=f'<g transform="translate(207,86) rotate(-37)">{weapon_svg(c["weapon"] or "sword")}</g>'
    elif cast:
      right=f'''<path d="M153 115 L172 113 L196 113 L204 127 L172 135 L157 151Z" fill="url(#armor)" stroke="#20252c" stroke-width="3"/>
      <path d="M193 112 L211 110 L216 125 L201 133Z" fill="url(#metal)" stroke="#273039" stroke-width="2"/>'''
      weapon=f'<g transform="translate(169,195) rotate(18)">{weapon_svg(c["weapon"] or "staff")}</g>'
    else:
      right=f'''<path d="M149 114 L163 128 L170 166 L164 195 L150 191 L146 149Z" fill="url(#armor)" stroke="#1c252d" stroke-width="3"/>
      <path d="M150 180 L171 181 L173 193 L150 194Z" fill="url(#metal)" stroke="#21252d" stroke-width="2"/>
      <path d="M157 194 L173 192 L173 205 L162 208Z" fill="{sec}" stroke="#20252c" stroke-width="2"/>'''
      weapon=f'<g transform="translate(172,198) rotate(21)">{weapon_svg(c["weapon"] or "sword")}</g>'
    face_x=128
    ears=''
    if gob or isorc:
      ears=f'''<path d="M111 76 L90 60 L102 88 M145 76 L169 57 L153 89" fill="{skin}" stroke="#293329" stroke-width="2"/>'''
    # Face: 34px high, realistic eyes not cartoon circles, stern mouth, heavy brows.
    head=f'''{ears}<path d="M110 66 Q119 55 138 61 L148 72 L145 88 Q143 100 128 104 Q115 102 110 92Z" fill="url(#skin)" stroke="#2d2a29" stroke-width="2.5"/>
    <path d="M112 77 L123 74 M132 74 L143 75" stroke="#292626" stroke-width="2.7" stroke-linecap="round"/>
    <path d="M115 81 L124 81 M133 80 L143 81" stroke="#111922" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M130 81 L127 89 L132 91" stroke="#775144" stroke-width="1.2" fill="none"/>
    <path d="M120 96 L135 94" stroke="#654843" stroke-width="1.6"/>
    <path d="M116 93 L123 97" stroke="#ffffff" stroke-opacity=".09" stroke-width="1"/>'''
    if gob or isorc:
      head+=f'''<path d="M118 95 L116 89 L122 96 M136 96 L141 87 L143 97" fill="#f2ddbc" stroke="#83725a" stroke-width="1.2"/>'''
    if skel:
      head+='''<path d="M112 80 L124 82 L122 90 L111 88 M131 79 L144 80 L143 89 L133 89" fill="#172027"/>'''
    if female:
      head+=f'''<path d="M110 65 Q99 77 101 124 M144 66 Q158 86 154 128" stroke="{c['hair']}" stroke-width="8" stroke-linecap="round" fill="none"/>'''
    if hood:
      head+=f'''<path d="M109 103 Q95 76 105 58 Q119 39 138 51 Q157 57 152 87 L143 68 Q127 58 112 70Z" fill="url(#cape)" stroke="#1a1b25" stroke-width="3"/>
      <path d="M109 65 Q131 49 150 70" fill="none" stroke="{trim}" stroke-opacity=".5" stroke-width="2"/>'''
    elif c.get('helmet') or name=='fighter' or name in ('orc','warboss'):
      head+=f'''<path d="M107 83 L105 63 Q124 39 149 60 L151 80 L144 73 Q124 66 112 75Z" fill="url(#metal)" stroke="#252c35" stroke-width="2.7"/>
      <path d="M109 67 Q131 53 146 66" fill="none" stroke="{trim}" stroke-width="2"/>
      <path d="M125 57 L125 73" stroke="#f4ead6" stroke-opacity=".7" stroke-width="2"/>'''
    else:
      head+=f'''<path d="M109 77 L107 60 Q123 45 139 51 Q151 55 149 72 L138 64 L125 63Z" fill="{c['hair']}" stroke="#25232a" stroke-width="2"/>'''
    if c.get('horns'):
      head+='''<path d="M112 61 Q91 47 103 32 Q99 51 120 54Z M141 61 Q163 46 155 30 Q160 50 134 55Z" fill="#d0c5a9" stroke="#736953" stroke-width="2"/>'''
    # Minimal plate scratches and rim highlights provide texture without confetti.
    details=f'''<path d="M103 119 L110 113 M140 124 L144 115 M104 198 L109 199 M144 232 L152 231" stroke="#fff0d0" stroke-opacity=".27" stroke-width="1.2"/>
      <path d="M86 145 L80 163 M149 155 L151 170" stroke="#0a1017" stroke-opacity=".46" stroke-width="2"/>
      <path d="M103 166 L110 169 M131 167 L142 162" stroke="{trim}" stroke-opacity=".35" stroke-width="1.3"/>'''
    spell_fx='''<circle cx="214" cy="109" r="30" fill="url(#spell)"/><path d="M193 107 L200 97 M220 92 L222 84 M229 118 L239 122" stroke="#b5dfff" stroke-width="2"/>''' if cast else ''
    shield = '''<path d="M77 139 Q55 134 49 150 L56 195 Q72 211 88 188 L89 151Z" fill="url(#metal)" stroke="#171f29" stroke-width="3"/><path d="M76 146 L62 149 L64 184 L77 192" fill="none" stroke="url(#trim)" stroke-width="2"/>''' if name in ('fighter','sentinel','boss') else ''
    core=back+legs+shoulder+left+right+head+details+shield+weapon+spell_fx
    scale='translate(21 39) scale(.82)' if gob else 'translate(-7 -4) scale(1.07)' if isorc else ''
    return f'<g transform="translate({shift} {breath})"><g transform="{scale}">{core}</g></g>'

sheet=[]
for name,c in COLORS.items():
    atlas=Image.new('RGBA',(W*len(poses),H),(0,0,0,0))
    for i,pose in enumerate(poses):
        figure=beast_svg(name,c,pose) if c['face'] in ('slime','wisp','bat','wolf') else humanoid(name,c,pose)
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 240 280">{common_defs(c)}<g stroke-linejoin="round" stroke-linecap="round">{figure}</g></svg>'
        raw=cairosvg.svg2png(bytestring=svg.encode())
        img=Image.open(io.BytesIO(raw)).convert('RGBA')
        atlas.paste(img,(i*W,0),img)
    atlas.save(root/(name+'.png'))
    if name in ('fighter','cleric','rogue','wizard','goblin','orc','shaman','warboss'):
       thumb=atlas.crop((0,0,W,H));thumb.thumbnail((215,240))
       sheet.append((name,thumb))
contact=Image.new('RGB',(4*240,2*280),(19,30,42));dr=ImageDraw.Draw(contact)
for i,(name,img) in enumerate(sheet):
    x=i%4*240+int((240-img.width)/2);y=i//4*280+5
    contact.paste(img,(x,y),img);dr.text((i%4*240+10,y+245),name,fill='#e1c694')
contact.save(Path(__file__).resolve().parents[1]/'sprites_v14_contact.png')
(root/'manifest.json').write_text(json.dumps({'frameWidth':W,'frameHeight':H,'frames':dict(zip(poses,range(5))),'characters':list(COLORS),'license':'Original Ashen Realms character artwork generated locally with SVG and CairoSVG'},indent=2))
print('generated',len(COLORS),'5-frame spritesheets')
