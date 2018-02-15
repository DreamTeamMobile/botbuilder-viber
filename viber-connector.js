const builder = require('botbuilder');
const ViberBot = require('viber-bot').Bot;
const BotEvents = require('viber-bot').Events;
const UserProfile = require('viber-bot').UserProfile;
const VTextMessage = require('viber-bot').Message.Text
const VPictureMessage = require('viber-bot').Message.Picture
const VLocationMessage = require('viber-bot').Message.Location
const VContactMessage = require('viber-bot').Message.Contact
const VStickerMessage = require('viber-bot').Message.Sticker
const winston = require('winston');
const toYAML = require('winston-console-formatter'); // makes the output more friendly
const async = require("async");
/*
Until BotBuilder supports custom channels,
we have to use Kik's channelId to make BotBuilder play nice with user data.
We can use any other channel which supports buttons instead of Kik here.
*/
const ViberChannelId = 'kik'

const logger = function() {
    const logger = new winston.Logger({ level: "debug" }); // We recommend DEBUG for development
    logger.add(winston.transports.Console, toYAML.config());
    return logger;
}();

var ViberEnabledConnector = (function() {
    function ViberEnabledConnector(opts) {
        var self = this;
        this.options = opts || {};
        this.viberBot = new ViberBot({
            authToken: this.options.Token,
            name: this.options.Name,
            // It is recommended to be 720x720, and no more than 100kb.
            avatar: this.options.AvatarUrl,
            logger: logger
        });

        this.viberBot.on(BotEvents.MESSAGE_RECEIVED, (message, response) => {
            self.processMessage(message, response);
        });

        this.viberBot.on(BotEvents.CONVERSATION_STARTED, (response, onFinish) => {
            // onFinish(new TextMessage(`Hi, ${userProfile.name}! Nice to meet you.`))
            var self = this;
            var userProfile = response.userProfile;
            var addr = {
                channelId: ViberChannelId,
                user: { id: encodeURIComponent(userProfile.id), name: userProfile.name },
                bot: { id: 'viberbot', name: self.options.Name },
                conversation: { id: 'ViberConversationId' }
            };

            var msg = new builder.Message()
                .address(addr)
                .timestamp(convertTimestamp(new Date()))
                .entities();
            msg.type = msg.data.type = 'contactRelationUpdate';
            msg.data.action = 'add';
            this.handler([msg.toMessage()]);
        });
    }

    function convertTimestamp(ts) {
        return ts;
    }

    ViberEnabledConnector.prototype.processMessage = function(message, response) {
        var self = this;
        var userProfile = response.userProfile;
        var addr = {
            channelId: ViberChannelId,
            user: { id: encodeURIComponent(userProfile.id), name: userProfile.name },
            bot: { id: 'viberbot', name: self.options.Name },
            conversation: { id: 'ViberConversationId' }
        };
        var msg = new builder.Message()
            .address(addr)
            .timestamp(convertTimestamp(message.timestamp))
            .entities();

        var rawMessage = message.toJson();
        if (rawMessage.type === 'text') {
            msg = msg.text(message.text);
        } else if (rawMessage.type === 'picture'){
            msg.text(message.text || 'picture').addAttachment({
                contentUrl: rawMessage.media,
                contentType: 'image/jpeg',
                name: 'viberimage.jpeg'
            })
        } else {
            msg = msg.text(message.text || '[json]').addAttachment({
                payload: rawMessage,
                contentType: 'object',
            });
        }
        this.handler([msg.toMessage()]);
        return this;
    }

    ViberEnabledConnector.prototype.onEvent = function(handler) {
        this.handler = handler;
    }

    ViberEnabledConnector.prototype.listen = function() {
        return this.viberBot.middleware();
    }

    ViberEnabledConnector.prototype.send = function(messages, done) {
        var _this = this;
        async.eachSeries(messages, function(msg, cb) {
            try {
                if (msg.address) {
                    _this.postMessage(msg, cb);
                } else {
                    logger.error('ViberEnabledConnector: send - message is missing address.');
                    cb(new Error('Message missing address.'));
                }
            } catch (e) {
                cb(e);
            }
        }, done);
    }

    ViberEnabledConnector.prototype.convertToViberMessage = function(message) {
        var viberKb = null;
        var pictureMessage = null;
        if (message.sourceEvent && message.sourceEvent.type) {
            switch (message.sourceEvent.type) {
                case 'sticker':
                    return new VStickerMessage(message.sourceEvent.sticker_id, null, null, new Date(), '')
                    break;
            }
        }
        if (message.attachments && message.attachments.length) {
            var attachment = message.attachments[0];
            switch (attachment.contentType) {
                case 'application/vnd.microsoft.keyboard':
                    var a = attachment;
                    if (a.content.buttons && a.content.buttons.length) {
                        viberKb = {
                            "Type": "keyboard",
                            "DefaultHeight": true,
                            "Buttons": []
                        };
                        for (var j = 0; j < a.content.buttons.length; j++) {
                            var sourceB = a.content.buttons[j];
                            var b = {
                                "ActionType": "reply",
                                "ActionBody": sourceB.value,
                                "Text": sourceB.title,
                                "TextSize": "regular"
                            };
                            viberKb.Buttons.push(b);
                        }
                    }
                    break;
                case 'application/vnd.microsoft.card.hero':
                    // WARNING: Only supports text-only hero cards for this moment
                    var a = attachment;
                    if (a.content.buttons && a.content.buttons.length) {
                        viberKb = {
                            "Type": "keyboard",
                            "DefaultHeight": true,
                            "Buttons": []
                        };
                        for (var j = 0; j < a.content.buttons.length; j++) {
                            var sourceB = a.content.buttons[j];
                            var b = {
                                "ActionType": "reply",
                                "ActionBody": sourceB.value,
                                "Text": sourceB.title,
                                "TextSize": "regular"
                            };
                            viberKb.Buttons.push(b);
                        }
                    }
                    message.text = message.title + message.subtitle + message.text;
                    break;
                case 'image/jpeg':
                    var p = attachment;
                    pictureMessage = new VPictureMessage(p.contentUrl, message.text, null, null, null, new Date(), '');
                    break;
            }
        }
        if (pictureMessage) {
            return pictureMessage;
        } else {
            return new VTextMessage(message.text, viberKb, null, new Date(), '')
        }
    }

    ViberEnabledConnector.prototype.postMessage = function(message, cb) {
        var self = this,
            addr = message.address,
            user = addr.user;
        var realUserId = decodeURIComponent(addr.user.id)
        var profile = new UserProfile(realUserId, addr.user.name, '', '', '');
        if (message.type === 'typing') {
            // since Viber doesn't support "typing" notifications via API
            // this.viberBot.sendMessage(profile, [new VTextMessage('...', null, null, new Date(), '')]).then(function(x) { cb()}, function(y) {cb()})
            cb()
        } else {
            var viberMessages = [self.convertToViberMessage(message)];
            this.viberBot.sendMessage(profile, viberMessages).then(function(x) { cb() }, function(y) { cb() })
        }
    }

    ViberEnabledConnector.prototype.startConversation = function(address, done) {
        var addr = address
        address.conversation = { id: 'ViberConversationId' }
        done(null, addr);
    }

    return ViberEnabledConnector;
})();

exports.ViberEnabledConnector = ViberEnabledConnector;
exports.ViberChannelId = ViberChannelId
