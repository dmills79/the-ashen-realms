#!/usr/bin/env python3
"""Local-area-network server for Ashen Realms v0.6.
Hosts existing single-player RPG and syncs peer positions and chat across lobbies.
NOT AN AUTHORITATIVE MULTIPLAYER RPG SERVER: quests, battles, economy remain local.
"""
import argparse
import asyncio
import json
import logging
import secrets
import time
from collections import defaultdict
from pathlib import Path
from aiohttp import web, WSMsgType

ROOT = Path(__file__).resolve().parent
MAX_PLAYERS_PER_ROOM = 8
ROOMS = defaultdict(dict)
VALID_LOCS = {'town':(30,22),'wild':(46,32),'crypt':(40,30),'camp':(30,22),'hall':(18,14),
              'smith':(18,14),'inn':(18,14),'tavern':(18,14)}
VALID_ROLES = {'Fighter','Wizard','Rogue','Cleric'}
VALID_DIRS = {'up','down','left','right'}


def member(peer):
    return {k:peer.get(k) for k in ('id','name','loc','x','y','dir','role','level')}


async def broadcast(room, payload, exclude=None):
    data=json.dumps(payload, ensure_ascii=False, separators=(',',':'))
    for peer in list(ROOMS[room].values()):
        if peer['ws'] is exclude:
            continue
        try:
            await peer['ws'].send_str(data)
        except (RuntimeError, ConnectionError):
            pass


async def websocket(request):
    # Only exposes HTTP WebSockets to same-origin pages on the local network.
    origin=request.headers.get('Origin')
    if origin:
        from urllib.parse import urlparse
        parsed=urlparse(origin)
        if parsed.scheme not in ('http','https') or parsed.netloc != request.host:
            return web.Response(status=403,text='Same-origin client required')
    ws=web.WebSocketResponse(heartbeat=20,max_msg_size=2048)
    await ws.prepare(request)
    peer=None
    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                data=json.loads(msg.data)
            except (ValueError,TypeError):
                continue
            if not isinstance(data,dict):
                continue
            kind=data.get('type')
            if kind=='join' and peer is None:
                room=data.get('room','havenmere')
                name=data.get('name','Adventurer')
                if not isinstance(room,str) or not (1<=len(room)<=24) or not all(c.isascii() and (c.isalnum() or c in '_-') for c in room):
                    await ws.send_json({'type':'error','message':'Room name must be 1-24 letters/numbers.'});continue
                if not isinstance(name,str) or not name.strip():name='Adventurer'
                name=''.join(c for c in name.strip() if c.isprintable())[:20]
                if len(ROOMS[room])>=MAX_PLAYERS_PER_ROOM:
                    await ws.send_json({'type':'error','message':'This room is full (8 players).'});await ws.close();break
                peer={'id':secrets.token_hex(5),'name':name,'loc':None,'x':0,'y':0,
                      'role':'Fighter','dir':'down','level':1,'room':room,'ws':ws,'last_move':0,'last_chat':0}
                ROOMS[room][peer['id']]=peer
                await ws.send_json({'type':'welcome','id':peer['id']})
                await ws.send_json({'type':'roster','players':[member(p) for p in ROOMS[room].values() if p is not peer]})
                await broadcast(room,{'type':'presence','action':'joined','player':member(peer)},exclude=ws)
            elif peer and kind=='state':
                now=time.monotonic()
                if now-peer['last_move']<0.075:continue
                loc=data.get('loc');x=data.get('x');y=data.get('y')
                if loc not in VALID_LOCS or not type(x) in (int,float) or not type(y) in (int,float):continue
                w,h=VALID_LOCS[loc]
                if not(0<=x<w and 0<=y<h and float(x).is_integer() and float(y).is_integer()):continue
                peer.update(loc=loc,x=int(x),y=int(y),dir=data.get('dir') if data.get('dir') in VALID_DIRS else 'down',
                            role=data.get('role') if data.get('role') in VALID_ROLES else 'Fighter',
                            level=min(50,max(1,int(data['level']))) if type(data.get('level'))==int else 1,last_move=now)
                await broadcast(peer['room'],{'type':'state','player':member(peer)},exclude=ws)
            elif peer and kind=='chat':
                now=time.monotonic()
                if now-peer['last_chat']<.45:continue
                message=data.get('message')
                if not isinstance(message,str):continue
                message=''.join(ch for ch in message.strip() if ch.isprintable())[:180]
                if not message:continue
                peer['last_chat']=now
                await broadcast(peer['room'],{'type':'chat','name':peer['name'],'message':message})
            elif peer and kind=='ping':
                await ws.send_json({'type':'pong'})
    finally:
        if peer:
            ROOMS[peer['room']].pop(peer['id'],None)
            await broadcast(peer['room'],{'type':'presence','action':'left','player':member(peer)})
            if not ROOMS[peer['room']]:ROOMS.pop(peer['room'],None)
    return ws


async def homepage(request):
    return web.FileResponse(ROOT/'index.html')


def build_app():
    app=web.Application(client_max_size=4096)
    app.router.add_get('/',homepage)
    app.router.add_get('/index.html',homepage)
    app.router.add_get('/ws',websocket)
    for file in ('game.js','network.js','style.css'):
        app.router.add_get('/'+file,lambda req,p=ROOT/file: web.FileResponse(p))
    app.router.add_static('/assets/',ROOT/'assets',show_index=False)
    return app


def main():
    parser=argparse.ArgumentParser(description='Host Ashen Realms LAN game server')
    parser.add_argument('--host',default='0.0.0.0',help='Bind address (0.0.0.0 shares on LAN)')
    parser.add_argument('--port',type=int,default=8844,help='Game HTTP and WebSocket port')
    args=parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    print(f'\nThe Ashen Realms LAN: http://localhost:{args.port}')
    print(f'Other devices: http://YOUR-LAN-IP:{args.port} (replace with host IPv4)')
    print('For LAN-only use. Do not expose this prototype directly to the public Internet.\n')
    web.run_app(build_app(),host=args.host,port=args.port)

if __name__=='__main__':main()
