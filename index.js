console.log('Version 1');

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

{
    const version = 'v1';
    const ref = document.getElementById('version');
    if (version != ref.innerText) {
        ref.innerText = version + '*';
    }
}

// constants

const url = 'wss://qwirkle-ws2.herokuapp.com';
// const url = 'ws://localhost:3000/ws';

let tilesize = Math.floor(window.innerWidth / 8);
const ntiles = 41;
let tilesInBag = [];
let userHands = [];
let boardTiles = {};
let playerId;

{
    const data = localStorage.getItem('tilesInBag');
    if (data != null) {
        tilesInBag = JSON.parse(data);
        updateTileBagCount();
    }
}

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
    // if url gameId does not match storage gameId new game has started
    if (gameId != localStorage.getItem('gameId')) {
        newGame();
    }
    localStorage.setItem('gameId', gameId);
}

if (gameId == null) {
    gameId = uuidv4();
    newGame();
} else {
    setGameUrlParam(gameId);
}

function newGame() {
    console.log('new game');

    localStorage.setItem('gameId', gameId);
    setGameUrlParam(gameId);

    localStorage.removeItem('boardTiles');
    // localStorage.removeItem('userHands');
    clearBoard();
    clearHand();
    tilesInBag = createTileBag();
    updateTileBagCount();
}

function setGameUrlParam(gameId) {
    Math.seedrandom(gameId);
    // Set new or modify existing parameter value. 
    queryParams.set("gameId", gameId);
    // Replace current querystring with the new one.
    history.replaceState(null, null, "?" + queryParams.toString());
}




// single player logic

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




function createTileBag() {
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
};


const tileIdToClass = (() => {
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
    return x;
})();

const callbackQueue = {};

function addCallBack(socketJsonMessage) {
    const callbackId = uuidv4();
    callbackQueue[callbackId] = { resolve: undefined, reject: undefined };


    socketJsonMessage.callerId = userId;
    socketJsonMessage.callbackId = callbackId;
    socketJsonMessage.time = new Date().getTime();

    socketSend(socketJsonMessage);

    const timeout = setTimeout(() => {
        console.warn(`${socketJsonMessage.action} failed to return promise`);
        callbackQueue[callbackId].resolve(null);
    }, 1000);

    const p = new Promise(function (resolve, reject) {
        callbackQueue[callbackId].resolve = resolve;
        callbackQueue[callbackId].reject = reject;
    });

    p.finally(() => clearTimeout(timeout));

    return p;
}


function takeTileFromBag(handIndex) {
    console.log('takeTileFromBag', playerId, handIndex);
    return addCallBack({ action: 'takeTileFromBag', playerId, handIndex });
}

function addTileToBag(handIndex) {
    // const insertIndex = Math.floor(Math.random() * tilesInBag.length);
    console.log('putTileInBag', playerId, handIndex);
    return addCallBack({ action: 'putTileInBag', playerId, handIndex });
}

function updateTileBagCount() {
    refs.tileCount.innerText = tilesInBag.length;
    localStorage.setItem('tilesInBag', JSON.stringify(tilesInBag));
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
        add: async (handIndex) => {
            const tileClass = await takeTileFromBag(handIndex);
            console.log('tileClass', tileClass);
            if (tileClass != null) {
                refs.endTile.classList.remove('empty');
                refs.endTile.classList.add(tileClass);
            }
        },
        move: async () => {
            const tileClass = getColorShapeClass(refs.movingTile);

            let success;
            console.log(source.main, destination.main);
            if (source.main == 'hand' && destination.main == 'board') {
                success = await addCallBack({
                    action: 'placeTileOnBoard',
                    playerId,
                    handIndex: Number(refs.startTile.id.split('_')[1]),
                    boardCoord: (() => {
                        const coord = refs.endTile.id.split('_');
                        return { x: Number(coord[1]), y: Number(coord[2]) };
                    })(),
                });
            } else if (source.main == 'board' && destination.main == 'board') {
                success = await addCallBack({
                    action: 'moveTileOnBoard',
                    playerId,
                    boardCoordA: (() => {
                        const coord = refs.startTile.id.split('_');
                        return { x: Number(coord[1]), y: Number(coord[2]) };
                    })(),
                    boardCoordB: (() => {
                        const coord = refs.endTile.id.split('_');
                        return { x: Number(coord[1]), y: Number(coord[2]) };
                    })(),
                });
            } else if (source.main == 'board' && destination.main == 'hand') {
                success = await addCallBack({
                    action: 'takeTileFromBoard',
                    playerId,
                    handIndex: Number(refs.endTile.id.split('_')[1]),
                    boardCoord: (() => {
                        const coord = refs.startTile.id.split('_');
                        return { x: Number(coord[1]), y: Number(coord[2]) };
                    })(),
                });
            } else if (source.main == 'hand' && destination.main == 'hand') {
                success = await addCallBack({
                    action: 'swapTilesInHand',
                    playerId,
                    handIndexA: Number(refs.startTile.id.split('_')[1]),
                    handIndexB: Number(refs.endTile.id.split('_')[1]),
                });
            }

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
                        const handIndex = Number(refs.endTile.id.split('_')[1]);
                        // console.log('kk', refs.endTile.id.split('_')[1]);
                        await actions.add(handIndex);
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
                    // getColorShapeClass(refs.movingTile)
                    const handIndex = Number(refs.startTile.id.split('_')[1]);
                    const tile = await addTileToBag(handIndex);
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


const pointerDom = refs.table;
pointerDom.ontouchstart = (e) => {
    onPointerStart(e, getTouchXY);
}

pointerDom.onmousedown = (e) => {
    onPointerStart(e, getMouseXY);
}

pointerDom.ontouchmove = (e) => {
    onPointerMove(e, getTouchXY);
}

pointerDom.onmousemove = (e) => {
    onPointerMove(e, getMouseXY);
}

pointerDom.ontouchend = _ => {
    onPointerEnd();
}

pointerDom.onmouseup = _ => {
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

function clearBoard() { // clear board
    boardTiles = {};
    for (let x = 0; x < ntiles; x++) {
        for (let y = 0; y < ntiles; y++) {
            const ref = document.getElementById(`btile_${x}_${y}`);
            if (ref == null) continue;
            ref.classList.remove(...ref.classList);
            ref.classList.add('tile', 'empty');
        }
    }
}

function clearHand() { // clear hand
    userHands = [];
    for (let i = 0; i < 6; i++) {
        const ref = document.getElementById(`htile_${i}`);
        if (ref == null) continue;
        ref.classList.remove(...ref.classList);
        ref.classList.add('tile', 'empty');
    }
}

// function loadBoard() { // load board
//     const data = localStorage.getItem('boardTiles');
//     if (data != null) {
//         boardTiles = JSON.parse(data);
//         for (const [tileId, tileClass] of Object.entries(boardTiles)) {
//             const ref = document.getElementById(tileId);
//             ref.classList.remove('empty');
//             ref.classList.add(tileClass);
//         }
//     }
// }
// function loadHand() { // load hand
//     const data = localStorage.getItem('userHands');

//     if (data != null) {
//         userHands = JSON.parse(data);

//         let i = 0;
//         for (const tileClass of userHands) {
//             const ref = document.getElementById(`htile_${i}`);
//             ref.classList.remove('empty');
//             ref.classList.add(tileClass);
//             i++;
//         }

//     }
// }

{
    const ref = document.getElementById('refresh');

    ref.onclick = () => {
        clearBoard();
        clearHand();
        socketSend({ action: 'refresh' });
        // loadBoard();
        // loadHand();
    }

    // loadBoard();
    // loadHand();
}


// websocket

{
    const ref = document.getElementById('new');
    ref.onclick = () => {
        gameId = uuidv4();
        newGame();
        wsw.ws.close();
    }
}

{
    const ref = document.getElementById('connection');
    // console.log(ref.children[0]);
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
    socketSend({ action: 'joinGame', userId, gameId });

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




function addTileToHand(tileClass) {
    userHands.push(tileClass);
    // console.log('userHands', userHands);
    localStorage.setItem('userHands', JSON.stringify(userHands));
}

function removeTileFromHand(index) {

    // const index = userHands[callerId].indexOf(tileClass);
    if (index > -1) {
        userHands.splice(index, 1);
    } else {
        console.warn(`User does not have tile at index ${index}`);
    }
    // console.log('userHands', userHands);
    localStorage.setItem('userHands', JSON.stringify(userHands));
}



wsw.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    // const deltaTime = new Date().getTime() - data.time;
    console.log('socket message', data);

    // if (deltaTime > 500) {
    //     console.warn('socket message was received too late, ', deltaTime);
    //     return;
    // }

    switch (data.action) {
        case 'joinGame':
            playerId = data.playerId;
            console.log('Joined Game', playerId);
            clearBoard();
            clearHand();
            socketSend({ action: 'refresh' });
            break;
        case 'game': {
            if (playerId == undefined) break;
            const { tilebag, board, hands } = data.game;
            const hand = hands[playerId];
            for (let x = 0; x < ntiles; x++) {
                for (let y = 0; y < ntiles; y++) {
                    const ref = document.getElementById(`btile_${x}_${y}`);
                    if (ref == null) continue;
                    ref.classList.remove(...ref.classList);
                    ref.classList.add('tile');
                    const tileId = board[x + y * ntiles];
                    if (tileId != null) {
                        // console.log('board tile', x, y, tileIdToClass[tileId]);
                        ref.classList.add(tileIdToClass[tileId]);
                    } else {
                        ref.classList.add('empty');
                    }
                }
            }

            for (let i = 0; i < 6; i++) {
                const ref = document.getElementById(`htile_${i}`);
                if (ref == null) continue;
                ref.classList.remove(...ref.classList);
                ref.classList.add('tile');

                const tileId = hand[i];
                if (tileId != null) {
                    // console.log('tileIdToClass', tileIdToClass);
                    ref.classList.add(tileIdToClass[tileId]);
                } else {
                    ref.classList.add('empty');
                }
            }

            tilesInBag = tilebag;
            boardTiles = board;
            userHands = hands[playerId];
            updateTileBagCount();
            break;
        }
        case 'takeTileFromBag':
            if (data.success) {
                // console.log(tileIdToClass, data.tileId);
                const tile = tileIdToClass[data.tileId];
                // const tile = tilesInBag.pop();
                addTileToHand(tile);
                updateTileBagCount();
                callbackQueue[data.callbackId].resolve(tile);
            } else {
                callbackQueue[data.callbackId].resolve(null);
            }
            break;
        case 'putTileInBag':
            removeTileFromHand(data.handIndex);
            tilesInBag.splice(data.insertIndex, 0, data.tile);
            updateTileBagCount();
            if (data.success) {
                callbackQueue[data.callbackId].resolve(true);
            } else {
                callbackQueue[data.callbackId].resolve(null);
            }
            break;
        case 'placeTileOnBoard':
        case 'swapTilesInHand':
        case 'takeTileFromBoard':
        case 'moveTileOnBoard':
            if (data.success) {
                callbackQueue[data.callbackId].resolve(true);
            } else {
                callbackQueue[data.callbackId].resolve(null);
            }
            break;
        case 'moveTile':
            const { startTileId, endTileId, tileClass } = data;
            if (startTileId.startsWith('htile') && endTileId.startsWith('btile')) {
                // remove tile from hand
                removeTileFromHand(tileClass);
                boardTiles[endTileId] = tileClass;
            } else if (startTileId.startsWith('btile') && endTileId.startsWith('htile')) {
                // add tile to hand
                addTileToHand(tileClass);
                delete boardTiles[startTileId];
            } else if (startTileId.startsWith('btile') && endTileId.startsWith('btile')) {
                boardTiles[endTileId] = tileClass;
                delete boardTiles[startTileId];
            }

            localStorage.setItem('boardTiles', JSON.stringify(boardTiles));

            if (data.callerId == userId) {
                callbackQueue[data.callbackId].resolve(true);
            } else {
                console.log('moveTile', data);

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