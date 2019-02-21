//required libraries
const Discord = require("discord.js");
//includes the minesweeper generator
const MineSweeper = require("./minesweeper");
//token file that stores bot token
const Token = require("./token.json");
const FriendlyMessages = require("./friendlymessages.json");

const client = new Discord.Client();

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

//add events
client.on('ready', () => {
    client.user.setActivity("--help");
    console.log(`Bot logged in as ${client.user.tag}!`);
});

//add roles when user joins
client.on('guildMemberAdd', member => {
    const streamRole = findRole(member.guild, 'streamnotify');
    if(streamRole === null){
        return;
    }
    member.addRole(streamRole);
});

client.on('message', clientMessage => {
    if(clientMessage.author.bot || clientMessage.channel.type != 'text')
        return;

    const msg = clientMessage.content;

    //respond with 'die' if pinged
    if(clientMessage.isMentioned(client.user)){
        clientMessage.channel.send("die");
    }

    //send uno reverse card
    if(msg.toLocaleLowerCase() === "no u"){
        clientMessage.channel.send({
            files:["https://i.imgur.com/3WDcYbV.png"]
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
                files:["https://i.imgur.com/3WDcYbV.png"]
            });
        }
    }

    //%10 chance to reply with a friendly message to NoiseGenerator
    if(clientMessage.author.id === "345633153781596160" && Math.floor(Math.random()*10) == 7){
        messages = FriendlyMessages.friendly;

        clientMessage.channel.send(messages[Math.floor(Math.random()*messages.length)]);
    }

    //%0.1 chance to destroy somebody
    if(Math.floor(Math.random()*1000) === 50){
        clientMessage.channel.send({
            files:["https://i.kym-cdn.com/photos/images/newsfeed/001/315/902/034.png"]
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
		sendFormatted(clientMessage.channel, "Command list sent to direct messages");
        var helpRichEmbed = new Discord.RichEmbed();
        helpRichEmbed.setTitle("Here is a list of commands:");
        helpRichEmbed.setDescription("(I also assist in conversations with good stuff)");
        helpRichEmbed.addField("--help","sends a list of commands", true);
        helpRichEmbed.addField("--subscribe <stream>","subscribes to a notification stream", true);
        helpRichEmbed.addField("--unsubscribe <stream>","unsubscribes from a notification stream", true);
        helpRichEmbed.addField("--givehelp","gives helpful advice for when you are going through a tough time", true);
        helpRichEmbed.addField("--ping","get the time it takes for the bot to recieve your message in ms", true);
        helpRichEmbed.addField("--rtd <min> <max>","rolls a number in the range min-max", true);
        helpRichEmbed.addField("--minesweeper [rows] [columns] [mines]","generates a spoiler-tag base game of minesweeper", true);
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
                }

                guildAuthor.addRole(streamRole);

                sendFormatted(clientMessage.channel, ':mega: You are now subscribed to streams!');
            }else{
                sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
            }
        }else{
            sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
        }
    }else if(command === "unsubscribe"){
        //unsubscribe from a notification stream
        if(args.length === 2){
            const guildAuthor = clientMessage.guild.member(clientMessage.author);
            
            if(args[1] === 'streams'){
                const streamRole = findRole(clientMessage.guild, 'streamnotify');
                if(streamRole === null){
                    sendFormatted(clientMessage.channel, ':x: \` streamnotify \` is not a role on this server');
                }

                guildAuthor.removeRole(streamRole);

                sendFormatted(clientMessage.channel, ':mega: You are now unsubscribed from streams!');
            }else{
                sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
            }
        }else{
            sendFormatted(clientMessage.channel,':x: Please specify a valid notification stream! Options are: \` streams \`');
        }
    }else if(command === "givehelp"){
        messages = FriendlyMessages.friendly;
        
        sendFormatted(clientMessage.channel, `:thumbsup: ${messages[Math.floor(Math.random()*messages.length)]} :thumbsup:`);
        
    }else if(command === "ping"){
        var time = (client.readyTimestamp + client.uptime) - clientMessage.createdTimestamp;
        //calculate the time it takes to recieve the message in ms
        sendFormatted(clientMessage.channel, `:ping_pong: Pong! Message recieved in ${time} ms`);
    }else if(command === "rtd"){
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
                    return;
                }

                if(args.length >= 3 && !isNaN(args[2])){
                    height = parseInt(args[2]);
                    if(height <= 3 || height > 20){
                        sendFormatted(clientMessage.channel,`:x: ${height} is not between 4 and 20!`);
                        return;
                    }
    
                }else if(args.length >= 3){
                    sendFormatted(clientMessage.channel,`:x: ${args[2]} is not a number!`);
                    return;
                }

                //generate a number of mines if not specified
                if(args.length >= 4 && !isNaN(args[3])){
                    mines = Math.floor(parseInt(args[3]));
                    if((width * height) - 9 < mines){
                        sendFormatted(clientMessage.channel,`:x: The number of mines is not less than or equal to ${width * height - 9}!`);
                        return;
                    }else if(mines < 0){
                        sendFormatted(clientMessage.channel,`:x: The number of mines is less than 0!`);
                        return;
                    }
    
                }else if(args.length >= 4){
                    sendFormatted(clientMessage.channel,`:x: ${args[3]} is not a number!`);
                    return;
                }else{
                    //generate a number of mines
                    mines = Math.floor((width * height - 1) / 8);
                }

            }else{
                sendFormatted(clientMessage.channel,`:x: ${args[1]} is not a number!`);
                return;
            }
        }
        
        grid = MineSweeper.genPuzzle(width, height, mines);
        while(!MineSweeper.verifyPuzzle(grid, mines)){
            grid = MineSweeper.genPuzzle(width, height, mines);
        }


        if(grid === null){
            sendFormatted(clientMessage.channel, `:x: Something went wrong with the minesweeper grid generation!`);
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
    }
});

//login to the client
client.login(Token.token);
