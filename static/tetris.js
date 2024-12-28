const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
let isPaused = false;
let isTouchDevice = false;

context.scale(20, 20);
nextPieceContext.scale(20, 20);

// Tetromino shapes with modern colors
const SHAPES = {
    'I': {
        matrix: [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ],
        color: '#00f0f0'
    },
    'L': {
        matrix: [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ],
        color: '#f0a500'
    },
    'J': {
        matrix: [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ],
        color: '#0000f0'
    },
    'O': {
        matrix: [
            [4, 4],
            [4, 4],
        ],
        color: '#f0f000'
    },
    'Z': {
        matrix: [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ],
        color: '#f00000'
    },
    'S': {
        matrix: [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ],
        color: '#00f000'
    },
    'T': {
        matrix: [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ],
        color: '#a000f0'
    }
};

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let nextPiece = null;
let ghostPiece = { pos: { x: 0, y: 0 }, matrix: null };

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    color: null
};

const arena = createMatrix(12, 20);

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}
function resizeGame() {
    const gameBoard = document.querySelector('.game-board');
    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    
    canvas.width = boardWidth;
    canvas.height = boardHeight;
    
    canvasScale = Math.floor(boardWidth / 12); // 12 is the arena width
    context.scale(canvasScale, canvasScale);
    
    // Resize next piece canvas
    const nextPieceSize = Math.min(boardWidth * 0.4, 100);
    nextPieceCanvas.width = nextPieceSize;
    nextPieceCanvas.height = nextPieceSize;
    nextPieceContext.scale(nextPieceSize / 6, nextPieceSize / 6);
    
    draw();
}
function drawNext() {
    nextPieceContext.fillStyle = '#000';
    nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if (nextPiece) {
        const offset = {
            x: (5 - nextPiece.matrix[0].length) / 2,
            y: (5 - nextPiece.matrix.length) / 2
        };
        
        nextPiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(nextPieceContext, x + offset.x, y + offset.y, nextPiece.color);
                }
            });
        });
    }
}

function drawBlock(ctx, x, y, color) {
    // Main block
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
    
    // Highlight (top and left edges)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x, y, 1, 0.1);
    ctx.fillRect(x, y, 0.1, 1);
    
    // Shadow (bottom and right edges)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 0.9, y, 0.1, 1);
    ctx.fillRect(x, y + 0.9, 1, 0.1);
}

function drawGhost() {
    if (!player.matrix) return;
    
    // Copy player position to ghost
    ghostPiece.matrix = player.matrix;
    ghostPiece.pos.x = player.pos.x;
    ghostPiece.pos.y = player.pos.y;
    
    // Drop ghost piece to lowest possible position
    while (!collide(arena, ghostPiece)) {
        ghostPiece.pos.y++;
    }
    ghostPiece.pos.y--;
    
    // Draw ghost piece
    ghostPiece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = 'rgba(255, 255, 255, 0.2)';
                context.fillRect(x + ghostPiece.pos.x, y + ghostPiece.pos.y, 1, 1);
            }
        });
    });
}

function draw() {
    // Clear canvas
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid();
    
    // Draw ghost piece
    drawGhost();
    
    // Draw arena (placed pieces)
    arena.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(context, x, y, value);
            }
        });
    });
    
    // Draw active piece
    if (player.matrix) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(context, x + player.pos.x, y + player.pos.y, player.color);
                }
            });
        });
    }
}

function drawGrid() {
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.lineWidth = 0.05;

    // Vertical lines
    for (let i = 0; i <= arena[0].length; i++) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, arena.length);
        context.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= arena.length; i++) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(arena[0].length, i);
        context.stroke();
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = player.color;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
}

function playerMove(offset) {
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function getRandomPiece() {
    const pieces = 'ILJOTSZ';
    const piece = pieces[pieces.length * Math.random() | 0];
    return {
        matrix: SHAPES[piece].matrix,
        color: SHAPES[piece].color
    };
}

function playerReset() {
    if (!nextPiece) {
        nextPiece = getRandomPiece();
    }
    
    player.matrix = nextPiece.matrix;
    player.color = nextPiece.color;
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    nextPiece = getRandomPiece();
    drawNext();
    
    if (collide(arena, player)) {
        gameOver();
    }
}

function arenaSweep() {
    let rowCount = 1;
    let linesCleared = 0;
    
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        
        linesCleared++;
        score += rowCount * 100;
        rowCount *= 2;
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        linesElement.textContent = lines;
        
        // Level up every 10 lines
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel !== level) {
            level = newLevel;
            levelElement.textContent = level;
            dropInterval = Math.max(50, 1000 - (level - 1) * 50); // Speed up as level increases
        }
    }
}

function updateScore() {
    scoreElement.textContent = score;
}

function gameOver() {
    gameRunning = false;
    const finalScore = score;
    arena.forEach(row => row.fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    updateScore();
    levelElement.textContent = level;
    linesElement.textContent = lines;
    startButton.textContent = 'Start Game';
    alert(`Game Over! Final Score: ${finalScore}`);
}

function update(time = 0) {
    if (!gameRunning) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        score = 0;
        lines = 0;
        level = 1;
        updateScore();
        levelElement.textContent = level;
        linesElement.textContent = lines;
        arena.forEach(row => row.fill(0));
        playerReset();
        startButton.textContent = 'Reset Game';
        lastTime = 0;
        update();
    } else {
        gameRunning = false;
        gameOver();
    }
}

startButton.addEventListener('click', startGame);

document.addEventListener('keydown', event => {
    if (!gameRunning) return;

    switch (event.keyCode) {
        case 37: // Left arrow
            playerMove(-1);
            break;
        case 39: // Right arrow
            playerMove(1);
            break;
        case 40: // Down arrow
            playerDrop();
            break;
        case 38: // Up arrow
            playerRotate(1);
            break;
        case 32: // Space
            playerHardDrop();
            break;
    }
});