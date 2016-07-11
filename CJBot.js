var auth=require('./auth.js');

var TelegramBot = require('node-telegram-bot-api');
var ArduinoCLoud = require ('arduino_cloud');
var Wit = require ('node-wit').Wit;


// Setup polling way
var bot = new TelegramBot(auth.TelegramBotToken, {
    polling: true
});


var mything = new ArduinoCLoud(auth.username, auth.name, auth.thing_ID, auth.thing_PSW);

mything.addExternalProperty("LedMatrix","ashtag");
mything.addProperty("newIntent");

const actions = {
    send(request, response) {
        const {
            sessionId,
            context,
            entities
        } = request;
        const {
            text,
            quickreplies
        } = response;
        return new Promise(function(resolve, reject) {
            console.log('user said...', request.text);
            console.log('sending...', JSON.stringify(response));
            return resolve();
        });
    },
};

const client = new Wit({
    accessToken:auth.accessToken,
    actions
});
client.interactive();


mything.on("propertyChanged", function(propertyName, propertyValue) {
    console.log("propertyChanged");
    console.log("propertyName " + propertyName);
    console.log("propertyValue " + propertyValue);
});

mything.on("ExternalPropertyChanged", function(deviceName, propertyName, propertyValue) {
    console.log("ExternalPropertyChangedpropertyChanged");
    console.log("deviceName " + deviceName);
    console.log("propertyName " + propertyName);
    console.log("propertyValue " + propertyValue);
});


// Any kind of message
bot.on('message', function(msg) {
    var chatId = msg.chat.id;
    var message=msg.text;

    console.log(message);

    client.message(message)
        .then((data) => {
            console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
            if(data.entities!=={}){

              //something about the termostat happened
              if (data.entities.intent[0].value=="regulate temperature"){

                mything.writeProperty("newIntent","regulate temperature");

                temperature_feel=data.entities.temperature_feel[0];
                
                if (temperature_feel.value=="cold"){
                  console.log("COLD");
                  bot.sendMessage(chatId, "current temperature is");

                }else if(temperature_feel.value=="hot"){
                  console.log("HOT");
                  bot.sendMessage(chatId, "unfortutaly the air conditioning is not present, maybe you can open the window!");

                }
              }


              //something about the ledMatrix happened
              if (data.entities.intent[0].value=="ChangeMessage"){
                mything.writeProperty("newIntent","ChangeMessage");

                try {
                  newMessage=data.entities.hashtag[0].value;

                } catch (e) {
                  newMessage=null;
                  console.log ("didn't specify any hashtag");
                }

                if (!newMessage){
                  bot.sendMessage(chatId, "which hashtag do you want to follow?");

                }else{
                  console.log(newMessage);
                  bot.sendMessage(chatId, "the ledMatrix is now following "+newMessage);
                  mything.writeExternalProperty("LedMatrix","ashtag",newMessage);

                }
              }


            }
        }).catch(console.error);

});
