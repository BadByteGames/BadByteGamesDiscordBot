//required libraries
const Discord = require("discord.js");
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
const shortid = require('shortid');

const userdatabase = new sqlite3.Database('userdata');
const app = express();

app.use(session({
    secret: 'shut up about it',
    resave: true,
    saveUninitialized: true,
    maxAge: 60 * 60 * 1000 // 1 hour
}));
app.use(express.static('public'));

//includes the minesweeper generator
const MineSweeper = require("./minesweeper");
//token file that stores bot token
const Token = require("./token.json");
const FriendlyMessages = require("./friendlymessages.json");

const client = new Discord.Client();

//important variables of knowledge
var sayIt = false;
var message = "";

//store ongoing lotteries
var lotteries = {};

//store ongoing poker games (might add them)
var pokerGames = {};

//finds a role id from a discord server and returns the role object
var findRole = function (guild, name){
    var role = null;
    role = guild.roles.find(val => val.name === name);
    return role;
}

//sends a formatted message to said channel
var sendFormatted = async function(channel, message){
    return new Promise(async function(resolve, reject){
        var richEmbed = new Discord.RichEmbed();
        //change to error if too long
        if(message.length >= 256){
            richEmbed.setTitle(`:x: One or more of the arguments was too long!`);
        }else{
            richEmbed.setTitle(message);
        }
        richEmbed.setColor('GREEN');
    
        var returnMessage = await channel.send(richEmbed);
        resolve(returnMessage);
    });
}

//generates a random deck from decks# deck
var generateDeck = function(decks){
    var baseSuit = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    var deck = [];

    for(var i = 0; i < (decks * 4); i++){
        deck = deck.concat(baseSuit);
    }
    
    return deck;
}

//validate the sql table and create it if necessary
var validateTable = function(){
    userdatabase.get('select name from sqlite_master where type=\'table\' and name=\'users\';', [], function(err, row){
        if(err != null){
            //error then quit
            console.log(err.message);
            process.exit();
        }else if(row === undefined){
            console.log("No users table exists! Users table created!");
            userdatabase.run('create table users(id integer primary key autoincrement not null, discord_id integer not null, blarts integer not null);');
        }
    });
}

//create an entry for the user
var createBlarts = async function(userid){
    //create an entry for the user since they don't exist
    userdatabase.run(`insert into users (discord_id, blarts) values(${userid}, 1);`);
}

var getBlarts = async function(user){
    //return the blarts of the user
    return new Promise(function(resolve, reject){
        userdatabase.get('select blarts from users where discord_id=?3;', {3: user.id}, function(err, row){
            if(err != null){
                console.log(err.message);
                resolve(err.message);
            }else if(row != undefined){
                resolve(row.blarts);
            }else{
                createBlarts(user.id);
                resolve(1);
            }
        })
    });
}

var setBlarts = async function(user, value){
    //return the blarts of the user
    return new Promise(function(resolve, reject){
        userdatabase.get('update users set blarts=?2 where discord_id=?3;', {2:value, 3: user.id}, function(err, row){
            if(err != null){
                console.log(err.message);
                resolve(err.message);
            }else{
                resolve(value);
            }
        })
    });
}

// Authentication and Authorization Middleware
var auth = function(req, res, next) {
    if (req.session && req.session.user === "admin" && req.session.admin)
        return next();
    else
        return res.redirect('/');
};

//GET index
app.get(['/', '/index.html', '/index'], function (req, res) {
    //render the login page
    if(!req.query.username || !req.query.password){
        res.send(nunjucks.render('./views/index.html', {message :''}));
    }else if(req.query.username === "admin" && req.query.password === Token.password) {
        req.session.user = "admin";
        req.session.admin = true;
        console.log(`${req.ip} logged into the admin panel`);
        res.redirect('admin_panel');
    }else{
        res.send(nunjucks.render('./views/index.html', {message :'Either your username or password was incorrect!'}));
    }
});

//get the admin panel
app.get(['/admin_panel','/admin_panel.html'], auth, function(req, res){
    if(!req.query.sql && !req.query.say){
        //render the admin page if no sql command is given
        res.send(nunjucks.render('./views/admin_panel.html', {responsemessage: `I will say \'${message}\'`, egg : sayIt ? "I'm gonna say it!" : ""}));
    }
    if(req.query.sql){
        //run the sql command then render the admin_panel
        userdatabase.all(req.query.sql, function(err, rows){
            console.log(`${req.query.sql} was run by ${req.ip}`);

            var content = '';

            if(err){
                content += err.message;
                content += '\n';
            }

            if(rows != null && rows != undefined && rows.length >= 1){
                content += JSON.stringify(rows);
                content += '\n';
            }

            if(content === ''){
                res.send(nunjucks.render('./views/admin_panel.html', {responsemessage: `I will say \'${message}\'`, sqlmessage: 'Your command has been run!', egg : sayIt ? "I'm gonna say it!" : ""}));
            }else{
                res.send(nunjucks.render('./views/admin_panel.html', {responsemessage: `I will say \'${message}\'`, sqlmessage: content, egg : sayIt ? "I'm gonna say it!" : ""}));
            }
        });
    }
    if(req.query.say){
        message = req.query.say;
        res.send(nunjucks.render('./views/admin_panel.html', {responsemessage: `I will say \'${message}\'`, egg : sayIt ? "I'm gonna say it!" : ""}));
    }
});

// Toggle egg
app.get('/toggleegg', auth, function (req, res) {
    sayIt = !sayIt;
    res.redirect("/admin_panel");
});

// Logout endpoint
app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect("/");
});

//404 page
app.use(function(req, res, next){
    res.status(404);
  
    // respond with html page
    if (req.accepts('html')) {
      res.send(nunjucks.render('./views/notfound.html', { url: req.url }));
      return;
    }
  
    // respond with json
    if (req.accepts('json')) {
      res.send({ error: 'Not found' });
      return;
    }
  
    // default to plain-text. send()
    res.type('txt').send('Not found');
});

app.listen(3000);

//add events
client.on('ready', () => {
    client.user.setActivity("--help");
    console.log(`Bot logged in as ${client.user.tag}!`);
    validateTable();
});

//add roles when user joins
client.on('guildMemberAdd', member => {
    const streamRole = findRole(member.guild, 'streamnotify');
    if(streamRole === null){
        return;
    }
    member.addRole(streamRole);
});

//handle upvotes if the message isn't older than 1 hour
client.on('messageReactionAdd', async (reaction, user) =>{
    var time = (client.readyTimestamp + client.uptime) - reaction.message.createdTimestamp;

    if(reaction.emoji.name === '👍' && user != reaction.message.author && time < 1000 * 60 * 60 && !reaction.message.author.bot && !user.bot){
        //give them a blart
        var blarts = await getBlarts(reaction.message.author) + 1;

        setBlarts(reaction.message.author, blarts);
    }
});

client.on('messageReactionRemove', async (reaction, user) =>{
    var time = (client.readyTimestamp + client.uptime) - reaction.message.createdTimestamp;

    if(reaction.emoji.name === '👍' && user != reaction.message.author && time < 1000 * 60 * 60 && !reaction.message.author.bot && !user.bot){
        //take away a blart
        var blarts = await getBlarts(reaction.message.author) - 1;

        setBlarts(reaction.message.author, blarts);
    }
});

//command handling
client.on('message', async clientMessage => {
    if(clientMessage.author.bot || clientMessage.channel.type != 'text')
        return;

    if(message != ""){
        //say the thing
        clientMessage.channel.send(message);
        message = "";
    }

    const msg = clientMessage.content;

    //respond with 'die' if pinged
    if(clientMessage.isMentioned(client.user)){
        clientMessage.channel.send("die");
    }

    //send uno reverse card
    if(msg.toLocaleLowerCase() === "no u"){
        clientMessage.channel.send({
            files:[{
                attachment:"./uno.png",
                name:"uno.png"
            }]
        });
    }

    //send swastika if no u in german with a 1/5 chance
    if(msg.toLocaleLowerCase() === "nein du"){
        if(Math.floor(Math.random()*5) === 3){
            clientMessage.channel.send({
                files:["https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Flag_of_German_Reich_1935%E2%80%931945_%28reverse%29.svg/1200px-Flag_of_German_Reich_1935%E2%80%931945_%28reverse%29.svg.png"]
            });
        }else{
            clientMessage.channel.send({
                files:[{
                    attachment:"./uno.png",
                    name:"uno.png"
                }]
            });
        }
    }

    //%10 chance to reply with a friendly message to NoiseGenerator
    if(clientMessage.author.id === "345633153781596160" && Math.floor(Math.random()*10) == 7){
        messages = FriendlyMessages.friendly.concat(FriendlyMessages.reallyfriendly);

        clientMessage.channel.send(messages[Math.floor(Math.random()*messages.length)]);
    }

    //%0.1 chance to destroy somebody
    if(Math.floor(Math.random()*1000) === 50 || sayIt){
        sayIt = false;
        clientMessage.channel.send({
            files:[{
                attachment:"./gatem.png",
                name:"gatem.png"
            }]
        });
    }

    //%20 chance to say a dad joke
    const messageWords = msg.split(" ");
    
    if(Math.floor(Math.random()*5) === 3){
        if(messageWords.length > 2 && messageWords[0] === 'I'  && messageWords[1] === 'am'){
            if(messageWords.length > 11){
                clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
            }else{
                clientMessage.channel.send(`Hi ${messageWords.slice(2).join(' ')}, I\'m ${client.user.username}!`);
            }
        }else if(messageWords.length > 1 && ((messageWords[0] === 'I\'m') || (messageWords[0] === 'Im')) ){
            if(messageWords.length > 10){
                clientMessage.channel.send(`Hi ${messageWords[1]}, I\'m ${client.user.username}!`);
            }else{
                clientMessage.channel.send(`Hi ${messageWords.slice(1).join(' ')}, I\'m ${client.user.username}!`);
            }
        }
    }

    //return if msg is not a command
    if(!msg.startsWith("--"))
        return;

    //generate arguments list
    const args = msg.substring(2).split(" ");

    //remove any args that are null
    for(var arg = 0; arg < args.length; arg++){
        if(args[arg] === ''){
            //remove the argument
            args.splice(arg, 1);

            //restart
            arg = 0;
        }
    }

    const command = args[0];

    if(command === "help"){
        clientMessage.channel.startTyping();
		sendFormatted(clientMessage.channel, "Command list sent to direct messages");
        var helpRichEmbed = new Discord.RichEmbed();
        helpRichEmbed.setTitle("Here is a list of commands:");
        helpRichEmbed.setDescription("(I also assist in conversations with good stuff)");
        helpRichEmbed.addField("--help","sends a list of commands");
        helpRichEmbed.addField("--subscribe <stream>","subscribes to a notification stream");
        helpRichEmbed.addField("--unsubscribe <stream>","unsubscribes from a notification stream");
        helpRichEmbed.addField("--givehelp","gives helpful advice for when you are going through a tough time");
        helpRichEmbed.addField("--ping","get the time it takes for the bot to recieve your message in ms");
        helpRichEmbed.addField("--rtd <min> <max>","rolls a number in the range min-max");
        helpRichEmbed.addField("--minesweeper [rows] [columns] [mines]","generates a spoiler-tag base game of minesweeper");
        helpRichEmbed.addField("--phil","Dr. Phil");
        helpRichEmbed.addField("--bruh","reveals that the last message was a bruh moment");
        helpRichEmbed.addField("--blarts [username]", "tells how many blarts you or the specified user has which can be earned by getting thumbs up reactions on your messages");
        helpRichEmbed.addField("--betmyblarts <number>", "flips a coin to chance doubling blarts or lose them");
        helpRichEmbed.addField("--lottery <time in minutes> <minbet> <maxbet>", "starts a lottery with the given parameters");
        helpRichEmbed.addField("--giveblarts <amount> <user>", "pays the specified user the specified amount from your blart stash");
        helpRichEmbed.addField("--blackjack <number>", "starts a round of blackjack with the number of blarts as your bet");
        helpRichEmbed.setColor('GREEN');

        clientMessage.author.send(helpRichEmbed);
    }else if(command === "subscribe"){
        //subscribe to a notification stream
        if(args.length === 2){
            const guildAuthor = clientMessage.guild.member(clientMessage.author);

            if(args[1] === 'streams'){
                const streamRole = findRole(clientMessage.guild, 'streamnotify');
                if(streamRole === null){
                    sendFormatted(clientMessage.channel, ':x: \` streamnotify \` is not a role on this server');
                }else{
                    guildAuthor.addRole(streamRole);

                    sendFormatted(clientMessage.channel, ':mega: You are now subscribed to streams!');
                }
            }else{
                sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
            }
        }else{
            sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
        }
    }else if(command === "unsubscribe"){
        clientMessage.channel.startTyping();
        //unsubscribe from a notification stream
        if(args.length === 2){
            const guildAuthor = clientMessage.guild.member(clientMessage.author);
            
            if(args[1] === 'streams'){
                const streamRole = findRole(clientMessage.guild, 'streamnotify');
                if(streamRole === null){
                    sendFormatted(clientMessage.channel, ':x: \` streamnotify \` is not a role on this server');
                }else{
                    guildAuthor.removeRole(streamRole);

                    sendFormatted(clientMessage.channel, ':mega: You are now unsubscribed from streams!');
                }
            }else{
                sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
            }
        }else{
            sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
        }
    }else if(command === "givehelp"){
        clientMessage.channel.startTyping();
        messages = FriendlyMessages.friendly;
        
        sendFormatted(clientMessage.channel, `:thumbsup: ${messages[Math.floor(Math.random()*messages.length)]} :thumbsup:`);
        
    }else if(command === "ping"){
        clientMessage.channel.startTyping();
        var time = (client.readyTimestamp + client.uptime) - clientMessage.createdTimestamp;
        //calculate the time it takes to recieve the message in ms
        sendFormatted(clientMessage.channel, `:ping_pong: Pong! Message recieved in ${time} ms`);
    }else if(command === "rtd"){
        clientMessage.channel.startTyping();
        if(args.length > 2){
            if(!isNaN(args[1]) && !isNaN(args[2])){
                sendFormatted(clientMessage.channel, `:game_die: You rolled: ${Math.floor(Math.random()*(parseInt(args[2]) - parseInt(args[1])))+parseInt(args[1])}`);
            }else{
                sendFormatted(clientMessage.channel,`:x: Please specify a min and a max number! \` --args <min> <max>\``);
            }
        }else{
            sendFormatted(clientMessage.channel,`:x: Please specify a min and a max number! \` --args <min> <max>\``);
        }
    }else if(command === "minesweeper" || command === "ms"){
        clientMessage.channel.startTyping();
        var grid = null;

        var width = 9;
        var height = 9;
        var mines = 10;

        //go through all the numbers
        if(args.length >= 2){
            //custom arguments
            if(!isNaN(args[1])){
                width = parseInt(args[1]);
                if(width <= 3 || width > 20){
                    sendFormatted(clientMessage.channel,`:x: ${width} is not between 4 and 20!`);
                    clientMessage.channel.stopTyping();
                    return;
                }

                if(args.length >= 3 && !isNaN(args[2])){
                    height = parseInt(args[2]);
                    if(height <= 3 || height > 20){
                        sendFormatted(clientMessage.channel,`:x: ${height} is not between 4 and 20!`);
                        clientMessage.channel.stopTyping();
                        return;
                    }
    
                }else if(args.length >= 3){
                    sendFormatted(clientMessage.channel,`:x: ${args[2]} is not a number!`);
                    clientMessage.channel.stopTyping();
                    return;
                }

                //generate a number of mines if not specified
                if(args.length >= 4 && !isNaN(args[3])){
                    mines = Math.floor(parseInt(args[3]));
                    if((width * height) - 9 < mines){
                        sendFormatted(clientMessage.channel,`:x: The number of mines is not less than or equal to ${width * height - 9}!`);
                        clientMessage.channel.stopTyping();
                        return;
                    }else if(mines < 0){
                        sendFormatted(clientMessage.channel,`:x: The number of mines is less than 0!`);
                        clientMessage.channel.stopTyping();
                        return;
                    }
    
                }else if(args.length >= 4){
                    sendFormatted(clientMessage.channel,`:x: ${args[3]} is not a number!`);
                    clientMessage.channel.stopTyping();
                    return;
                }else{
                    //generate a number of mines
                    mines = Math.floor((width * height - 1) / 8);
                }

            }else{
                sendFormatted(clientMessage.channel,`:x: ${args[1]} is not a number!`);
                clientMessage.channel.stopTyping();
                return;
            }
        }
        
        grid = MineSweeper.genPuzzle(width, height, mines);
        while(!MineSweeper.verifyPuzzle(grid, mines)){
            grid = MineSweeper.genPuzzle(width, height, mines);
        }


        if(grid === null){
            sendFormatted(clientMessage.channel, `:x: Something went wrong with the minesweeper grid generation!`);
            clientMessage.channel.stopTyping();
            return;
        }

        //make it a message
        var msRichEmbed = new Discord.RichEmbed();
        msRichEmbed.setColor('GREEN');
        
        //let user know if verified
        var verified = true;
        if(mines / (grid.length * grid[0].length) > 0.25){
            verified = false;
        }

        msRichEmbed.setTitle(":bomb: The numbers correspond to how many adjacent mines there are. Click on spoilers to reveal the tiles!");
        msRichEmbed.setDescription(width + " x " + height + " :bomb: Number of Mines: " + mines + " :bomb: Guaranteed Solvable: " + (verified ? "Yes" : "Unknown (higher than 25% mines)"));
        for(var y = 0; y < grid.length; y++){
            var rowTitle = '';
            for(var x = 0; x < grid[0].length; x++){
                if(grid[y][x] === 'c'){
                    rowTitle+=':zero:';
                }else if(grid[y][x] === 'x'){
                    rowTitle+='||:bomb:||';
                }else if(grid[y][x] === '0'){
                    rowTitle+='||:zero:||';
                }else if(grid[y][x] === '1'){
                    rowTitle+='||:one:||';
                }else if(grid[y][x] === '2'){
                    rowTitle+='||:two:||';
                }else if(grid[y][x] === '3'){
                    rowTitle+='||:three:||';
                }else if(grid[y][x] === '4'){
                    rowTitle+='||:four:||';
                }else if(grid[y][x] === '5'){
                    rowTitle+='||:five:||';
                }else if(grid[y][x] === '6'){
                    rowTitle+='||:six:||';
                }else if(grid[y][x] === '7'){
                    rowTitle+='||:seven:||';
                }else if(grid[y][x] === '8'){
                    rowTitle+='||:eight:||';
                }
            }
            
            y++;
            if(y < grid.length){
                var row = '';
                for(var x = 0; x < grid[0].length; x++){
                    if(grid[y][x] === 'c'){
                        row+=':zero:';
                    }else if(grid[y][x] === 'x'){
                        row+='||:bomb:||';
                    }else if(grid[y][x] === '0'){
                        row+='||:zero:||';
                    }else if(grid[y][x] === '1'){
                        row+='||:one:||';
                    }else if(grid[y][x] === '2'){
                        row+='||:two:||';
                    }else if(grid[y][x] === '3'){
                        row+='||:three:||';
                    }else if(grid[y][x] === '4'){
                        row+='||:four:||';
                    }else if(grid[y][x] === '5'){
                        row+='||:five:||';
                    }else if(grid[y][x] === '6'){
                        row+='||:six:||';
                    }else if(grid[y][x] === '7'){
                        row+='||:seven:||';
                    }else if(grid[y][x] === '8'){
                        row+='||:eight:||';
                    }
                }
                msRichEmbed.addField(rowTitle,row);
            }else{
                msRichEmbed.addField(rowTitle, 'Enjoy!');
            }
            
        }

        clientMessage.channel.send(msRichEmbed);
    }else if(command === "phil"){
        clientMessage.channel.startTyping();
        clientMessage.delete();
        await clientMessage.channel.send({
            files: [{
                attachment: './Point.png',
                name: 'Point.png'
            }]
        });
        await clientMessage.channel.send("Shut the hell up bitch.");
        await clientMessage.channel.send({
            files: [{
                attachment: './shrug.png',
                name: 'shrug.png'
            }]
        });
        await clientMessage.channel.send("Go kill yourself. Go sit in the middle of the road and let a car run over you.");
        await clientMessage.channel.send({
            files: [{
                attachment: './phil.jpg',
                name: 'phil.jpg'
            }]
        });
        await clientMessage.channel.send("You are ugly. You are disgusting. I'm going to kill you.");
        await clientMessage.channel.send({
            files: [{
                attachment: './philtalk.jpg',
                name: 'philtalk.jpg'
            }]
        });
        await clientMessage.channel.send("You're an alcoholic.");
    }else if(command === "bruh"){
        clientMessage.channel.startTyping();
        //BRUHH
        var messages = await clientMessage.channel.fetchMessages({limit: 2});

        clientMessage.delete();

        if(!messages.last().author.bot){
            sendFormatted(clientMessage.channel, `:thinking: BRUH MOMENT: ${messages.last().author.username} said \"${messages.last().content}\"`);
        }else{
            sendFormatted(clientMessage.channel, `:thinking: You can't bruh a bot!`);
        }
    }else if(command === "blarts"){
        if(args.length >= 2){
            //check for username
            var name = args.splice(1).join(" ");
            var guildmembers = await clientMessage.guild.members;
            var guildmember = guildmembers.find( val => val.user.username === name);
            var user = guildmember != null ? guildmember.user : null;


            if(user != null){
                if(user.bot){
                    sendFormatted(clientMessage.channel, `:credit_card: ${user.username} has infinite blarts!`);
                }else{
                    var blarts = await getBlarts(user);
                    sendFormatted(clientMessage.channel, `:credit_card: ${user.username} has ${blarts} blarts!`);
                }
            }else{
                sendFormatted(clientMessage.channel, `:x: Failed to find a user called ${name}!`);
            }
        }else{
           var blarts = await getBlarts(clientMessage.author);
           sendFormatted(clientMessage.channel, `:credit_card: You have ${blarts} blarts!`);
        }
    }else if(command === "betmyblarts"){
        if(args.length >= 2){
            //the user bet their blarts that vegas has bees
            if(!isNaN(args[1])){
                var blartNum = Math.floor(parseInt(args[1]));

                var userblarts = await getBlarts(clientMessage.author);
                if(blartNum <= 0){
                    sendFormatted(clientMessage.channel, ':x: You need to bet 1 or more blarts!');
                }else if(blartNum > userblarts){
                    sendFormatted(clientMessage.channel, ':x: You don\'t have that many blarts to bet!');
                }else{
                    //flip a coin to determine their victory
                    if(Math.floor(Math.random()*2) === 1){
                        userblarts += blartNum;
                        sendFormatted(clientMessage.channel, `:game_die: You bet your blarts that vegas had bees and won. Current balance: ${userblarts}`);
                    }else{
                        userblarts -= blartNum;
                        sendFormatted(clientMessage.channel, `:game_die: You bet your blarts but vegas did not have bees. Current balance: ${userblarts}`);
                    }

                    //update their blarts
                    setBlarts(clientMessage.author, userblarts);
                }
            }else{
                sendFormatted(clientMessage.channel, ':x: You need to specify a number!');
            }
        }else{
            sendFormatted(clientMessage.channel, ':x: You need to specify how many blarts to bet!');
        }
    }else if(command === "lottery"){
        if(args.length >= 4){
            //the user bet their blarts that vegas has bees
            if(!isNaN(args[1]) && !isNaN(args[2]) && !isNaN(args[3])){
                var time = Math.floor(parseInt(args[1]));
                var minbet = Math.floor(parseInt(args[2]));
                var maxbet = Math.floor(parseInt(args[3]));
                if(time <= 0 || time > 15){
                    sendFormatted(clientMessage.channel, ':x: You need to specify a time between 1 and 15!');
                }else if(minbet <= 0){
                    sendFormatted(clientMessage.channel, ':x: You need to specify a minbet above 0!');
                }else if(maxbet <= minbet){
                    sendFormatted(clientMessage.channel, ':x: You need to specify a maxbet above the minbet!');
                }else{
                    //generate a uuid for the lottery
                    var lotteryId = shortid.generate();
                    sendFormatted(clientMessage.channel, `:ticket: Type \`--joinlottery ${lotteryId} <blarts>\` to join the lottery`);
                    const filter = m => { return m.content.startsWith(`--joinlottery ${lotteryId}`);}
                    const collector = clientMessage.channel.createMessageCollector(filter, { time: time * 60 * 1000 });

                    lotteries[lotteryId] = new Object();

                    collector.on('collect', async m => {
                        //parse if the individual joined the lottery and they aren't already in it
                        var lotteryArgs = m.content.split(" ");
                        if(lotteryArgs.length < 3){
                            sendFormatted(clientMessage.channel, ':x: You need to specify how many blarts you are investing!');
                        }else if(lotteries[lotteryId][m.author.id]){
                            sendFormatted(clientMessage.channel, ':x: You are already in the lottery!');
                        }else{
                            if(!isNaN(lotteryArgs[2])){
                                var blartNum = Math.floor(parseInt(lotteryArgs[2]));

                                var userblarts = await getBlarts(m.author);
                                if(blartNum < minbet || blartNum > maxbet){
                                    sendFormatted(clientMessage.channel, ':x: You need to specify an amount in the bet range!');
                                }else if(blartNum > userblarts){
                                    sendFormatted(clientMessage.channel, ':x: You don\'t have that many blarts to bet!');
                                }else{
                                    //join the lottery with blartNum lots
                                    lotteries[lotteryId][m.author.id] = blartNum;

                                    sendFormatted(clientMessage.channel, `:ticket: You joined the lottery with ${blartNum} blarts!`);

                                    //update their blarts
                                    setBlarts(m.author, userblarts - blartNum);
                                }
                            }else{
                                sendFormatted(clientMessage.channel, ':x: You need to specify a number!');
                            }
                        }
                    });

                    collector.on('end', async collected =>{
                        //calculate the winner
                        var members = lotteries[lotteryId];

                        if(Object.keys(members).length >= 1){
                            var lots = [];

                            for(var member in members){
                                //add one lot for every blart
                                for(var i = 0; i < members[member]; i++){
                                    lots.push(member);
                                }
                            }

                            //choose a random lot to win
                            var winner = lots[Math.floor(Math.random()*lots.length)];

                            //get the discord user
                            var winnerUser = client.users.find( val => val.id === winner);
                            sendFormatted(clientMessage.channel, `:ticket: ${winnerUser.username} won lottery ${lotteryId} with the jackpot of ${lots.length}!`);

                            var userblarts = await getBlarts(winnerUser);

                            setBlarts(winnerUser, userblarts + lots.length);
                        }else{
                            sendFormatted(clientMessage.channel, `:ticket: Lottery ${lotteryId} over but no users joined!`);
                        }
                        
                        //empty that lotteryId
                        lotteries[lotteryId] = null;
                    });
                }
            }else{
                sendFormatted(clientMessage.channel, ':x: You need to specify a number!');
            }
        }else{
            sendFormatted(clientMessage.channel, ':x: You need to specify how long the lottery will be, the minimum bet and the maximum bet!');
        }
    }else if(command === "giveblarts"){
        if(args.length >= 3){
            if(!isNaN(args[1])){
                //pay a user blarts
                var name = args.splice(2).join(" ");
                var guildmembers = await clientMessage.guild.members;
                var guildmember = guildmembers.find( val => val.user.username === name);
                var user = guildmember != null ? guildmember.user : null;

                var blartsToGive = Math.floor(parseInt(args[1]));

                var donorBlarts = await getBlarts(clientMessage.author);

                if(user != null){
                    var recieverBlarts = await getBlarts(user);

                    if(user.bot){
                        sendFormatted(clientMessage.channel, `:x:You can't give a bot blarts!`);
                    }else{
                        if(blartsToGive > donorBlarts){
                            sendFormatted(clientMessage.channel, ':x: You don\'t have that many blarts to give!');
                        }else if(blartsToGive <= 0){
                            sendFormatted(clientMessage.channel, ':x: You need to specify at least 1 blart!');
                        }else{
                            //complete the transaction
                            donorBlarts -= blartsToGive;
                            recieverBlarts += blartsToGive;

                            setBlarts(clientMessage.author, donorBlarts);
                            setBlarts(user, recieverBlarts);
                            sendFormatted(clientMessage.channel, `:credit_card: Transaction authorized.\n${clientMessage.author.username}\'s balance: ${donorBlarts}\n${user.username}\'s balance: ${recieverBlarts}`);
                        }
                    }
                }else{
                    sendFormatted(clientMessage.channel, `:x: Failed to find a user called ${name}!`);
                }
            }else{
                sendFormatted(clientMessage.channel, `:x: You need to specify a numeric amount of blarts!`);
            }
        }else{
            sendFormatted(clientMessage.channel, `:x: You need to specify an amount and an username!`);
        }
    }else if(command === "blackjack"){
        //get the starting bets for the session
        if(args.length >= 2){
            if(!isNaN(args[1])){
                var betNum = Math.floor(parseInt(args[1]));

                var userBlarts = await getBlarts(clientMessage.author);

                if(betNum <= 0){
                    sendFormatted(clientMessage.channel, `:x: You need to specify 1 or more blarts!`);
                }else if(betNum > userBlarts){
                    sendFormatted(clientMessage.channel, `:x: You can't specify more blarts than what you have!`);
                }else{
                    //start the round by deducting blarts from the user account
                    userBlarts -= betNum;
                    await setBlarts(clientMessage.author, userBlarts);

                    //start a black jack round collector
                    const blackjackFilter = m => {return m.author === clientMessage.author && m.content.startsWith("--");};
                    const blackjackCollector = clientMessage.channel.createMessageCollector(blackjackFilter, {time: 5 * 60 * 1000});

                    var deck = generateDeck(6);

                    var hand = [];

                    //deal two cards to the user
                    var deckIndex = Math.floor(Math.random()*deck.length);
                    hand.push(deck[deckIndex]);
                    deck.splice(deckIndex, 1);

                    deckIndex = Math.floor(Math.random()*deck.length);
                    hand.push(deck[deckIndex]);
                    deck.splice(deckIndex, 1);


                    var dealerHand = [];
                    deckIndex = Math.floor(Math.random()*deck.length);
                    dealerHand.push(deck[deckIndex]);
                    deck.splice(deckIndex, 1);

                    deckIndex = Math.floor(Math.random()*deck.length);
                    var hiddenDealerCard = deck[deckIndex];
                    deck.splice(deckIndex, 1);

                    //create a rich embed of the game
                    var richEmbed = new Discord.RichEmbed();

                    richEmbed.setTitle(`Current Game:`);
                    richEmbed.addField(`Your Hand:`,`${hand[0]} ${hand[1]}`);
                    richEmbed.addField(`Dealer Hand:`,`? ${dealerHand[0]}`);
                    richEmbed.addField(`Your Bet:`,`${betNum}`);
                    richEmbed.addField(`Actions:`,`You can \`--double\`, \`--hit\`, \`--stand\`, or \`--surrender\``);

                    richEmbed.setColor('GREEN');
                
                    clientMessage.channel.send(richEmbed);

                    var endedNormally = false;
                    var surrendered = false;

                    var calculateHandValue = function(hand){
                        //calculate individual values of cards
                        var aces = 0;

                        var handValue = 0;

                        //calculate hand value without aces
                        for(var card in hand){
                            var cardValue = hand[card];

                            if(cardValue === 'K' || cardValue === 'Q' || cardValue === 'J'){
                                handValue += 10;
                            }else if(cardValue === 'A'){
                                aces += 1;
                            }else{
                                handValue += parseInt(cardValue);
                            }
                        }

                        //factor in the aces
                        while(aces != 0){
                            if(handValue + 11 <= 21){
                                handValue += 11;
                            }else{
                                handValue += 1;
                            }

                            aces -= 1;
                        }

                        return handValue;
                    }

                    blackjackCollector.on('collect', async m=>{
                        if(m.content==="--hit"){
                            //draw a card
                            deckIndex = Math.floor(Math.random()*deck.length);

                            hand.push(deck[deckIndex]);
                            await sendFormatted(clientMessage.channel, `You drew: ${deck[deckIndex]}`);

                            deck.splice(deckIndex, 1);

                            //calculate if they went bust
                            if(calculateHandValue(hand) > 21){
                                endedNormally = true;

                                await sendFormatted(clientMessage.channel, `You went bust!`);
                                blackjackCollector.stop();
                            }
                        }else if(m.content==="--stand"){
                            endedNormally = true;
                            blackjackCollector.stop();
                        }else if(m.content==="--surrender"){
                            if(dealerHand[0] === 'A'){
                                if(hand.length === 2){
                                    surrendered = true;
                                    endedNormally = true;

                                    //return half their blarts
                                    userBlarts = await getBlarts(clientMessage.author);
                                    userBlarts += Math.floor(betNum/2);
                                    await setBlarts(clientMessage.author, userBlarts);
                                    
                                    await sendFormatted(clientMessage.channel, `You surrendered and were returned half your wager.`);
                                    blackjackCollector.stop();
                                }else{
                                    sendFormatted(clientMessage.channel, `:x: You may only surrender after you've just been dealt!`);
                                }
                            }else{
                                sendFormatted(clientMessage.channel, `:x: You may only surrender if the dealer's face up card is an ace!`);
                            }
                            
                        }else if(m.content==="--double"){
                            if(hand.length === 2 && calculateHandValue(hand) <= 11){
                                //charge them for doubling
                                userBlarts = await getBlarts(clientMessage.author);
                                userBlarts -= betNum;
                                await setBlarts(clientMessage.author, userBlarts);
                                betNum *= 2;

                                //draw a card
                                deckIndex = Math.floor(Math.random()*deck.length);

                                hand.push(deck[deckIndex]);
                                await sendFormatted(clientMessage.channel, `You drew: ${deck[deckIndex]}`);

                                deck.splice(deckIndex, 1);

                                //calculate if they went bust
                                if(calculateHandValue(hand) > 21){
                                    await sendFormatted(clientMessage.channel, `You went bust!`);
                                }

                                endedNormally = true;
                                blackjackCollector.stop();
                            }else{
                                sendFormatted(clientMessage.channel, `:x: You may only double after you've just been dealt and have a hand value of 11 or less!`);
                            }
                            
                        }
                    });

                    blackjackCollector.on('end', async collected=>{
                        if(endedNormally){
                            if(!surrendered){
                                var reward = 0;

                                //the dealer takes his turn if the user hasn't busted
                                if(calculateHandValue(hand) > 21){
                                    //lose
                                    reward = 0;
                                }else{
                                    await sendFormatted(clientMessage.channel, `The dealer's face down card was ${hiddenDealerCard}`);
                                    dealerHand.push(hiddenDealerCard);

                                    var dealerBusted = false;
                                    while(calculateHandValue(dealerHand) < 17){
                                        //draw a card while the dealer's hand has less than a value of 17
                                        deckIndex = Math.floor(Math.random()*deck.length);

                                        dealerHand.push(deck[deckIndex]);
                                        await sendFormatted(clientMessage.channel, `Dealer drew: ${deck[deckIndex]}`);

                                        deck.splice(deckIndex, 1);

                                        //calculate if they went bust
                                        if(calculateHandValue(dealerHand) > 21){
                                            await sendFormatted(clientMessage.channel, `The dealer went bust!`);
                                            dealerBusted = true;
                                        }
                                    }

                                    if(!dealerBusted && calculateHandValue(dealerHand) > calculateHandValue(hand)){
                                        //lose
                                        reward = 0;
                                    }else if(dealerBusted || calculateHandValue(dealerHand) < calculateHandValue(hand)){
                                        //win
                                        reward = 2 * betNum;
                                    }else{
                                        //tie so refund
                                        reward = betNum;
                                    }
                                }
                                
                                //create a rich embed of the game stats
                                var richEmbed = new Discord.RichEmbed();

                                richEmbed.setTitle(`Game results:`);
                                richEmbed.addField(`Your Bet:`,`${betNum}`);
                                richEmbed.addField(`Your Pay:`,`${reward}`);

                                richEmbed.setColor('GREEN');
                            
                                clientMessage.channel.send(richEmbed);
                                
                                //give their reward
                                userBlarts = await getBlarts(clientMessage.author);
                                userBlarts += reward;
                                await setBlarts(clientMessage.author, userBlarts);
                            }
                        }else{
                            sendFormatted(clientMessage.channel, 'The game timed out and you lost everything.');
                        }
                    });
                }
            }else{
                sendFormatted(clientMessage.channel, `:x: You need to specify a number!`);
            }
        }else{
            sendFormatted(clientMessage.channel, `:x: You need to specify your bet!`);
        }
    }

    clientMessage.channel.stopTyping(true);
});

//login to the client
client.login(Token.token);
