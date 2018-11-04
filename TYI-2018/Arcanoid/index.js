"use strict";

function loadImage(name) {
    var image = new Image()
    image.src = 'assets/images/' + name + '.png'
    return image
}

var img_tile1 = loadImage('tile1')
var img_tile2 = loadImage('tile2')
var img_tile3 = loadImage('tile3')
var img_tile4 = loadImage('tile4')
var img_tile_death = loadImage('death_tile')
var img_tiles = [img_tile1, img_tile2, img_tile3, img_tile4, img_tile_death]

var img_player1 = loadImage('arcanoid_lvl1')
var img_player2 = loadImage('arcanoid_lvl2')
var img_player3 = loadImage('arcanoid_lvl3')

var img_ball1 = loadImage('ball')
var img_ball2 = loadImage('ball2')
var img_ball3 = loadImage('ball3')

var img_background = loadImage('bckgrnd')
var img_background1 = loadImage('bg1')
var img_background2 = loadImage('bg2')
var img_background3 = loadImage('bg3')

var img_bonus_life = loadImage('life')
var img_bonus_ball = loadImage('mod_bigball')


var PI = Math.PI
var celem = document.getElementById('canvas')
/** @type {CanvasRenderingContext2D} */
var canvas = celem.getContext('2d')
var w, h
var mouseX = 0, mouseY = 0, mouseDown = null
var state = null
var stateData = null
var state2 = null
var editorState = null


var abs = Math.abs
var sqrt = Math.sqrt
var round = Math.round
var floor = Math.floor
var ceil = Math.ceil

function between(val, min, max) {
    return min <= val && val <= max;
}

function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val))
}

function deg(rad) {
    return rad * 180 / Math.PI
}

function rad(deg) {
    return deg / 180 * PI
}

function pow2(v) {
    return v * v
}

function collideY(r, x1, y1, x2) {
    var v = pow2(r) - pow2(x2 - x1)
    
    if (v < 0) {
        // return false;
        return null
    }

    // return true
    return sqrt(v) + y1
}

function collideX(r, x1, y1, y2) {
    var v = pow2(r) - pow2(y2 - y1)

    if (v < 0) {
        // return false
        return null;
    }

    // return true
    return sqrt(v) + x1
}

/* Variables */
var backgroundModel = img_background1
var caggleX = 0
var caggleWidth = 200
var caggleHeight = 20
var caggleModel = img_player1
var tiles = {}
var ball = {
    x: 500,
    y: 500,

    xaccel: 0.5,
    yaccel: 0.5,
    speed: 1,
    angle: -Math.PI / 4,

    model: img_ball1,
}
var bonuses = []
var tileSize = 60
var tileSizeY = 30
var ballRadius = 15
var levelName = null
var lifes = null
var looseTime = null
var winTime = null
var tilesCount = 0
var bigBallTime = null

{
    var states = document.querySelectorAll('#container>.state')
    for (var i = 0; i < states.length; ++i) {
        var state = states[i]
        var children = state.children
        for (var j = 0; j < children.length; ++j) {
            var child = children[j]
            var fn = function (event) {
                event.stopPropagation()
            };
            child.addEventListener('mousedown', fn)
            child.addEventListener('mousemove', fn)
            child.addEventListener('mouseup', fn)
        }
    }
}



ball.xaccel = Math.cos(ball.angle) * ball.speed
ball.yaccel = -Math.sin(ball.angle) * ball.speed

function newTile(x, y, type) {
    var tile = {
        x: x,
        y: y,
        type: type || 0,
    }
    var key = x + 'x' + y
    tiles[key] = tile
    if (tile.tile !== 4) {
        ++tilesCount
    }
}

function remTile(x, y) {
    var key = x + 'x' + y

    if (key in tiles) {
        var tile = tiles[key]
        delete tiles[key]

        if (tile.tile !== 4) {
            if (--tilesCount === 0) {
                nextLevel()
            }
        }
    }
}

function resize() {
    w = document.body.clientWidth
    h = document.body.clientHeight

    celem.width = w
    celem.height = h
    celem.style.width = w + 'px'
    celem.style.height = h + 'px'

    tileSize = w / 22
    tileSizeY = tileSize / 2
    caggleWidth = w / 6
}
window.onresize = resize
resize()

var t = Date.now()
var tl = Date.now()
var x = 0
function draw() {
    var now = Date.now()
    var time = now - t
    var diff = now - tl
    tl = now

    if (state === 'game' && state2 === 'playing') {
        // LOGIC
        ball.xaccel = Math.cos(ball.angle) * ball.speed
        ball.yaccel = -Math.sin(ball.angle) * ball.speed
        ball.x += ball.xaccel * diff
        ball.y += ball.yaccel * diff

        var caggleY = h - caggleHeight * 1.5
        if (ball.y + ballRadius > caggleY - caggleHeight / 2) {
            if (between(ball.x, caggleX - caggleWidth / 2, caggleX + caggleWidth / 2)) {
                ball.yaccel = -Math.abs(ball.yaccel)
                var xd = (ball.x - caggleX) / caggleWidth
                // var angle = Math.atan2(ball.yaccel, ball.xaccel)
                var angle = ball.angle
                var d = angle
                angle = -angle
                angle += -rad(Math.sign(xd) * xd * 45)
                // angle = rad(Math.sign(xd) * xd * 90) - Math.PI / 2
                angle = clamp(angle, rad(25), rad(180 - 25))
                ball.angle = angle
                
                // console.log("coll")
            } else {
                // console.log('loose')

                lifes -= 1
                looseTime = 2000
                ball.x = w / 2
                ball.y = h / 1.75
                state2 = 'wait'
                checkLifes()
            }
        }
        ball.xaccel = Math.cos(ball.angle) * ball.speed
        ball.yaccel = -Math.sin(ball.angle) * ball.speed
        if (ball.x <= ballRadius) {
            ball.xaccel = Math.abs(ball.xaccel)
        }
        if (ball.x >= w - ballRadius) {
            ball.xaccel = -Math.abs(ball.xaccel)
        }
        if (ball.y <= ballRadius) {
            ball.yaccel = Math.abs(ball.yaccel)
        }
        ball.angle = Math.atan2(-ball.yaccel, ball.xaccel)
        var hadCollision = false
        for (var key in tiles) {
            if (!tiles.hasOwnProperty(key)) {
                break;
            }
            var tile = tiles[key]

            var collided = false

            {
                var cx1 = collideX(ballRadius, ball.x, ball.y, tile.y * tileSize / 2) // top
                if (cx1 !== null && between(cx1, tile.x * tileSize, (tile.x + 1) * tileSize)) {
                    if (!hadCollision) ball.yaccel = -abs(ball.yaccel)
                    collided = true
                }
            }
            
            if (!collided) {
                var cx2 = collideX(ballRadius, ball.x, ball.y, (tile.y + 1) * tileSize / 2) // bottom

                if (cx2 !== null && between(cx2, tile.x * tileSize, (tile.x + 1) * tileSize)) {
                    if (!hadCollision) ball.yaccel = abs(ball.yaccel)
                    collided = true
                }
            }

            if (!collided) {
                var cy1 = collideY(ballRadius, ball.x, ball.y, tile.x * tileSize) // left

                if (cy1 !== null && between(cy1, tile.y * tileSizeY, (tile.y + 1) * tileSizeY)) {
                    if (!hadCollision) ball.xaccel = -abs(ball.xaccel)
                    collided = true
                }
            }

            if (!collided) {
                var cy2 = collideY(ballRadius, ball.x, ball.y, (tile.x + 1) * tileSize) // right

                if (cy1 !== null && between(cy2, tile.y * tileSizeY, (tile.y + 1) * tileSizeY)) {
                    if (!hadCollision) ball.xaccel = abs(ball.xaccel)
                    collided = true
                }
            }

            if (collided) {
                hadCollision = false

                if (Math.random() * 100 <= 10) {
                    if (Math.random() <= 0.5) {
                        bonuses.push({
                            image: img_bonus_life,
                            x: tile.x * tileSize,
                            y: tile.y * tileSizeY,
                            type: 'life',
                            xaccel: ball.xaccel * 0.01,
                            yaccel: ball.yaccel * 0.01,
                        })
                    } else {
                        bonuses.push({
                            image: img_bonus_ball,
                            x: tile.x * tileSize,
                            y: tile.y * tileSizeY,
                            type: 'bigball',
                            xaccel: ball.xaccel * 0.01,
                            yaccel: ball.yaccel * 0.01,
                        })
                    }
                }

                remTile(tile.x, tile.y)

                if (tile.type === 4) {
                    --lifes
                    checkLifes()
                }
            }
        }
        ball.angle = Math.atan2(-ball.yaccel, ball.xaccel)

        bonuses = bonuses.filter(function (bonus) {
            bonus.y += bonus.yaccel * diff
            bonus.x += bonus.xaccel * diff
            bonus.yaccel += 0.0009 * diff
            bonus.xaccel *= 0.001 * diff

            if (bonus.y > caggleY) {
                if (between(bonus.x, caggleX - caggleWidth / 2, caggleX + caggleWidth / 2)) {
                    if (bonus.type === 'life') {
                        ++lifes
                    } else if (bonus.type === 'bigball') {
                        ballRadius = 30
                        bigBallTime = 15000
                    }
                }

                return false
            }

            return true
        })
    }

    if (state === 'editor') {
        var x = floor(mouseX / tileSize)
        var y = floor(mouseY / tileSizeY)

        if (mouseDown === 0) {
            var key = x + 'x' + y
            editorState.tiles[key] = {
                x: x,
                y: y,
                tile: editorState.tile,
            }
            newTile(x, y, editorState.tile)
        } else if (mouseDown === 2) {
            remTile(x, y)
            var key = x + 'x' + y
            delete editorState.tiles[key]
        }
    }
    // /LOGIC

    canvas.clearRect(0, 0, w, h)
    canvas.save()
    canvas.drawImage(backgroundModel, 0, 0, w, h)

    if (state === 'game' && state !== 'loose') {
        canvas.save()
        canvas.translate(caggleX, caggleY)
        canvas.translate(-caggleWidth / 2, -caggleHeight / 2)
        canvas.drawImage(caggleModel, 0, 0, caggleWidth, caggleHeight)
        canvas.restore()
    }

    if (state === 'game' || state === 'editor') {
        for (var key in tiles) {
            if (!tiles.hasOwnProperty(key)) {
                break;
            }
            var tile = tiles[key]
            canvas.drawImage(img_tiles[tile.type], tile.x * tileSize, tile.y * tileSize / 2, tileSize, tileSize / 2)
        }

        bonuses.forEach(function (bonus) {
            canvas.drawImage(bonus.image, bonus.x, bonus.y, tileSizeY, tileSizeY)
        });
    }

    if ((state === 'game' && state !== 'wait') || state === 'editor') {
        canvas.save()
        canvas.translate(ball.x, ball.y)
        canvas.drawImage(ball.model, -ballRadius, -ballRadius, ballRadius * 2, ballRadius * 2)
        canvas.restore()
    }

    if (state === 'game' && state2 === 'playing') {
        canvas.strokeStyle = ""
        canvas.fillStyle = '#FFF'
        canvas.font = '20px Consolas'
        canvas.fillText("" + lifes, w - 80, h - 30)
    }

    if (looseTime && looseTime > 0) {
        if ((looseTime -= diff) <= 0) {
            if (state2 === 'loose') {
                switchState('menu')
            } else {
                state2 = 'playing'
            }
        }
        canvas.strokeStyle = ""
        canvas.fillStyle = '#FFF'
        canvas.font = '20px Consolas'
        canvas.fillText('-1', w / 2, h / 2)
    }

    if (winTime && winTime > 0) {
        if ((winTime -= diff) <= 0) {
            switchState('menu')
        }
        canvas.strokeStyle = ""
        canvas.fillStyle = '#FFF'
        canvas.font = '20px Consolas'
        canvas.fillText('Ви перемогли', w / 2, h / 2)
    }

    if (bigBallTime && bigBallTime > 0) {
        if ((bigBallTime - diff) <= 0) {
            ballRadius = 15
        }
        bigBallTime -= diff;
    }

    canvas.restore()
    requestAnimationFrame(draw)
}

function checkLifes() {
    if (lifes === 0) {
        state2 = 'loose'
        looseTime = 2000
    }
}

function nextLevel() {
    switch (stateData) {
        case 'easy':
            lifes = 5;
            break;
        case 'normal':
            lifes = 4;
            break;
        case 'hard':
            lifes = 3;
            break;
    }

    switch (levelName) {
        case 'level1':
            switchLevel('level2')
            break
        case 'level2':
            switchLevel('level3')
            break
        case 'level3':
            makeWin()
            break
    }
}

function makeWin() {
    winTime = 3000
}

requestAnimationFrame(draw)


function initLevel() {

}

function mousedown(e) {
    var x = e.pageX
    var y = e.pageY
    mouseX = x
    mouseY = y
    mouseDown = e.button
}

function mousemove(e) {
    var x = e.pageX
    var y = e.pageY
    mouseX = x
    mouseY = y

    caggleX = Math.min(w - caggleWidth / 1.9, Math.max(caggleWidth / 1.9, x))
}

function mouseup(e) {
    var x = e.pageX
    var y = e.pageY
    mouseX = x
    mouseY = y
    mouseDown = null

}


initLevel()



var levels = {
    'level1': {
        ball: 0,
        player: 0,
        background: 0,

        tiles: { "10x7": { "x": 10, "y": 7, "tile": 1 }, "11x6": { "x": 11, "y": 6, "tile": 1 }, "8x7": { "x": 8, "y": 7, "tile": 1 }, "8x8": { "x": 8, "y": 8, "tile": 1 }, "8x9": { "x": 8, "y": 9, "tile": 1 }, "8x10": { "x": 8, "y": 10, "tile": 1 }, "9x11": { "x": 9, "y": 11, "tile": 1 }, "10x12": { "x": 10, "y": 12, "tile": 1 }, "11x11": { "x": 11, "y": 11, "tile": 1 }, "12x10": { "x": 12, "y": 10, "tile": 1 }, "12x9": { "x": 12, "y": 9, "tile": 1 }, "12x8": { "x": 12, "y": 8, "tile": 1 }, "12x7": { "x": 12, "y": 7, "tile": 1 }, "10x6": { "x": 10, "y": 6, "tile": 4 }, "9x6": { "x": 9, "y": 6, "tile": 1 } },
    },

    'level2': {
        ball: 1,
        player: 1,
        background: 1,

        tiles: {"6x2":{"x":6,"y":2,"tile":2},"6x3":{"x":6,"y":3,"tile":2},"6x4":{"x":6,"y":4,"tile":2},"6x5":{"x":6,"y":5,"tile":2},"6x6":{"x":6,"y":6,"tile":2},"6x7":{"x":6,"y":7,"tile":2},"6x8":{"x":6,"y":8,"tile":2},"6x9":{"x":6,"y":9,"tile":2},"6x10":{"x":6,"y":10,"tile":2},"6x11":{"x":6,"y":11,"tile":2},"6x12":{"x":6,"y":12,"tile":2},"6x13":{"x":6,"y":13,"tile":2},"7x13":{"x":7,"y":13,"tile":2},"8x13":{"x":8,"y":13,"tile":2},"9x13":{"x":9,"y":13,"tile":2},"10x13":{"x":10,"y":13,"tile":2},"11x13":{"x":11,"y":13,"tile":2},"12x13":{"x":12,"y":13,"tile":2},"13x13":{"x":13,"y":13,"tile":2},"14x13":{"x":14,"y":13,"tile":2},"15x13":{"x":15,"y":13,"tile":2},"15x12":{"x":15,"y":12,"tile":2},"15x11":{"x":15,"y":11,"tile":2},"15x10":{"x":15,"y":10,"tile":2},"15x9":{"x":15,"y":9,"tile":2},"15x8":{"x":15,"y":8,"tile":2},"15x7":{"x":15,"y":7,"tile":2},"15x6":{"x":15,"y":6,"tile":2},"15x5":{"x":15,"y":5,"tile":2},"15x4":{"x":15,"y":4,"tile":2},"15x3":{"x":15,"y":3,"tile":2},"15x2":{"x":15,"y":2,"tile":2},"14x2":{"x":14,"y":2,"tile":2},"13x2":{"x":13,"y":2,"tile":2},"12x2":{"x":12,"y":2,"tile":2},"11x2":{"x":11,"y":2,"tile":2},"10x2":{"x":10,"y":2,"tile":2},"9x2":{"x":9,"y":2,"tile":2},"8x2":{"x":8,"y":2,"tile":2},"7x2":{"x":7,"y":2,"tile":2},"8x7":{"x":8,"y":7,"tile":1},"8x6":{"x":8,"y":6,"tile":1},"8x5":{"x":8,"y":5,"tile":1},"13x7":{"x":13,"y":7,"tile":1},"13x6":{"x":13,"y":6,"tile":1},"13x5":{"x":13,"y":5,"tile":1},"10x7":{"x":10,"y":7,"tile":4},"11x7":{"x":11,"y":7,"tile":4},"10x8":{"x":10,"y":8,"tile":4},"11x8":{"x":11,"y":8,"tile":4},"9x5":{"x":9,"y":5,"tile":3},"9x6":{"x":9,"y":6,"tile":3},"9x7":{"x":9,"y":7,"tile":3},"7x5":{"x":7,"y":5,"tile":3},"7x6":{"x":7,"y":6,"tile":3},"7x7":{"x":7,"y":7,"tile":3},"8x8":{"x":8,"y":8,"tile":3},"13x8":{"x":13,"y":8,"tile":3},"12x7":{"x":12,"y":7,"tile":3},"12x6":{"x":12,"y":6,"tile":3},"12x5":{"x":12,"y":5,"tile":3},"13x4":{"x":13,"y":4,"tile":3},"14x5":{"x":14,"y":5,"tile":3},"14x6":{"x":14,"y":6,"tile":3},"14x7":{"x":14,"y":7,"tile":3},"7x1":{"x":7,"y":1,"tile":2},"8x1":{"x":8,"y":1,"tile":2},"8x0":{"x":8,"y":0,"tile":2},"7x0":{"x":7,"y":0,"tile":2},"13x1":{"x":13,"y":1,"tile":2},"13x0":{"x":13,"y":0,"tile":2},"14x1":{"x":14,"y":1,"tile":2},"14x0":{"x":14,"y":0,"tile":2},"7x12":{"x":7,"y":12,"tile":2},"8x12":{"x":8,"y":12,"tile":2},"9x12":{"x":9,"y":12,"tile":2},"10x12":{"x":10,"y":12,"tile":2},"11x12":{"x":11,"y":12,"tile":2},"12x12":{"x":12,"y":12,"tile":2},"13x12":{"x":13,"y":12,"tile":2},"14x12":{"x":14,"y":12,"tile":2},"14x11":{"x":14,"y":11,"tile":2},"13x11":{"x":13,"y":11,"tile":2},"12x11":{"x":12,"y":11,"tile":2},"11x11":{"x":11,"y":11,"tile":2},"10x11":{"x":10,"y":11,"tile":2},"9x11":{"x":9,"y":11,"tile":2},"8x11":{"x":8,"y":11,"tile":2},"7x11":{"x":7,"y":11,"tile":2},"7x10":{"x":7,"y":10,"tile":2},"8x10":{"x":8,"y":10,"tile":2},"13x10":{"x":13,"y":10,"tile":2},"14x10":{"x":14,"y":10,"tile":2},"12x10":{"x":12,"y":10,"tile":0},"11x10":{"x":11,"y":10,"tile":0},"10x10":{"x":10,"y":10,"tile":0},"9x10":{"x":9,"y":10,"tile":0},"7x9":{"x":7,"y":9,"tile":2},"8x9":{"x":8,"y":9,"tile":2},"9x9":{"x":9,"y":9,"tile":2},"10x9":{"x":10,"y":9,"tile":2},"11x9":{"x":11,"y":9,"tile":2},"12x9":{"x":12,"y":9,"tile":2},"13x9":{"x":13,"y":9,"tile":2},"14x9":{"x":14,"y":9,"tile":2},"14x8":{"x":14,"y":8,"tile":2},"12x8":{"x":12,"y":8,"tile":2},"9x8":{"x":9,"y":8,"tile":2},"7x8":{"x":7,"y":8,"tile":2},"10x5":{"x":10,"y":5,"tile":2},"10x6":{"x":10,"y":6,"tile":2},"11x6":{"x":11,"y":6,"tile":2},"11x5":{"x":11,"y":5,"tile":2},"11x4":{"x":11,"y":4,"tile":2},"12x4":{"x":12,"y":4,"tile":2},"10x4":{"x":10,"y":4,"tile":2},"9x4":{"x":9,"y":4,"tile":2},"8x4":{"x":8,"y":4,"tile":3},"7x4":{"x":7,"y":4,"tile":2},"7x3":{"x":7,"y":3,"tile":2},"8x3":{"x":8,"y":3,"tile":2},"9x3":{"x":9,"y":3,"tile":2},"10x3":{"x":10,"y":3,"tile":2},"11x3":{"x":11,"y":3,"tile":2},"12x3":{"x":12,"y":3,"tile":2},"13x3":{"x":13,"y":3,"tile":2},"14x3":{"x":14,"y":3,"tile":2},"14x4":{"x":14,"y":4,"tile":2},"9x14":{"x":9,"y":14,"tile":2},"9x15":{"x":9,"y":15,"tile":2},"10x15":{"x":10,"y":15,"tile":2},"11x15":{"x":11,"y":15,"tile":2},"12x15":{"x":12,"y":15,"tile":2},"12x14":{"x":12,"y":14,"tile":2},"11x14":{"x":11,"y":14,"tile":2},"10x14":{"x":10,"y":14,"tile":2}},
    },

    'level3': {
        ball: 2,
        player: 2,
        background: 2,

        tiles: {"9x4":{"x":9,"y":4,"tile":1},"10x4":{"x":10,"y":4,"tile":1},"11x4":{"x":11,"y":4,"tile":1},"12x4":{"x":12,"y":4,"tile":1},"10x3":{"x":10,"y":3,"tile":1},"11x3":{"x":11,"y":3,"tile":1},"10x2":{"x":10,"y":2,"tile":1},"11x2":{"x":11,"y":2,"tile":1},"9x3":{"x":9,"y":3,"tile":1},"8x4":{"x":8,"y":4,"tile":1},"12x3":{"x":12,"y":3,"tile":1},"13x4":{"x":13,"y":4,"tile":1},"10x1":{"x":10,"y":1,"tile":2},"11x1":{"x":11,"y":1,"tile":2},"10x0":{"x":10,"y":0,"tile":2},"11x0":{"x":11,"y":0,"tile":2},"9x5":{"x":9,"y":5,"tile":4},"10x5":{"x":10,"y":5,"tile":4},"11x5":{"x":11,"y":5,"tile":4},"12x5":{"x":12,"y":5,"tile":4},"12x6":{"x":12,"y":6,"tile":4},"11x6":{"x":11,"y":6,"tile":4},"10x6":{"x":10,"y":6,"tile":4},"9x6":{"x":9,"y":6,"tile":4},"8x7":{"x":8,"y":7,"tile":3},"9x7":{"x":9,"y":7,"tile":3},"10x7":{"x":10,"y":7,"tile":3},"11x7":{"x":11,"y":7,"tile":3},"12x7":{"x":12,"y":7,"tile":3},"13x7":{"x":13,"y":7,"tile":3},"13x8":{"x":13,"y":8,"tile":3},"13x9":{"x":13,"y":9,"tile":3},"12x9":{"x":12,"y":9,"tile":3},"11x9":{"x":11,"y":9,"tile":3},"10x9":{"x":10,"y":9,"tile":3},"9x9":{"x":9,"y":9,"tile":3},"8x9":{"x":8,"y":9,"tile":3},"8x8":{"x":8,"y":8,"tile":3},"9x8":{"x":9,"y":8,"tile":3},"10x8":{"x":10,"y":8,"tile":3},"11x8":{"x":11,"y":8,"tile":3},"12x8":{"x":12,"y":8,"tile":3},"6x10":{"x":6,"y":10,"tile":2},"7x10":{"x":7,"y":10,"tile":2},"8x10":{"x":8,"y":10,"tile":2},"9x10":{"x":9,"y":10,"tile":2},"10x10":{"x":10,"y":10,"tile":2},"11x10":{"x":11,"y":10,"tile":2},"12x10":{"x":12,"y":10,"tile":2},"13x10":{"x":13,"y":10,"tile":2},"14x10":{"x":14,"y":10,"tile":2},"15x10":{"x":15,"y":10,"tile":2},"15x11":{"x":15,"y":11,"tile":2},"15x12":{"x":15,"y":12,"tile":2},"14x12":{"x":14,"y":12,"tile":2},"13x12":{"x":13,"y":12,"tile":2},"12x12":{"x":12,"y":12,"tile":2},"11x12":{"x":11,"y":12,"tile":2},"10x12":{"x":10,"y":12,"tile":2},"9x12":{"x":9,"y":12,"tile":2},"8x12":{"x":8,"y":12,"tile":2},"7x12":{"x":7,"y":12,"tile":2},"6x11":{"x":6,"y":11,"tile":2},"6x12":{"x":6,"y":12,"tile":2},"7x11":{"x":7,"y":11,"tile":2},"8x11":{"x":8,"y":11,"tile":2},"9x11":{"x":9,"y":11,"tile":2},"10x11":{"x":10,"y":11,"tile":2},"11x11":{"x":11,"y":11,"tile":2},"12x11":{"x":12,"y":11,"tile":2},"13x11":{"x":13,"y":11,"tile":2},"14x11":{"x":14,"y":11,"tile":2},"15x13":{"x":15,"y":13,"tile":2},"14x13":{"x":14,"y":13,"tile":2},"13x13":{"x":13,"y":13,"tile":2},"12x13":{"x":12,"y":13,"tile":2},"11x13":{"x":11,"y":13,"tile":2},"10x13":{"x":10,"y":13,"tile":2},"9x13":{"x":9,"y":13,"tile":2},"8x13":{"x":8,"y":13,"tile":2},"7x13":{"x":7,"y":13,"tile":2},"6x13":{"x":6,"y":13,"tile":2},"7x14":{"x":7,"y":14,"tile":2},"8x14":{"x":8,"y":14,"tile":2},"9x14":{"x":9,"y":14,"tile":2},"10x14":{"x":10,"y":14,"tile":2},"11x14":{"x":11,"y":14,"tile":2},"12x14":{"x":12,"y":14,"tile":2},"13x14":{"x":13,"y":14,"tile":2},"14x14":{"x":14,"y":14,"tile":2},"8x5":{"x":8,"y":5,"tile":3},"8x6":{"x":8,"y":6,"tile":3},"13x5":{"x":13,"y":5,"tile":3},"13x6":{"x":13,"y":6,"tile":3}},
    },
}

var editorLevel = {
    ball: 0,
    player: 0,
    background: 0,
    speed: 1,
    
    tiles: [],
}

function resetWorld() {
    tiles = {}
}

function switchLevel(name) {
    resetWorld()

    levelName = name
    var level = typeof name === 'string' ? levels[name] : name

    ball.model = [img_ball1, img_ball2, img_ball3][level.ball]
    caggleModel = [img_player1, img_player2, img_player3][level.player]
    backgroundModel = [img_background1, img_background2, img_background3][level.background]

    bonuses = []
    tilesCount = 0
    for (var i in level.tiles) {
        var tile = level.tiles[i]
        var key = tile.x + 'x' + tile.y
        if (key !== i) {
            console.warn('problem')
            continue;
        }
        if (tile.y === 0) {
            continue;
        }
        if (tile.x === 0) {
            continue;
        }
        newTile(tile.x, tile.y, tile.tile)
    }
    ball.x = w / 2
    ball.y = h / 1.75
}

function switchState(name, state_param) {
    if (state) {
        var el = document.getElementById("state_" + state)
        if (el) {
            el.style.display = 'none'
        }
    }

    state = name
    stateData = state_param
    var el = document.getElementById("state_" + name)
    el.style.display = "block"


    switch (state) {
    case 'game':
        state2 = 'playing'

        var el = document.getElementById('play-level-name')
        if (el.value && el.value !== '') {
            var localLevels = JSON.parse(localStorage.getItem('levels') || '{}')
            switchLevel(localLevels[el.value])
        } else {
            switchLevel('level1')
        }

        switch (stateData) {
            case 'easy':
                lifes = 5;
                ball.speed = 0.5
                break;
            case 'normal':
                lifes = 4;
                ball.speed = 0.7
                break;
            case 'hard':
                lifes = 3;
                ball.speed = 0.9
                break;
        }
        break;
    case 'editor':
        switchLevel(editorLevel)
        editorState = {
            tiles: {},
        }
        break;
    }
}

function editorSaveLevel(name) {
    var items = JSON.parse(localStorage.getItem('levels') || '{}')
    items[name] = {
        background: 0,
        player: 0,
        ball: 0,

        tiles: editorState.tiles,
    }
    localStorage.setItem('levels', JSON.stringify(items))
    updateLocalLevels()

    console.log(JSON.stringify(editorState.tiles))
}

function editorSetTile(type) {
    editorState.tile = type
}

function updateLocalLevels() {
    var select = document.getElementById('play-level-name')
    select.innerHTML = ''

    var el = document.createElement('option')
    el.innerText = 'Стандартні'
    el.value = ''
    select.appendChild(el)

    var localLevels = JSON.parse(localStorage.getItem('levels') || '{}')
    for (var name in localLevels) {
        if (!localLevels.hasOwnProperty(name)) {
            continue;
        }

        var el = document.createElement('option')
        el.innerText = name
        el.value = name
        select.appendChild(el)
    }
}

updateLocalLevels()
switchState('menu')
