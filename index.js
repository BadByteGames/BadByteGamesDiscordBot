//required libraries
const Discord = require("discord.js");
//token file that stores bot token
const Token = require("./token.json");
const FriendlyMessages = require("./friendlymessages.json");

const client = new Discord.Client();

//deletes characters at start of string
function deleteCharacters(original, number){
    var str = original;
    for(var i = 0; i < number; i++){
        str = str.substr(1);
    }

    return str;
}

//returns array item if exists
function returnReal(array, index){
    if(array.length > index){
        return array[index]+" ";
    }
    return "";
}

//add events
client.on('ready', () => {
    client.user.setActivity("--help");
    console.log(`Bot logged in as ${client.user.tag}!`);
});

client.on('message', clientMessage => {
    const msg = clientMessage.content;

    //respond with 'die' if pinged
    if(clientMessage.isMentioned(client.user)){
        clientMessage.channel.send("die");
    }

    //%10 chance to reply with a friendly message to NoiseGenerator
    if(clientMessage.author.id === "345633153781596160" && Math.floor(Math.random()*10) == 7){
        messages = FriendlyMessages.friendly;

        clientMessage.channel.send(messages[Math.floor(Math.random()*messages.length)]);
    }

    //%10 chance to say a dad joke
    const messageWords = msg.split(" ");
    
    if(Math.floor(Math.random()*10) === 3){
        if(messageWords.length > 2 && messageWords[0] === 'I'  && messageWords[1] === 'am'){
            if(messageWords.length > 5){
                clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
            }else{
                clientMessage.channel.send(`Hi ${returnReal(messageWords, 2) + returnReal(messageWords, 3) + returnReal(messageWords, 4)}, I\'m ${client.user.username}!`);
            }
        }else if(messageWords.length > 1 && ((messageWords[0] === 'I\'m') || (messageWords[0] === 'Im')) ){
            if(messageWords.length > 4){
                clientMessage.channel.send(`Hi ${messageWords[2]}, I\'m ${client.user.username}!`);
            }else{
                clientMessage.channel.send(`Hi ${returnReal(messageWords, 1) + returnReal(messageWords, 2) + returnReal(messageWords, 3)}, I\'m ${client.user.username}!`);
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
    const args = deleteCharacters(msg, 2).split(" ");
    const command = args[0];

    if(command === "help"){
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
                guildAuthor.addRole("545709958075908107");
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
                guildAuthor.removeRole("545709958075908107");
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