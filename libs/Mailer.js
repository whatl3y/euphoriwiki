var nodemailer = require('nodemailer');
var GetHTML = require("./GetHTML.js");
var config = require("../config.js");
var log = require("bunyan").createLogger(config.logger.options());

/*-----------------------------------------------------------------------------------------
|TITLE:    Mailer.js
|PURPOSE: Wrapper for nodemailer to eloquently be able to send e-mails from the wiki application.
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|ASSUMES:  nodemailer, GetHTML library
|REVISION HISTORY:
|      *LJW 2/19/2016 - created
-----------------------------------------------------------------------------------------*/
Mailer = function(options) {
  options = options || {};

  this.mailoptions = {};
  this.mailoptions.from = options.from || "";
  this.mailoptions.to = options.to || "";
  this.mailoptions.cc = options.cc || [];
  this.mailoptions.bcc = options.bcc || [];

  this.smtpconfig = (options.config) ? options.config : config.smtp.nodemailerconfig();

  try {
    this.transporter = nodemailer.createTransport(this.smtpconfig);

    //if we have template information, meaning this will be sent via a template
    //go ahead and define the templateSender and try to send the e-mail
    //      options.send: boolean indicating if we'll go ahead and send the e-mail
    //      options.template.templateInfo: object of info to define our templateSendor
    //      options.template.keys: object of keys we'll be replacing their values in the template information
    //      options.template.cb: callback function of what to do upon sending the e-mail
    if (options.template) {
      if (options.send) this.template(options.template.templateInfo)(this.mailoptions,options.template.keys,options.template.cb);
      else this.sendTemplate = this.template(options.template.templateInfo);
    }
  } catch(err) {
    log.error(err);
  }
}

/*-----------------------------------------------------------------------------------------
|NAME:      template (PUBLIC)
|DESCRIPTION:  Initializes class members based on what was passed in
|PARAMETERS:  1. templateInfo(REQ): template options to be used in nodemailer.transporter.templateSender()
|SIDE EFFECTS:  Nothing
|ASSUMES:    Nothing
|RETURNS:    this.transporter.templateSender object
-----------------------------------------------------------------------------------------*/
Mailer.prototype.template = function(templateInfo) {
  return this.transporter.templateSender(templateInfo,{from:config.smtp.core.defaultEmail});
}

//-------------------------------------------------------
//NodeJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports=Mailer;
}
//-------------------------------------------------------
