//check if a tile matches the value
var doesTileEqual = function(x, y, tile, grid){
    if(x >= 0 && x < grid[0].length && y >=0 && y < grid.length)
        return (grid[y][x] === tile) ? 1 : 0;
    else
        return 0;
}

//get how many of an adjacent tile their are
var getAdjacentTiles = function(x, y, tile, grid){
    //check tiles
    var numTiles = 0;
    numTiles += doesTileEqual(x+1, y+1, tile, grid);
    numTiles += doesTileEqual(x-1, y+1, tile, grid);
    numTiles += doesTileEqual(x+1, y-1, tile, grid);
    numTiles += doesTileEqual(x-1, y-1, tile, grid);
    numTiles += doesTileEqual(x+1, y, tile, grid);
    numTiles += doesTileEqual(x-1, y, tile, grid);
    numTiles += doesTileEqual(x, y+1, tile, grid);
    numTiles += doesTileEqual(x, y-1, tile, grid);
    return numTiles;
}

//generates a minesweeper puzzle
exports.genPuzzle = function(width, height, mines){
    //return null if arguments are bad
    if(width <= 3 || height <= 3 || (width * height) - 9 < mines)
        return null;


        
    var availableTiles = new Array();
    //generate initial grid
    var grid = new Array(height);
    for(var y = 0; y < height; y++){
        grid[y] = new Array(width);
        grid[y].fill('e');
    }

    //generate available tiles
    for(var y = 0; y < grid.length; y++){
        for(var x = 0; x < grid[0].length; x++){
            var pos = new Object();
            pos.x = x;
            pos.y = y;
            availableTiles.push(pos);
        }
    }

    //chose a "safe" tile
    var safeX = Math.floor(width / 2);
    var safeY = Math.floor(height / 2);

    grid[safeY][safeX] = 'c';
    
    //place random bombs
    for(var i = 0; i < mines; i++){
        //choose random x and y
        var index = Math.floor(Math.random() * availableTiles.length);
        var tile = availableTiles[index];
        //choose other tile if next to safe tile or too many bombs
        while(getAdjacentTiles(tile.x, tile.y, 'c', grid) > 0 || grid[tile.y][tile.x] == 'c' || grid[tile.y][tile.x] != 'e'){
            availableTiles.splice(index, 1);
            index = Math.floor(Math.random() * availableTiles.length);
            tile = availableTiles[index];
        }
        grid[tile.y][tile.x] = 'x';
    }

    //fill all other squares with numbers of how many adjacent mines
    for(var y = 0; y < height; y++){
        for(var x = 0; x < width; x++){
            if(grid[y][x] === 'e'){
                grid[y][x] = getAdjacentTiles(x, y, 'x', grid).toString();
            }
        }
    }

    return grid;
}

var revealTile = function(x, y, useful, knowns, grid){
    if(x >= 0 && x < grid[0].length && y >=0 && y < grid.length && knowns[y][x] === 'u'){
        knowns[y][x] = grid[y][x];
        if(grid[y][x] != 'x'){
            var xyPair = new Object();
            xyPair.x = x;
            xyPair.y = y;
            xyPair.value = grid[y][x];
            useful.push(xyPair);
        }
    }

    var returnObject = new Object();
    returnObject.useful = useful;
    returnObject.knowns = knowns;

    return returnObject;
}

var revealAdjacent = function(x, y, useful, knowns, grid){
    var returnObject = new Object();
    returnObject = revealTile(x+1, y+1, useful, knowns, grid);
    returnObject = revealTile(x-1, y+1, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x+1, y-1, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x-1, y-1, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x+1, y, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x-1, y, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x, y+1, returnObject.useful, returnObject.knowns, grid);
    returnObject = revealTile(x, y-1, returnObject.useful, returnObject.knowns, grid);

    return returnObject;
}

//checks if a puzzle is solvable
exports.verifyPuzzle = function(grid, numMines){
    //only verify if less than 25% mines (guessing at that point)
    if(numMines / (grid.length * grid[0].length) >= 0.25){
        return true;
    }

    //generate a grid of "known" values
    var knownGrid = new Array(grid.length);
    for(var y = 0; y < grid.length; y++){
        knownGrid[y] = new Array(grid[0].length);
        knownGrid[y].fill('u');
    }

    var foundMines = 0;
    var tilesToUse = new Array();

    //find center tile and reveal tiles around it
    for(var y = 0; y < grid.length; y++){
        var x = grid[y].indexOf('c');
        if(x != -1){
            //clear the tile
            knownGrid[y][x] = 'c';
            
            //reveal nearby tiles
            var adjacentObject = revealAdjacent(x, y, tilesToUse, knownGrid, grid);
            tilesToUse = adjacentObject.useful;
            knownGrid = adjacentObject.knowns;
            break;
        }
    }

    //go through useful tiles
    for(var i = 0; i < tilesToUse.length; i++){
        //do stuff if number
        if(!isNaN(tilesToUse[i].value)){
            var tileValue = parseInt(tilesToUse[i].value);
            var x = parseInt(tilesToUse[i].x);
            var y = parseInt(tilesToUse[i].y);

            //reveal all adjacent tiles if 0 then restart loop
            if(tileValue === 0){
                tilesToUse.splice(i, 1);
                var adjacentObject = revealAdjacent(x, y, tilesToUse, knownGrid, grid);
                tilesToUse = adjacentObject.useful;
                knownGrid = adjacentObject.knowns;
                i = -1;
            }else if(0 === getAdjacentTiles(x, y, 'u', knownGrid)){
                //remove tile if all adjacent tiles are known
                tilesToUse.splice(i, 1);
                i = -1;
            }else if(tileValue === (getAdjacentTiles(x, y, 'u', knownGrid) + getAdjacentTiles(x, y, 'x', knownGrid))){
                //mark tiles if num === hidden + known bombs
                var adjacentObject = revealAdjacent(x, y, tilesToUse, knownGrid, grid);
                tilesToUse = adjacentObject.useful;
                knownGrid = adjacentObject.knowns;
                i = -1;
            }else if(tileValue === getAdjacentTiles(x, y, 'x', knownGrid)){
                //reveal tiles if num === known bombs
                var adjacentObject = revealAdjacent(x, y, tilesToUse, knownGrid, grid);
                tilesToUse = adjacentObject.useful;
                knownGrid = adjacentObject.knowns;
                i = -1;
            }
        }
    }
    
    if(tilesToUse.length > 0){
        return false;
    }
    return true;
}