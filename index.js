//required libraries
const Discord = require("discord.js");
//token file that stores bot token
const Token = require("./token.json");

const client = new Discord.Client();

//deletes characters at start of string
function deleteCharacters(original, number){
    var str = original;
    for(var i = 0; i < number; i++){
        str = str.substr(1);
    }

    return str;
}

//add events
client.on('ready', () => {
    client.user.setActivity("--help");
    console.log(`Bot logged in as ${client.user.tag}!`);
});

client.on('message', clientMessage => {
    const msg = clientMessage.content;

    //return if msg is not a command
    if(!msg.startsWith("--") && !clientMessage.author.bot)
        return;

    //generate arguments list
    const args = deleteCharacters(msg, 2).split(" ");
    const command = args[0];

    if(command === "help"){
        clientMessage.channel.send("Command list sent to direct messages");
        clientMessage.author.send("--help : view command list\n--subscribe <stream> : subscribe to a notification stream\n--unsubscribe <stream> : unsubscribe from a notification stream");
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
    }
});

//login to the client
client.login(Token.token);
