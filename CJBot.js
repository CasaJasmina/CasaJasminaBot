var auth = require('./auth.js');

var TelegramBot = require('node-telegram-bot-api');
var ArduinoCLoud = require('arduino_cloud');
var Wit = require('node-wit').Wit;


var conversation = require('./conversation.json');

// Setup polling way
var bot = new TelegramBot(auth.TelegramBotToken, {
  polling: true
});


var mything = new ArduinoCLoud(auth.username, auth.name, auth.thing_ID, auth.thing_PSW);

mything.addExternalProperty("LedMatrix", "ashtag");
mything.addExternalProperty("sensorTower", "light");
mything.addExternalProperty("sensorTower", "temperature");
mything.addExternalProperty("sensorTower", "Sound");
mything.addExternalProperty("waterPump", "Mode");
mything.addExternalProperty("Thermostat", "DefoultTemp");
// mything.addExternalProperty("Door", "code");
mything.addExternalProperty("Door", "open");
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
  accessToken: auth.accessToken,
  actions
});
client.interactive;

var cosa = {};

mything.on("propertyChanged", function(propertyName, propertyValue) {
  // console.log("propertyChanged");
  // console.log("propertyName " + propertyName);
  // console.log("propertyValue " + propertyValue);
  cosa[propertyName] = propertyValue;

});

mything.on("ExternalPropertyChanged", function(deviceName, propertyName, propertyValue) {
  // console.log("ExternalPropertyChanged");
  // console.log("deviceName " + deviceName);
  // console.log("propertyName " + propertyName);
  // console.log("propertyValue " + propertyValue);
  cosa[propertyName] = propertyValue;
});


// Any kind of message
bot.on('message', function(msg) {
  var chatId = msg.chat.id;
  var message = msg.text;

  console.log(message);

  console.log(chatId);

  client.message(message)
    .then((data) => {
      console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));

      if (data.entities !== {}) {
        for (i = 0; i < conversation.length; i++) {

          intent = conversation[i].intent
          possible_values = conversation[i].possible_values

          if (intent == data.entities.intent[0].value) {
            console.log("intent found:", intent);

            var keys = Object.keys(data.entities);

            for (j = 0; j < keys.length; j++) {
              if (keys[j] != 'intent') {

                entityName = keys[j];
                entityParams = data.entities[keys[j]];

                console.log(" Entity found: " + entityName + ": " + JSON.stringify(entityParams));


                undersood_command = -1;
                for (k = 0; k < possible_values.length; k++) {
                  if (entityParams[0].value == possible_values[k].if) {
                    undersood_command = possible_values[k].if
                    console.log("i know what to do: ", possible_values[k].action);

                    random_response_index = Math.floor(Math.random() * possible_values[k].response.length);


                    console.log("random index", random_response_index);

                    response = possible_values[k].response[random_response_index].text;

                    bot.sendMessage(chatId, response);

                    try {
                      eval(possible_values[k]);
                    } catch (err) {
                      console.log(err.message);
                    }


                  }
                }
                if (undersood_command == -1) {
                  console.log("didn't match any command: ", entityParams[0].value);

                }

              }
            }
          }

        }


        // //something about the ledMatrix happened
        if (data.entities.intent[0].value == "ChangeMessage") {
          mything.writeProperty("newIntent", "ChangeMessage");

          try {
            newMessage = data.entities.hashtag[0].value;

          } catch (e) {
            newMessage = null;
            console.log("didn't specify any hashtag");
          }

          if (!newMessage) {
            bot.sendMessage(chatId, "which hashtag do you want to follow?");

          } else {
            console.log(newMessage);
            bot.sendMessage(chatId, "the ledMatrix is now following " + newMessage);
            mything.writeExternalProperty("LedMatrix", "ashtag", newMessage);

          }
        }



        // //something about the SensorTower happened
        if (data.entities.intent[0].value == "light") {
          mything.writeProperty("newIntent", "light");
          bot.sendMessage(chatId, "Light value is " + cosa.light + " lumen");
        }
        if (data.entities.intent[0].value == "noisey") {
          mything.writeProperty("newIntent", "noisey");
          bot.sendMessage(chatId, "Here is " + cosa.Sound);
        }


        // //something about the salutation happened
        if (data.entities.intent[0].value == "salutation") {
          bot.sendMessage(chatId, "Hi, how can I help you?");
        }

        // //something about the identity happened
        if (data.entities.intent[0].value == "identity") {
          bot.sendMessage(chatId, "Luke, \nI am your father");
        }

        // //something about the door happened
        if (data.entities.intent[0].value == "Door") {
          mything.writeProperty("newIntent", "Door");

          try {
            action = data.entities.action[0].value;
          } catch (e) {
            action = null;
            console.log("no action here");
          }
          if (action == "open") {
            console.log(action);
            bot.sendMessage(chatId, "opening the door right now ");
            mything.writeExternalProperty("Door", "open", "true");
          }

          // try {
          //   newMessage = data.entities.enteringCode[0].value;
          //
          // } catch (e) {
          //   newMessage = null;
          //   console.log("The current code is " + cosa.code);
          // }
          //
          // if (!newMessage && !action) {
          //   bot.sendMessage(chatId, "which code do you want to set?");
          //
          // } else if(newMessage){
          //   console.log(newMessage);
          //   bot.sendMessage(chatId, "the entering code is now " + newMessage);
          //   mything.writeExternalProperty("Door", "code", newMessage);
          //
          // }
        }

        // //something about the thermostat happened
        if (data.entities.intent[0].value == "regulate temperature") {
          mything.writeProperty("newIntent", "thermostat");

          try {
            action = data.entities.temperature_feel[0].value;
          } catch (e) {
            action = null;
            console.log("no action here");
          }
          if (action == "cold") {
            console.log(parseInt(cosa.temperature));

            if(parseInt(cosa.temperature) > 24 ){
              bot.sendMessage(chatId, "It's already " +cosa.temperature+" degree inside!\nI can't help you :(");
            }
            else{
              bot.sendMessage(chatId, "Ok, let me manage this");
              mything.writeExternalProperty("Thermostat", "DefoultTemp", "25");
            }

          }}

        //something about the garden happened
        if (data.entities.intent[0].value == "checkGarden") {
          mything.writeProperty("newIntent", "checkGarden");

          try {
            action = data.entities.action[0].value;

          } catch (e) {
            action = null;
            console.log("no action here");
          }

          if (!action) {
            bot.sendMessage(chatId, "plants look allright\nthe irrigation is in " + cosa.Mode + " mode");


          } else {
            if (action == "open") {
              console.log(action);
              bot.sendMessage(chatId, "opening the water now ");
              mything.writeExternalProperty("waterPump", "open", "true");
            } else {
              bot.sendMessage(chatId, "had enough water!");
              mything.writeExternalProperty("waterPump", "open", "false");
            }
          }
        }
      }
    }).catch(console.error);

});
