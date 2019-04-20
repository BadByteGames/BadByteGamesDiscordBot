//required libraries
const Discord = require("discord.js");
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');

const userdatabase = new sqlite3.Database('userdata');
const app = express();

app.use(session({
    secret: 'shut up about it',
    resave: true,
    saveUninitialized: true,
    maxAge: 60 * 60 * 1000 // 1 hour
}));

//includes the minesweeper generator
const MineSweeper = require("./minesweeper");
//token file that stores bot token
const Token = require("./token.json");
const FriendlyMessages = require("./friendlymessages.json");

const client = new Discord.Client();

//important variables of knowledge
var sayIt = false;
var message = "";

//finds a role id from a discord server and returns the role object
var findRole = function (guild, name){
    var role = null;
    role = guild.roles.find(val => val.name === name);
    return role;
}

//sends a formatted message to said channel
var sendFormatted = function(channel, message){
    var richEmbed = new Discord.RichEmbed();
     //change to error if too long
     if(message.length >= 256){
        richEmbed.setTitle(`:x: One or more of the arguments was too long!`);
    }else{
        richEmbed.setTitle(message);
    }
    richEmbed.setColor('GREEN');
   
    channel.send(richEmbed);
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

    if(reaction.emoji.name === '👍' && user != reaction.message.author && time < 1000 * 60 * 60 && !reaction.message.author.bot){
        //give them a blart
        var blarts = await getBlarts(reaction.message.author) + 1;

        setBlarts(reaction.message.author, blarts);
    }
});

client.on('messageReactionRemove', async (reaction, user) =>{
    var time = (client.readyTimestamp + client.uptime) - reaction.message.createdTimestamp;

    if(reaction.emoji.name === '👍' && user != reaction.message.author && time < 1000 * 60 * 60 && !reaction.message.author.bot){
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
                    sendFormatted(clientMessage.channel, `${user.username} has infinite blarts!`);
                }else{
                    var blarts = await getBlarts(user);
                    sendFormatted(clientMessage.channel, `${user.username} has ${blarts} blarts!`);
                }
            }else{
                sendFormatted(clientMessage.channel, `:x: Failed to find a user called ${name}!`);
            }
        }else{
           var blarts = await getBlarts(clientMessage.author);
           sendFormatted(clientMessage.channel, `You have ${blarts} blarts!`);
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
                    //flip a coin if 1-50 and have another coin toss for every 25 after
                    if(blartNum <= 50){
                        if(Math.floor(Math.random()*2) === 1){
                            userblarts += blartNum;
                            sendFormatted(clientMessage.channel, `:game_die: You bet your blarts that vegas had bees and won. Current balance: ${userblarts}`);
                        }else{
                            userblarts -= blartNum;
                            sendFormatted(clientMessage.channel, `:game_die: You bet your blarts but vegas did not have bees. Current balance: ${userblarts}`);
                        }
                    }else{
                        //lower their chances for getting to cocky
                        var cointoss = Math.floor(blartNum / 25) - 2;
                        if(Math.floor(Math.random()*Math.pow(2, cointoss)) === 1){
                            userblarts += blartNum;
                            sendFormatted(clientMessage.channel, `:game_die: You bet your blarts that vegas had bees and won. Current balance: ${userblarts}`);
                        }else{
                            userblarts -= blartNum;
                            sendFormatted(clientMessage.channel, `:game_die: You bet your blarts but vegas did not have bees. Current balance: ${userblarts}`);
                        }
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
    }

    clientMessage.channel.stopTyping(true);
});

//login to the client
client.login(Token.token);
