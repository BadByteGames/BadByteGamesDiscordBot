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

exports.genPuzzle = function(width, height, mines){
    //generate initial grid
    var grid = new Array(height);
    for(var y = 0; y < width; y++){
        grid[y] = new Array(width);
        grid[y].fill('e');
    }

    //chose a "safe" tile
    var safeX = Math.floor(width / 2);
    var safeY = Math.floor(height / 2);

    grid[safeY][safeX] = 'c';
    
    //place random bombs
    for(var i = 0; i < mines; i++){
        //choose random x and y
        var tileX = Math.floor(Math.random() * (width-0.1));
        var tileY = Math.floor(Math.random() * (height-0.1));
        //choose other tile if next to safe tile or too many bombs
        while(getAdjacentTiles(tileX, tileY, 'c', grid) > 0 || getAdjacentTiles(tileX, tileY, 'x', grid) >= 3 || grid[tileY][tileX] != 'e'){
            tileX = Math.floor(Math.random() * (width-0.1));
            tileY = Math.floor(Math.random() * (height-0.1));
        }
        grid[tileY][tileX] = 'x';
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