import * as ShapesIcons from "./ShapeIcons.js";

const refs = {
    btiles: document.getElementById("board-tiles"),
    htiles: document.getElementById("hand-tiles"),
    board: document.getElementById("board"),
    hand: document.getElementById("hand"),
    table: document.getElementById("table"),
    tileCount: document.getElementById("tile-count"),
    startTile: undefined,
    endTile: undefined,
    movingTile: undefined,
};

let tilesize = window.innerWidth / 8;
const ntiles = 41;

{ // build board
    for (let x = 0; x < ntiles; x++) {
        for (let y = 0; y < ntiles; y++) {
            const ref = CreateTile(['empty']);
            refs.btiles.appendChild(ref);
        }
    }
}

{ // build hand
    for (let i = 0; i < 6; i++) {
        const ref = CreateTile(['empty']);
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

const updateMovingTile = (ref, x, y) => {
    ref.style.left = x - tablePos.left - (tilesize / 2);
    ref.style.top = y - tablePos.top - (tilesize / 2);
}

const numEmptyHandSlots = () => refs.htiles.getElementsByClassName('empty').length;


const tilesInBag = (() => {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    const shapes = ['square', 'circle', 'diamond', 'asterisk', 'star', 'cross'];

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

// for (let i = 0; i < 105; i++) {
//     tilesInBag.pop();
// }

// console.log(tilesInBag);

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

document.ontouchstart = (e) => {
    const { x, y } = getTouchXY(e);
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
                const ref = initMoveTile(true);
                // const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
                // const shapes = ['square', 'circle', 'diamond', 'asterisk', 'star', 'cross'];
                // const rr = () => Math.floor(Math.random() * 6);
                // ref.classList.add(`cs-${colors[rr()]}-${shapes[rr()]}`);
                ref.classList.add(tilesInBag.pop());
                refs.tileCount.innerText = tilesInBag.length;

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

document.ontouchmove = (e) => {
    const { x, y } = getTouchXY(e);
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

const getColorShapeClass = (ref) => Array.from(ref.classList).find(obj => obj.startsWith('cs-'));

document.ontouchend = _ => {
    removeHovers();

    const actions = {
        move: () => {
            refs.endTile.classList.remove('empty');
            refs.endTile.classList.add(getColorShapeClass(refs.movingTile));
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
        console.log('end', getTileOwner(refs.endTile));
        const path = source.main + ' ' + destination.main;
        // console.log(path);
        switch (path) {
            case 'tilebag hand':
                if (destination.trait == 'slot') {
                    actions.move();
                } else {
                    console.log('here');
                    tilesInBag.push(getColorShapeClass(refs.movingTile));
                    refs.tileCount.innerText = tilesInBag.length;
                }
                break;
            case 'tilebag tilebag':
            case 'hand tilebag':
                tilesInBag.push(getColorShapeClass(refs.movingTile));
                refs.tileCount.innerText = tilesInBag.length;
                break;
            case 'hand board':
            case 'board hand':
            case 'board board':
                if (destination.trait == 'slot') {
                    actions.move();
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
                    actions.move();
                } else {
                    actions.swap();
                }
                break;
            default:
                break;
        }
        refs.movingTile.remove();
    }

    refs.startTile = null;
    refs.movingTile = null;
    refs.endTile = null;
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
        tilesize = Math.min(tilesize, refs.board.offsetWidth / 8);
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

        tilesize = Math.max(tilesize, Math.max(refs.board.offsetWidth, refs.board.offsetHeight) / ntiles);
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
