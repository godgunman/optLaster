fs = require('fs');

CURRENT_STACK = 0;
MAX_STACK = 5000;

MIN_SIZE = 0.1;
MAX_LEN = 60 / MIN_SIZE;

offset = 20.0;

line = [];
draw = [];
used = [];
queue = [];

/*
dx = [0, -1, 1, 0, 1, -1, -1, 1];
dy = [1, 0, 0, -1, -1, -1, 1, 1];
*/

dx = [-1, 1, 0, 0, 1, -1, -1, 1];
dy = [0, 0, -1, 1, -1, -1, 1, 1];

function init() {

    for (var i = 0 ; i < MAX_LEN; i++) {
        draw.push([]);
        used.push([]);
        for(var j = 0 ; j < MAX_LEN; j++) {
            draw[i].push(0);
            used[i].push(0);
        }
    }
    console.log('G28; home all axes');
    console.log('G21; Set units to millimeters');
    console.log('G90; Use absolute coordinates');
    console.log('G92; Coordinate Offset');
    console.log('G0 Z8.2 F10000');
}

init();

function lineToTable(x1, y1, x2, y2) {
//    console.log(x1, y1, x2, y2);

    var y = parseInt((y1 + offset)/MIN_SIZE);
    var x1 = parseInt((x1 + offset)/MIN_SIZE);
    var x2 = parseInt((x2 + offset)/MIN_SIZE);

    if (x2 < x1) tmp = x1, x1 = x2, x2 = tmp;

    for(var i = x1; i <= x2; i++) {
        draw[i][y] = 1;
        queue.push([i, y]);
    }
}

function tableToLine(x, y) {

}

function moveTo(x, y, s) {
    console.log('G1 X' + (x*MIN_SIZE).toFixed(4) + 
                ' Y' + (y*MIN_SIZE).toFixed(4) + ' F', s,
               ';' + x + ',' + y);
}

function printPathToGcode(path) {
    for (var i = 0; i < path.length; i++) {
        var x = path[i][0];
        var y = path[i][1];
        if (i == 0) {
            moveTo(x, y, 3000);
            console.log('M03; Laser ON');
        } else {
            moveTo(x, y, 200);
        }
        while( (i + 2 < path.length) ) {
            var x2 = path[i+1][0];
            var x3 = path[i+2][0];
            var y2 = path[i+1][1];
            var y3 = path[i+2][1];
            if ( (x === x2 && x2 === x3) || 
                 (y === y3 && y2 === y3)) {
                i++;
            } else {
                break;
            }
        }
    }
}

function find1Path(x, y) {
    var path = [];
    while(true) {
        path.push([x, y]);
        used[x][y] = 1;
        var i;
        for (i = 0; i < dx.length; i++) {
            var px = x + dx[i];
            var py = y + dy[i];
            if (used[px][py] != 1 &&
                draw[px][py] == 1) {
                x = px;
                y = py;
                break;
            }
        }   
        if (i == dx.length) break;
    }
    return path;
}

function getDist(x1, y1, x2, y2) {
    return (x1-x2) * (x1-x2) + (y1-y2) * (y1-y2);
}

function findAllPath() {
    var lastX = 0, lastY = 0;
    while (true) {
        var disMin = 100000;
        var minX = -1, minY = -1;
        for (var i = 0; i < queue.length; i++) {
            var x = queue[i][0], y = queue[i][1];
            if (used[x][y] != 1 && draw[x][y] == 1) {
                var d = getDist(x, y, lastX, lastY);
                if (d < disMin) {
                    disMin = d;
                    minX = x;
                    minY = y;
                }
            }
        }
        if (minX == -1 && minY == -1) 
            return;
        var path = find1Path(minX, minY);
        printPathToGcode(path);
        console.log('M05; Laser OFF');
        lastX = path[path.length - 1][0];
        lastY = path[path.length - 1][1];
    }
}

fs.readFile('O.gcode', 'utf8', function (err, data) {
    if (err) throw err;
    data = data.split("\n");
    data.forEach(function(d) {
        var indexOfComment = d.indexOf(';');
        if (indexOfComment != -1) {
            d = d.slice(0, d.indexOf(';'));
        }
        //        console.log(d);
        part = d.split(' ');
        if (part[0] === 'G1' && d.indexOf('X') !== -1 && d.indexOf('Y') !== -1) {

            x = parseFloat(part[1].slice(1));
            y = parseFloat(part[2].slice(1));
            line.push([x,y]);

        } else if (part[0] === 'G0' && d.indexOf('X') !== -1 && d.indexOf('Y') !== -1) {

            x = parseFloat(part[1].slice(1));
            y = parseFloat(part[2].slice(1));
            line.push([x,y]);
        }
    });
    for (var i = 0 ; i < line.length; i+=2) {
        var x1 = line[i][0];
        var y1 = line[i][1];
        var x2 = line[i+1][0];
        var y2 = line[i+1][1];
        lineToTable(x1, y1, x2, y2);
    }
    findAllPath();
});
