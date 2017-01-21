var ObjectId = require('mongodb').ObjectID;
var config = require("../config.js");

/*-----------------------------------------------------------------------------------------
|TITLE:    ChatMessageHandler.js
|PURPOSE:  Wrapper functions to do things (i.e. store, integrate, link) messages that are
|      sent.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  MongoDB
|REVISION HISTORY:
|      *LJW 3/9/2015 - created
-----------------------------------------------------------------------------------------*/
var ChatMessageHandler = function(opts) {
  opts=opts || {};

  this.namespace = opts.namespace || config.socketio.DEFAULTNAMESPACE;
  this.room = opts.room || config.socketio.DEFAULTROOM;

  this.MESSAGE_COLLECTION = "chat_messages";
}

/*-----------------------------------------------------------------------------------------
|NAME:      findAll (PUBLIC)
|DESCRIPTION:  Finds all the messages given the namespace and room provided
|PARAMETERS:  1. page(OPT): this will determine which "page" the user is looking for messages
|            with. All this will do is determine how many messages to skip by acting
|            as a multiplier to the limit variable and "skip" that many  when querying.
|        2. cb(REQ): the function we would like to call with results from messages
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
ChatMessageHandler.prototype.findAll = function(page,cb) {
  var self=this;
  var limit=config.socketio.NUM_MESSAGES;

  //handle and reset cb depending on if page or limits are functions. This allows the user
  //to leave out page or limit and still have a callback without consequences
  cb= (typeof page==='function') ? page : cb;
  page= (typeof page==='function') ? 0 : (page || 0);

  try {
    var db=config.mongodb.db;

    var messages=db.collection(this.MESSAGE_COLLECTION);
    messages.find({ namespace:self.namespace, room:self.room },{ sort: {creationdate:-1}, limit:limit, skip:page*limit })
      .toArray(function(err,docs) {
        if (err) return cb(err);

        //because we needed to pull the LAST [limit] documents and we want to return them to the
        //client in oldest->newest order, need to reverse the order that the documents are provided
        var reversedDocs=docs.reverse();

        cb(null,reversedDocs);
      });
  } catch (err) {
    cb(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      insert (PUBLIC)
|DESCRIPTION:  Inserts a new message into the DB.
|PARAMETERS:  1. cb(OPT): the function we would like to call after saving
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
ChatMessageHandler.prototype.insert = function(data,cb) {
  data = data || {};
  data.creationdate = new Date();
  data.user = data.user || 'GUEST';
  data.namespace = data.namespace || this.namespace;
  data.room = data.room || this.room;


  try {
    var db = config.mongodb.db;

    var messages = db.collection(this.MESSAGE_COLLECTION);
    messages.insert(data, function(err,r) {
      if (err) return cb(err);

      cb(null,r);
    });
  } catch(err) {
    cb(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      insertSubmessage (PUBLIC)
|DESCRIPTION:  Inserts a new submessage for a primary message.
|PARAMETERS:  1. data(REQ): the data we're passing to insert a new submessage
|        2. cb(OPT): the function we would like to call after saving
|CALLED FROM:
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
ChatMessageHandler.prototype.insertSubmessage = function(data,cb) {
  data=data || {};

  var messageID=data.primaryMessage;

  try {
    var db=config.mongodb.db;
    var messages=db.collection(this.MESSAGE_COLLECTION);

    var submessageData={
      user: data.user || 'GUEST',
      guestname: data.guestname || '',
      creationdate: new Date(),
      content: data.content || ''
    };

    messages.update({'_id':new ObjectId(messageID)},{$push:{submessages:submessageData}},{upsert:true},
      function(err,r) {
        if (err) return cb(err);

        cb(null,submessageData);
      }
    );
  } catch(err) {
    cb(err);
  }
}

module.exports = ChatMessageHandler
