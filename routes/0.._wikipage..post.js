(function(req,res) {
	var info = req.body;
	
	if (info.page) info.page = ((info.page[info.page.length-1]=="/") ? info.page.substring(0,info.page.length-1) : info.page).toLowerCase();
	if (info.file) {
		var fileInfo = info.file;
		var fileName = fileInfo.name;
		var filePath = fileInfo.path;
		var fileType = fileInfo.type;
	}
	
	switch(info.type) {
		case "init":
			config.mongodb.db.collection("wikicontent").find({path:info.page}).toArray(function(_e,info) {
				if (_e) res.json({success:false, error:_e});
				else {
					var oRet;
					if (!info.length) oRet = {success:true, exists:false, html:"", markup:""};
					else oRet = {
						success: true,
						exists: true,
						html: info[0].content_html,
						markup: info[0].content_markup,
						lastUpdate: info[0].updated,
						person: info[0].updatedBy,
						versions: info[0].history
					};
					
					if (req.session.loggedIn) {
						config.mongodb.db.collection("accounts").find({username:req.session.sAMAccountName},{files: {"$slice":20}}).toArray(function(_e,userInfo) {
							if (_e) log.error(_e);
							else oRet = Object.merge(oRet,{userFiles:userInfo[0].files});
							
							res.json(oRet);
						});
					} else {
						res.json(oRet);
					}
				}
			});
			
			break;
			
		case "update":
			if (!req.session.loggedIn) res.json({success:false, error:"You must be logged in to update wiki pages."});
			else {
				var saveData = {
					"$set": {
						path: info.page,
						content_html: info.html,
						content_markdown: info.markdown,
						updated: new Date(),
						updatedBy: {
							firstname: req.session.givenName,
							lastname: req.session.sn,
							username: req.session.sAMAccountName
						}
					}
				};
				
				config.mongodb.db.collection("wikicontent").find({path:info.page}).toArray(function(_e,current) {
					if (current.length) saveData["$push"] = {history: current[0]};
					
					config.mongodb.db.collection("wikicontent").update({ path:info.page },saveData,{ upsert:true },
						function(err,doc) {
							if (err) res.json({success:false, error:"There was an error saving your information. Please try again.", debug:err});
							else res.json({success:true});
						}
					);
				});
			}
			break;
		
		case "wordToHtml":
			if(/.+openxmlformats\-officedocument.+/.test(fileType)) {
				mammoth.convertToHtml({path:filePath}).then(function(result) {
					res.json({wordsuccess:true, html:result.value, debug: result});
				});
			} else {
				res.json({wordsuccess:false, error:"Uh oh, this doesn't appear to be a valid Microsoft Word document that we can parse and convert. Please try again."});
			}			
			
			break;
		
		case "uploadFile":
			var newFileName = fileName + Date.now();
			
			var gfs = Grid(config.mongodb.db, mongo);
			var writeStream = gfs.createWriteStream({filename: newFileName});
			
			writeStream.on("error",function(err) {
				log.error(err);
				res.json({filesuccess:false, error:err});
			});
			
			writeStream.on("close",function(file) {
				log.debug("File created and piped to GridFS. Filename: "+newFileName);
				
				res.json({filesuccess:true, filename:newFileName});
				
				config.mongodb.db.collection("accounts").update({username:req.session.sAMAccountName},{
					"$push": {
						files: {
							uploadedTime: new Date(),
							origFilename: fileName,
							filename: newFileName
						}
					}
				},{upsert:true},function(err) {
					if (err) log.error(err);
				});
			});
			
			fs.createReadStream(filePath).pipe(writeStream);
			
			break;
		
		case "spreadsheetToTable":
			
			break;
		
		default:
			res.json({success:false, error:"We couldn't figure out what you are doing. Please try again."});
	}
})