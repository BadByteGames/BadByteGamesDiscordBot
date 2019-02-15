//required libraries
const Discord = require("discord.js");
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

    //%1 chance to destroy somebody
    if(Math.floor(Math.random()*100) === 50){
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
                clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
            }else{
                clientMessage.channel.send(`Hi ${messageWords.slice(1).join(' ')}, I\'m ${client.user.username}!`);
            }
        }
    }
    if(messageWords.length > 1 && ((messageWords.length > 2 && messageWords[0] === 'I'  && messageWords[1] === 'am') || (messageWords[0] === 'I\'m') || (messageWords[0] === 'Im')) && Math.floor(Math.random()*10) == 3){
        if(messageWords.length <= 5){
            clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
        }else{
            clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
        }
            
    }

    //return if msg is not a command
    if(!msg.startsWith("--") && !clientMessage.author.bot)
        return;

    //generate arguments list
    const args = msg.substring(2).split(" ");
    const command = args[0];

    if(command === "help"){
        console.log(clientMessage.guild.roles);
        clientMessage.channel.send("Command list sent to direct messages");
        var helpRichEmbed = new Discord.RichEmbed();
        helpRichEmbed.setTitle("Here is a list of commands:");
        helpRichEmbed.setDescription("(I also assist in conversations with good stuff)");
        helpRichEmbed.addField("--help","sends a list of commands", true);
        helpRichEmbed.addField("--subscribe <stream>","subscribes to a notification stream", true);
        helpRichEmbed.addField("--unsubscribe <stream>","unsubscribes from a notification stream", true);
        helpRichEmbed.addField("--givehelp","gives helpful advice for when you are going through a tough time", true);
        helpRichEmbed.setColor('GREEN');

        clientMessage.author.send(helpRichEmbed);
    }else if(command === "subscribe"){
        //subscribe to a notification stream
        if(args.length === 2){
            const guildAuthor = clientMessage.guild.member(clientMessage.author);

            if(args[1] === 'streams'){
                const streamRole = findRole(clientMessage.guild, 'streamnotify');
                if(streamRole === null){
                    clientMessage.channel.send("\` streamnotify \` is not a role on this server");
                }

                guildAuthor.addRole(streamRole);
                clientMessage.channel.send("You are now subscribed to streams!");
            }else{
                clientMessage.channel.send("Please specify a valid notification stream! Options are: \` streams \`");
            }
        }else{
            clientMessage.channel.send("Please specify a notification stream! Options are: \` streams \`");
        }
    }else if(command === "unsubscribe"){
        //unsubscribe from a notification stream
        if(args.length === 2){
            const guildAuthor = clientMessage.guild.member(clientMessage.author);
            
            if(args[1] === 'streams'){
                const streamRole = findRole(clientMessage.guild, 'streamnotify');
                if(streamRole === null){
                    clientMessage.channel.send("\` streamnotify \` is not a role on this server");
                }

                guildAuthor.removeRole(streamRole);
                clientMessage.channel.send("You are now unsubscribed from streams!");
            }else{
                clientMessage.channel.send("Please specify a valid notification stream! Options are: \` streams \`");
            }
        }else{
            clientMessage.channel.send("Please specify a notification stream! Options are: \` streams \`");
        }
    }else if(command === "givehelp"){
        messages = FriendlyMessages.friendly;

        clientMessage.channel.send(messages[Math.floor(Math.random()*messages.length)]);
    }
});

//login to the client
client.login(Token.token);
