botbuilder-viber
=======

[![npm](https://img.shields.io/npm/v/botbuilder-viber.svg?style=flat)](https://www.npmjs.com/package/botbuilder-viber)

A node module for Microsoft [BotBuilder Framework](https://github.com/Microsoft/BotBuilder).

This module provides plug-in Viber connector for Microsoft BotBuilder framework. 

`botbuilder-viber` currently supports the following tracking features:

* sending text, image, buttons, stickers messages
* receiving text messages

## Getting started

`botbuilder-viber` is installed just like any other node module:

```
$ npm i botbuilder-viber
```
In your bot's app.js:
```
var viber = require('botbuilder-viber')
...
var viberOptions = {
  Token: process.env.VIBER_TOKEN,
  Name: 'ViberBotName',  
  AvatarUrl: 'http://url.to/pngfile'
}
var viberChannel = new viber.ViberEnabledConnector(viberOptions)
//after initialising your bot and existing connectors 
bot.connector(viber.ViberChannelId, viberChannel)
app.use('/viber/webhook', viberChannel.listen())
```

When the bot starts, you need to [register your webhook with Viber](https://developers.viber.com/api/rest-bot-api/index.html#webhooks).

Url of the webhook will be the url of your bot appended `/viber/webhook`.

Example: `https://botappservice.azurewebsites.net/viber/webhook`



## Sending stickers
```
var viberPayload = {}
viberPayload[viber.ViberChannelId] = {
    "type": "sticker",
    "sticker_id": 114406
}
var stickerMessage = new builder.Message(session).sourceEvent(viberPayload)
session.send(stickerMessage)
```
[How to find out Viber's sticker ids?](https://developers.viber.com/tools/sticker-ids/index.html)


### Viber API documentation
[Viber REST API](https://developers.viber.com/api/rest-bot-api/index.html)

### Other information
* This BotBuilder is working on top of `viber-node` module: https://github.com/Viber/viber-bot-node
* It can probably send whole set of different messages Viber supports (Text, Url, Contact, Picture, Video, Location, Sticker, File) 
* Avatar is recommended to be 720x720, and no more than 100kb (otherwise will not show on mobile clients). Use tinypng to make it smaller.