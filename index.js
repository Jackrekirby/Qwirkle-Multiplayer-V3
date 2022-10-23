const refs = {
    btiles: document.getElementById("board-tiles"),
    htiles: document.getElementById("hand-tiles"),
    board: document.getElementById("board"),
    hand: document.getElementById("hand"),
    table: document.getElementById("table"),
    tileCount: document.getElementById("tile-count"),
    connection: document.getElementById('connection'),
    startTile: undefined,
    endTile: undefined,
    movingTile: undefined,
};

// multiplayer logic

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

let userId = localStorage.getItem('userId');
if (userId == null) {
    userId = uuidv4();
    localStorage.setItem('userId', userId);
}

// try and first join game from url param
// then try and rejoin old game
// then create new game

const queryParams = new URLSearchParams(window.location.search);
let gameId = queryParams.get('gameId');

if (gameId == null) {
    gameId = localStorage.getItem('gameId');
} else {
    localStorage.setItem('gameId', gameId);
}

if (gameId == null) {
    newGame();
} else {
    setGameUrlParam(gameId);
}

function newGame() {
    gameId = uuidv4();
    localStorage.setItem('gameId', gameId);
    setGameUrlParam(gameId);
}

function setGameUrlParam(gameId) {
    Math.seedrandom(gameId);
    // Set new or modify existing parameter value. 
    queryParams.set("gameId", gameId);
    // Replace current querystring with the new one.
    history.replaceState(null, null, "?" + queryParams.toString());
}




// single player logic

let tilesize = Math.floor(window.innerWidth / 8);
const ntiles = 41;

{ // build board
    for (let x = 0; x < ntiles; x++) {
        for (let y = 0; y < ntiles; y++) {
            const ref = CreateTile(['empty']);
            ref.id = `btile_${x}_${y}`;
            refs.btiles.appendChild(ref);
        }
    }
}

{ // build hand
    for (let i = 0; i < 6; i++) {
        const ref = CreateTile(['empty']);
        ref.id = `htile_${i}`;
        refs.htiles.appendChild(ref);
    }
}

function CreateTile(classes) {
    const ref = document.createElement('div');
    ref.classList.add('tile', ...classes);

    // const ref2 = document.createElement('div');
    // ref2.classList.add('slot');

    // ref.appendChild(ref2);
    return ref;
}

function removeHovers() {
    const hovers = refs.table.getElementsByClassName('hover');
    for (const ref of hovers) {
        ref.classList.remove('hover');
    }
}

let tablePos = refs.table.getBoundingClientRect();

const getTouchXY = (e) => {
    return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
    };
}

const getMouseXY = (e) => {
    return {
        x: e.clientX,
        y: e.clientY
    };
}

const updateMovingTile = (ref, x, y) => {
    ref.style.left = x - tablePos.left - (tilesize / 2);
    ref.style.top = y - tablePos.top - (tilesize / 2);
}

const numEmptyHandSlots = () => refs.htiles.getElementsByClassName('empty').length;


const tilesInBag = (() => {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    const shapes = ['square', 'circle', 'diamond', 'asterisk', 'plus', 'cross'];

    const x = [];

    for (let i = 0; i < 3; i++) {
        for (const color of colors) {
            for (const shape of shapes) {
                x.push(`cs-${color}-${shape}`);
            }
        }
    }

    const shuffle = (a) => {
        let i = a.length, j; // i = current index, j = random index

        while (i != 0) {
            j = Math.floor(Math.random() * i);
            i--;
            [a[i], a[j]] = [a[j], a[i]];
        }

        return a;
    }

    return shuffle(x);
})();


const callbackQueue = {};

// function addCallBack(fnc) {
//     const callbackId = uuidv4();

//     const timeout = setTimeout(() => {
//         delete callbackQueue[callbackId];
//         fnc(false);
//     }, 1000);

//     callbackQueue[callbackId] = (data) => {
//         clearTimeout(timeout);
//         fnc(true, data);
//     };
// }


// let promiseResolve, promiseReject;

// (async () => {
//     const promise = await new Promise(function (resolve, reject) {
//         promiseResolve = resolve;
//         promiseReject = reject;
//     });
//     console.log('promise', promise);
// })();


function addCallBack(socketJsonMessage) {
    const callbackId = uuidv4();
    callbackQueue[callbackId] = { resolve: undefined, reject: undefined };


    socketJsonMessage.callerId = userId;
    socketJsonMessage.callbackId = callbackId;

    socketSend(socketJsonMessage);

    const timeout = setTimeout(() => {
        console.warn(`${socketJsonMessage.action} failed to return promise`);
        callbackQueue[callbackId].resolve(null);
    }, 500);

    const p = new Promise(function (resolve, reject) {
        callbackQueue[callbackId].resolve = resolve;
        callbackQueue[callbackId].reject = reject;
    });

    p.finally(() => clearTimeout(timeout));

    return p;
}


function takeTileFromBag() {
    return addCallBack({ action: 'takeTileFromBag' });

    // const tile = tilesInBag.pop();
    // updateTileBagCount();
    // return tile;
}

function addTileToTopOfBag(tile) {
    return addCallBack({ action: 'addTileToTopOfBag', tile });
    // tilesInBag.push(tile);
    // updateTileBagCount();
}

function addTileToBag(tile) {
    return addCallBack({ action: 'addTileToBag', tile });
    // tilesInBag.splice(Math.floor(Math.random() * tilesInBag.length), 0, tile);
    // updateTileBagCount();
}

function updateTileBagCount() {
    refs.tileCount.innerText = tilesInBag.length;
}

function getTile(x, y) {
    const path = document.elementsFromPoint(x, y);
    for (const ref of path) {
        if (ref.classList.contains('tile')) {
            return ref;
        }
    }
    return undefined;
}

let source, destination;


async function onPointerStart(e, getXYFnc) {
    const { x, y } = getXYFnc(e);
    refs.startTile = getTile(x, y);

    source = getTileOwner(refs.startTile);
    console.log('source', source);

    const initMoveTile = (fromBag) => {
        const ref = document.createElement('div');

        if (!fromBag) {
            refs.startTile.classList.add('empty');
        } else {
            ref.classList.add('fromBag');
        }

        ref.classList.add('moving-tile');
        updateMovingTile(ref, x, y);
        refs.table.appendChild(ref);
        refs.movingTile = ref;
        return ref;
    }

    switch (source.main) {
        case 'tilebag':
            if (source.trait == 'normal') {
                initMoveTile(true);
                // const tileClass = await takeTileFromBag();
                // console.log('tileClass', tileClass);
                // if (tileClass != null) {
                //     const ref = initMoveTile(true);
                //     ref.classList.add(tileClass);
                // } else {
                //     console.warn('takeTileFromBag failed');
                // }

                // const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
                // const shapes = ['square', 'circle', 'diamond', 'asterisk', 'star', 'cross'];
                // const rr = () => Math.floor(Math.random() * 6);
                // ref.classList.add(`cs-${colors[rr()]}-${shapes[rr()]}`);
                // ref.appendChild(ShapesIcons.random());
            }
            break;
        case 'hand':
        case 'board':
            if (source.trait == 'tile') {
                const ref = initMoveTile(false);
                const c0 = getColorShapeClass(refs.startTile);
                ref.classList.add(c0);
                refs.startTile.classList.remove(c0);
                // ref.appendChild(refs.startTile.firstChild.firstChild);
            }
            break;
        default:
            break;
    }
}

function onPointerMove(e, getXYFnc) {
    const { x, y } = getXYFnc(e);
    removeHovers();
    if (refs.movingTile) {
        e.stopPropagation();
        refs.endTile = getTile(x, y);

        destination = getTileOwner(refs.endTile);
        updateMovingTile(refs.movingTile, x, y);

        switch (destination.main) {
            case 'board':
                if (destination.trait == 'slot' && source.main != 'tilebag') {
                    refs.endTile.classList.add('hover');
                }
                break;
            case 'hand':
                if (destination.trait == 'slot') {
                    refs.endTile.classList.add('hover');
                }
                break;
            default:
                break;
        }
    }
}

async function onPointerEnd() {
    removeHovers();

    const actions = {
        add: async () => {
            const tileClass = await takeTileFromBag();
            console.log('tileClass', tileClass);
            if (tileClass != null) {
                refs.endTile.classList.remove('empty');
                refs.endTile.classList.add(tileClass);
            }
        },
        move: async () => {
            const tileClass = getColorShapeClass(refs.movingTile);

            const success = await addCallBack({
                action: 'moveTile',
                startTileId: refs.startTile.id,
                endTileId: refs.endTile.id,
                tileClass
            });

            if (success) {
                // console.log(success, refs.endTile);
                refs.endTile.classList.remove('empty');

                refs.endTile.classList.add(tileClass);

                // console.log('WS', refs.startTile.id, refs.endTile.id, tileClass);
            } else {
                // revert
                refs.startTile.classList.remove('empty');
                refs.startTile.classList.add(getColorShapeClass(refs.movingTile));
            }
            // refs.endTile.firstChild.appendChild(refs.movingTile.firstChild);
        },
        revert: () => {
            refs.startTile.classList.remove('empty');
            refs.startTile.classList.add(getColorShapeClass(refs.movingTile));
            // refs.startTile.firstChild.appendChild(refs.movingTile.firstChild);
        },
        swap: () => {
            const c0 = getColorShapeClass(refs.endTile), c1 = getColorShapeClass(refs.movingTile);
            refs.endTile.classList.remove(c0); refs.endTile.classList.add(c1);
            refs.startTile.classList.remove(c1); refs.startTile.classList.add(c0);
            // refs.startTile.firstChild.appendChild(refs.endTile.firstChild.firstChild);
            // refs.endTile.firstChild.appendChild(refs.movingTile.firstChild);
            refs.startTile.classList.remove('empty');
        }
    }

    if (refs.movingTile) {
        console.log('end', destination);
        if (destination == null) {
            switch (source.main) {
                case 'tilebag':
                    break;
                default: // for board or hand put tile back
                    actions.revert();
                    break;
            }
        } else {
            const path = source.main + ' ' + destination.main;
            // console.log(path);
            switch (path) {
                case 'tilebag hand':
                    if (destination.trait == 'slot') {
                        await actions.add();
                    }
                    break;
                case 'tilebag tilebag': {
                    // const tile = await addTileToTopOfBag(getColorShapeClass(refs.movingTile));
                    // if (tile == null) {
                    //     console.warn('Failed to addTileToTopOfBag');
                    // }
                    break;
                }
                case 'hand tilebag': {
                    const tile = await addTileToBag(getColorShapeClass(refs.movingTile));
                    if (tile == null) {
                        actions.revert();
                        console.warn('Failed to addTileToBag');
                    }
                    break;
                }
                case 'hand board':
                case 'board hand':
                case 'board board':
                    if (destination.trait == 'slot') {
                        await actions.move();
                    } else {
                        actions.revert();
                    }
                    break;
                case 'board tilebag':
                case 'board null':
                case 'hand null':
                    // revert
                    actions.revert();
                    break;
                case 'hand hand':
                    if (destination.trait == 'slot') {
                        await actions.move();
                    } else {
                        actions.swap();
                    }
                    break;
                default:
                    break;
            }
        }
        refs.movingTile.remove();
    }

    refs.startTile = null;
    refs.movingTile = null;
    refs.endTile = null;
    destination = null;
    source = null;
}

const getColorShapeClass = (ref) => Array.from(ref.classList).find(obj => obj.startsWith('cs-'));

document.ontouchstart = (e) => {
    onPointerStart(e, getTouchXY);
}

document.onmousedown = (e) => {
    onPointerStart(e, getMouseXY);
}

document.ontouchmove = (e) => {
    onPointerMove(e, getTouchXY);
}

document.onmousemove = (e) => {
    onPointerMove(e, getMouseXY);
}

document.ontouchend = _ => {
    onPointerEnd();
}

document.onmouseup = _ => {
    onPointerEnd();
}

function getTileOwner(ref) {
    if (ref == null) return { main: null };
    const isEmpty = ref.classList.contains('empty');
    if (ref.id == 'tilebag') {
        let trait = 'normal';
        if (numEmptyHandSlots() === 0) trait = 'full-hand';
        if (tilesInBag.length === 0) trait = 'empty';
        return { main: 'tilebag', trait: trait };
    } else if (ref.parentElement == refs.btiles) {
        return { main: 'board', trait: isEmpty ? 'slot' : 'tile' };
    } else if (ref.parentElement == refs.htiles) {
        return { main: 'hand', trait: isEmpty ? 'slot' : 'tile' };
    }
    return null;
}


{
    const ref = document.getElementById('zoom-in');
    ref.onclick = () => {
        const sx = refs.board.scrollLeft, sy = refs.board.scrollTop;
        const bw = refs.board.offsetWidth, bh = refs.board.offsetHeight;
        const sw = refs.btiles.scrollWidth, sh = refs.btiles.scrollHeight;
        const rx = (sx + bw / 2) / sw, ry = (sy + bh / 2) / sh;

        const ref = document.querySelector(':root');
        tilesize += 10;
        tilesize = Math.floor(Math.min(tilesize, refs.board.offsetWidth / 8));
        ref.style.setProperty('--size', `${tilesize}px`);

        const sw2 = refs.btiles.scrollWidth, sh2 = refs.btiles.scrollHeight;
        refs.board.scrollLeft = rx * sw2 - bw / 2;
        refs.board.scrollTop = ry * sh2 - bh / 2;

        tablePos = refs.table.getBoundingClientRect();
    }
    ref.onclick();
}

{
    const ref = document.getElementById('zoom-out');
    ref.onclick = () => {
        const sx = refs.board.scrollLeft, sy = refs.board.scrollTop;
        const bw = refs.board.offsetWidth, bh = refs.board.offsetHeight;
        const sw = refs.btiles.scrollWidth, sh = refs.btiles.scrollHeight;
        const rx = (sx + bw / 2) / sw, ry = (sy + bh / 2) / sh;

        const ref = document.querySelector(':root');
        tilesize -= 10;

        tilesize = Math.floor(Math.max(tilesize, Math.max(refs.board.offsetWidth, refs.board.offsetHeight) / ntiles));
        ref.style.setProperty('--size', `${tilesize}px`);

        const sw2 = refs.btiles.scrollWidth, sh2 = refs.btiles.scrollHeight;
        refs.board.scrollLeft = rx * sw2 - bw / 2;
        refs.board.scrollTop = ry * sh2 - bh / 2;

        tablePos = refs.table.getBoundingClientRect();
    }
}

// const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

{
    const isNotEmpty = (ref) => Array.from(ref.classList).some(obj => obj.startsWith('cs-'));

    const ref = document.getElementById('recenter');
    ref.onclick = () => {
        const tiles = Array.from(refs.btiles.children).filter(ref => isNotEmpty(ref));
        console.log(tiles);

        if (tiles.length == 0) {
            center();
        } else {
            recenter(tiles);
        }
    }

    function center() {
        refs.board.scrollLeft = (refs.btiles.scrollWidth - refs.board.offsetWidth) / 2;
        refs.board.scrollTop = (refs.btiles.scrollHeight - refs.board.offsetHeight) / 2;
    }

    function recenter(tiles) {
        let x = 0, y = 0;
        for (let tile of tiles) {
            x += tile.offsetLeft;
            y += tile.offsetTop;
        }

        x /= tiles.length;
        y /= tiles.length;

        x += tilesize / 2;
        y += tilesize / 2;

        const tx = refs.board.offsetWidth, ty = refs.board.offsetHeight;

        // console.log(x, y);

        x -= tx / 2;
        y -= ty / 2;

        // x = clamp(x, 0, refs.btiles.offsetWidth);
        // y = clamp(y, 0, refs.btiles.offsetHeight);

        refs.board.scrollLeft = x;
        refs.board.scrollTop = y;

        // console.log(x, y);
    }
    center();
}



// websocket

{
    const ref = document.getElementById('new');
    ref.onclick = () => {
        newGame();
        wsw.ws.close();
    }
}

{
    const ref = document.getElementById('connection');
    console.log(ref.children[0]);
    ref.children[0].setAttribute('fill', 'hsl(150, 100%, 50%)');
}




function connectStatus(status) {
    // console.log('status', status);
    const hues = {
        'opening': 0,
        'open': 100,
        'closed': 30,
        'error': 300,
    };

    refs.connection.children[0].setAttribute('fill', `hsl(${hues[status]}, 100%, 40%)`);
}

const wsw = {
    ws: undefined, onopen: () => { }, onclose: () => { },
    onerror: () => { }, onmessage: () => { }, init: () => { },
    ref: document.getElementById('ws-status')
}; // web socket wrapper

const url = 'wss://qwirkle-ws.herokuapp.com';
// const url = 'ws://localhost:3000/ws';

function socketSend(json) {
    if (wsw.ws.readyState === 1) {
        try {
            wsw.ws.send(JSON.stringify(json));
        }
        catch (error) {
            console.error(error);
        }
    }
}

wsw.onopen = () => {
    console.log('ws open');

    connectStatus('open');

    let userId = localStorage.getItem('userId');
    let gameId = localStorage.getItem('gameId');
    socketSend({ action: 'new', userId, gameId });

    // setTimeout(() => {
    //     wsw.ws.close();
    // }, 1000);
};

wsw.onclose = (e) => {
    connectStatus('closed');
    // console.log('ws closed', e);
    wsw.init();
};

wsw.onerror = (e) => {
    connectStatus('error');
    // console.error('ws error', e);
    wsw.init();
};

wsw.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    console.log('ws msg', data);

    switch (data.action) {
        case 'takeTileFromBag':
            if (data.callerId == userId) {
                const tile = tilesInBag.pop();
                updateTileBagCount();
                callbackQueue[data.callbackId].resolve(tile);
            } else {
                tilesInBag.pop();
                updateTileBagCount();
            }
            break;
        case 'addTileToTopOfBag':
            if (data.callerId == userId) {
                tilesInBag.push(data.tile);
                updateTileBagCount();
                callbackQueue[data.callbackId].resolve(data.tile);
            } else {
                tilesInBag.push(data.tile);
                updateTileBagCount();
            }
            break;
        case 'addTileToBag':
            if (data.callerId == userId) {
                tilesInBag.splice(Math.floor(Math.random() * tilesInBag.length), 0, data.tile);
                updateTileBagCount();
                callbackQueue[data.callbackId].resolve(data.tile);
            } else {
                tilesInBag.splice(Math.floor(Math.random() * tilesInBag.length), 0, data.tile);
                updateTileBagCount();
            }
            break;
        case 'moveTile':
            if (data.callerId == userId) {
                callbackQueue[data.callbackId].resolve(true);
            } else {
                console.log('moveTile', data);
                const { startTileId, endTileId, tileClass } = data;
                if (startTileId.startsWith('btile')) {
                    const ref = document.getElementById(startTileId);
                    ref.classList.remove(tileClass);
                    ref.classList.add('empty');
                } // if handtile dont care FOR NOW (need to track hand tile for reload)

                if (endTileId.startsWith('btile')) {
                    const ref = document.getElementById(endTileId);
                    ref.classList.remove('empty');
                    ref.classList.add(tileClass);
                }

            }
            break;
        default:
            break;
    }
}

wsw.init = () => {
    connectStatus('opening');
    wsw.ws = new WebSocket(url);

    wsw.ws.onopen = wsw.onopen;
    wsw.ws.onclose = wsw.onclose;
    wsw.ws.onerror = wsw.onerror;
    wsw.ws.onmessage = wsw.onmessage;
}

wsw.init();