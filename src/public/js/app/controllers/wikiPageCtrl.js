export { wikiPageCtrl as default }

function wikiPageCtrl($scope,$http,$sce,$modal,Upload) {
  $scope.pathname = decodeURI(location.pathname);
  $scope.newPathname = decodeURI(location.pathname);

  $scope.queryString = location.search.substring(1);
  $scope.queryStringParams = Object.unserialize($scope.queryString);

  $scope.isLoggedIn = LOCAL_DATA.EXTRA.loggedIn;
  $scope.pagePieces = [{text:"home",link:"/"}].concat(LOCAL_DATA.EXTRA.pagePieces || []);
  $scope.emptyPageError = "There is no content on this page yet. Feel free to log in and add content now by selecting from a template below or clicking to Edit Page link at the top right of your page!";
  $scope.content = {};
  $scope.config = {
    ckOptions: {
      allowedContent: true,
      fullPage: true
    }
  };

  $scope.pageState = {
    view: true,
    settings: false,
    pageModules: false,
    wikiEvents: false,
    editHtml: false,
    uploadDocx: false,
    uploadFile: false,
    olderVersions: false
  };

  //file type options for if/when a user uploads or makes changes to files
  $scope.fileUploadScopes = [{text:"Page File",val:"page"},{text:"User File",val:"user"}];
  $scope.fileUploadScope = "page";

  $scope.properties = {
    path: $scope.pathname,
    pathname: $scope.pathname,
    pagename: $scope.pathname.substring($scope.pathname.lastIndexOf("/")+1)
  };

  $scope.functions = {
    initialize: function(alreadyLoaded) {
      if (!alreadyLoaded) {
        $scope.socketHandler=new Core.SocketHandler({
          $scope: $scope,
          socket: EuphoriwikiSocket,
          wshost: LOCAL_DATA.wshost,
          namespace: LOCAL_DATA.namespace || "/",
          events: this.globalSocketEvents()
        }).initialize();

        //----------------------------------------------------------------------
        //#main-wiki-wrapper is in wikipage.jade, and initially this
        //has a style attribute to set display property: none. As soon as the DOM
        //loads and the loader starts, we will remove that style attribute. This
        //is needed to prevent showing angular markup before all the JS has loaded on
        //the page and the controller(s) have began initializing.
        angular.element( "#main-wiki-wrapper" ).removeAttr("style");
        $scope.initcomplete = true;
        $scope.content.html = "Placeholder...";
        //----------------------------------------------------------------------

        angular.element(function() {
          $scope.pageHasContent = !!angular.element( ".server-page-html" ).length;

          //make sure our buttons that correspond to file inputs bind click events
          angular.element("button#upload-file-word").on("click",function() {
            angular.element("#file-input-word").trigger("click");
          });

          angular.element("button#upload-file-main").on("click",function() {
            angular.element("#file-input-main").trigger("click");
          });

          //----------------------------------------------------------------------
          //Depending on if this page already has content on it delivered from the server
          //either display a synchronous or asynchronous loader.
          if ($scope.pageHasContent) var loader = new Core.Modals().asyncLoader({message:"We're getting info about this page!"});
          else new Core.Modals().alertPopup({loading:true});
          //----------------------------------------------------------------------

          $http.post('/wikipage',{type:"init", page:$scope.pathname})
          .success(function(ret) {
            if (!ret.success) {
              if (ret.protected) {
                $scope.protected = true;
              } else if (ret.outofscope) {
                location.href = "/?auth=" + $scope.pathname;
              } else {
                $scope.error = ret.error;
              }
            } else {
              $scope.exists = ret.exists;
              $scope.updateable = ret.updateable;

              $scope.content = $scope.content || {};
              $scope.content.html = ret.html || "";
              $scope.content.description = ret.description || "";
              $scope.content.person = ret.person || {};
              $scope.content.lastUpdate = ret.lastUpdate || null;
              $scope.content.tags = ret.tags || [];
              $scope.content.draft = ret.draft || false;

              $scope.templateFiles = {};
              $scope.template = ret.template || {};
              $scope.template.masterConfig = ret.masterTemplateConfig || [];

              angular.element("#rte-editor").html( $scope.content.html );

              $scope.password = ret.password || "";
              $scope.widgets = ret.widgets || {};
              $scope.userfiles = ret.userFiles || [];
              $scope.pagefiles = ret.pageFiles || [];
              $scope.pageLikes = Number(ret.pageLikes || 0);
              $scope.canLike = (ret.canLike == false) ? false : true;
              $scope.pageadmins = ret.pageadmins || [];
              $scope.viewscopes =  ret.viewscopes || [];
              $scope.subpages = ret.subpages || [];

              $scope.availablePageTemplates = (ret.pageTemplates || []).filter(function(p) {return p.type=="page";});
              $scope.availableComponentTemplates = (ret.pageTemplates || []).filter(function(p) {return p.type=="component";});
              $scope.pageEvents = ret.pageEvents || [];

              //hiding the header information when desired
              $scope.functions.hideAllOfHeader(ret.hideAllOfHeader);
            }

            $scope.functions.postInitialize();
            $scope.functions.rteInit(true);

            window.wikiPageInitComplete = true;
            angular.element( '#loader' ).remove();
            if (typeof loader !== "undefined") loader.remove();
          })
          .error(function(data,err) {
            console.log(data,err);
            angular.element( '#loader' ).remove();
            if (typeof loader !== "undefined") loader.remove();
          });
        });
      }
    },

    postInitialize: function() {
      var loader = new Core.Modals().asyncLoader({message:"We're getting some more stuff, but you can continue working!"});
      $http.post('/wikipage',{type:"postinit", page:$scope.pathname})
      .success(function(ret) {
        if (!ret.success) {
          console.log("postinit unsuccessful",ret);
        } else {
          $scope.content.versions = ret.versions || [];
          $scope.availableModules = ret.modules || [];
          $scope.moduleInstances = ret.pageModules || [];
          $scope.scopeTypes = ret.scopeTypes || [];
          $scope.eventTypes = ret.eventTypes || [];
          $scope.aliases = ret.pageAliases || [];
          $scope.externalDatasources = ret.datasources || [];
          $scope.pageComments = ret.comments || [/*{
            content: "This is a test comment...",
            date: "2016-06-11 22:00:00",
            altemail: "test@email.com",
            username: "test",
            firstname: "user",
            lastname: "userln",
            subcomments: [{
              content: "SUB - This is a test comment...",
              date: "2016-06-11 22:00:00",
              altemail: "SUB - test@email.com",
              username: "test",
              firstname: "user",
              lastname: "userln",
              subcomments: [{
                content: "SUBSUB - This is a test comment...",
                date: "2016-06-11 22:00:00",
                altemail: "SUBSUB - test@email.com",
                username: "test",
                firstname: "user",
                lastname: "userln"
              }]
            }]
          },
          {
            content: "c2 - This is a test comment...",
            date: "2016-06-11 22:00:00",
            altemail: "c2 - test@email.com",
            username: "test",
            firstname: "user",
            lastname: "userln"
          }*/];
        }

        loader.remove();
      })
      .error(function(data,err) {
        console.log("postinit unsuccessful",data,err);
        loader.remove();
      });
    },

    diffTextHtml: function(text1,text2) {
      var d = new diff_match_patch();
      return d.diff_prettyHtml(d.diff_main(text1, text2))
    },

    globalSocketEvents: function() {
      return [
        {
          Name: "wikiPageCtrl_editing",
          Handler: function(editingData) {
            var isEditing = editingData.isEditing;
            var who = editingData.who;

            $scope.$apply(function() {
              if (!isEditing) delete($scope.currentlyEditing);
              else {
                if (typeof who === "object" && typeof who[Object.keys(who)[0]] === "object") {
                  for (var _sid in who) {
                    if (_sid != EuphoriwikiSocket.io.engine.id) {
                      $scope.currentlyEditing = {isEditing:true, user:who[_sid]};
                      return;
                    }
                  }

                  delete($scope.currentlyEditing);

                } else $scope.currentlyEditing = {isEditing:true, user:who};
              }
            });
          }
        }
      ];
    },

    hideAllOfHeader: function(hide) {
      hide = hide || false;

      if (hide) {
        $scope.hideAllOfHeader = true;
        $scope.$emit("hideAllOfHeader",true);
      } else {
        $scope.hideAllOfHeader = false;
        $scope.$emit("hideAllOfHeader",false);
      }
    },

    rteInit: function(bind) {
      var rteElement = angular.element("#rte-editor");
      rteElement.html( $scope.content.html );

      if (bind) {
        $('#rte-editor').wysiwyg({},function($editor,saveRange) {
          $scope.content.html = ((($editor.html() || "").length && ($editor.html() || "")[0] != "<") ? "<div>" + $editor.html() + "</div>" : $editor.html()) || "";
          $scope.COPYPASTE = {
            editor: $editor,
            range: saveRange
          }
        });

        //bind copy/paste event handler to RTE
        var cp = new Core.CopyPaste({elements:rteElement, cb:function(err,imgSrc) {
          if (err) console.log("Error while pasting content: " + err);
          else {
            var newImg = document.createElement("img");
            newImg.className = "img-responsive";
            newImg.src = imgSrc;

            $scope.COPYPASTE.range.insertNode(newImg);

            //$scope.content.html += "<div><img class='img-responsive' src='" + imgSrc + "' /></div>";
            $scope.content.html = $scope.COPYPASTE.editor.html();
            $scope.functions.rteInit();
          }
        }});
      }
    },

    updateAryLength: function(scopeKey,which) {
      scopeKey = scopeKey || "";
      which = which || "inc";

      $scope[scopeKey] = $scope[scopeKey] || [];

      switch(which) {
        case "inc":
          $scope[scopeKey] = $scope[scopeKey].concat({});
          break;

        case "dec":
          $scope[scopeKey].pop();
          break;
      }
    },

    updateTemplateConfigArrayLength: function(key,which) {
      which = which || "inc";
      $scope.template.config[key] = $scope.template.config[key] || [];

      switch(which) {
        case "inc":
          $scope.template.config[key] = $scope.template.config[key].concat({});
          break;

        case "dec":
          $scope.template.config[key].pop();
          break;
      }
    },

    getModuleDescription: function(moduleKey) {
      moduleKey = moduleKey || null;
      if (moduleKey) return $scope.availableModules.filter(function(m){return m.key == moduleKey})[0].description || "";

      return "";
    },

    findAdObj: function(search,type,cb) {
      search = search || "";
      type = type || "user";

      if (search.length) {
        var loader = new Core.Modals().asyncLoader({message:"Finding your AD search results..."});
        $http.post('/wikipage',{type:"adfind", objType:type, search:search})
        .success(function(ret) {
          if (!ret.success) cb(ret.error || "There was an error trying to find this search text. Please try again.");
          else cb(null,ret.objects || []);

          loader.remove();
        })
        .error(function(data,err) {
          cb(err);
          console.log(data,err);
          loader.remove();
        });
      } else {
        cb("Please provide search text to search AD.");
      }
    },

    objSize: function(obj) {
      return Object.size(obj);
    },

    getAry: function(num) {
      return new Array(num);
    },

    pageStateToUploadType: function() {
      var ps = $scope.pageState;

      switch (true) {
        case ps.uploadDocx:
          return "wordToHtml";
        case ps.uploadFile:
          return "uploadFile";
        case ps.spreadsheetToTable:
          return "spreadsheetToTable";
        default:
          return false;
      };
    },

    sanitizeHtml: function(html) {
      return $sce.trustAsHtml(html);
    },

    changePageState: function(activeState) {
      for (var _k in $scope.pageState) {
        if (activeState == _k) $scope.pageState[_k] = true;
        else $scope.pageState[_k] = false;
      }
    },

    reloadPage: function() {
      location.reload();
    },

    updateEasyConfigListAryOrder: function(confName,index,direction) {
      direction = direction || 1;
      $scope.template.config[confName] = $scope.template.config[confName] || [];

      var newIndex = index + direction;

      var itemToUpdate = $scope.template.config[confName].splice(index,1)[0];
      console.log(itemToUpdate);
      $scope.template.config[confName].splice(newIndex,0,itemToUpdate);
    },

    files: {
      sortColumn: "origFilename",
      reverseOrder: false,
      changeOrder: function(column) {
        var sameColumn = this.sortColumn == column;

        this.sortColumn = column;
        this.reverseOrder = (sameColumn) ? !this.reverseOrder : false;
      }
    },

    widgets: {
      hideWidgetWrapper: function() {
        var enabled = false;

        for (var _w in $scope.widgets) {
          if (_w != "comments" && $scope.widgets[_w].enabled) {
            enabled = true;
            break;
          }
        }

        if (enabled) return false;
        return true;
      },

      style: {
        mainWrapperWidgetClasses: function() {
          var classMap = {
            0: "",
            1: "col-xs-12 col-sm-8 col-md-9"
          };

          if (typeof $scope.widgets === "object") {
            var numWidgets = 0;

            for (var _widget in $scope.widgets) {
              if (_widget != "comments" && $scope.widgets[_widget].enabled) numWidgets++;
            }

            return classMap[(numWidgets) ? 1 : 0];
          }

          return "";
        }
      }
    },

    style: {
      tabState: function(isActive) {
        return (isActive) ? "active" : "";
      }
    },

    modals: {
      cancel: function() {
        //$modalInstance.dismiss('cancel');
      }
    }
  };

  $scope.handlers = {
    initializeEdit: function(forceEdit) {
      if (!$scope.initializedEditInSession) $scope.initializedEditInSession = true;

      $scope.functions.changePageState('view');
      $scope.editState = (forceEdit) ? true : !$scope.editState;

      EuphoriwikiSocket.emit("initEdit",{room:$scope.pathname,editState:$scope.editState});
    },

    saveChanges: function(draft,deleteDraft) {
      draft = draft || false;
      deleteDraft = deleteDraft || false;

      delete($scope.saveError);

      if (!draft && (!$scope.content || !$scope.content.html)) {
        $scope.saveError = "Before saving, please ensure you have some content you want to display on the page.";
        return;
      }

      new Core.Modals().alertPopup({loading:true});
      Upload.upload({
        url: '/wikipage',
        data: {
          type: (draft) ? "updateDraft" : "update",
          delete: deleteDraft,
          templateFiles: $scope.templateFiles,
          template: Upload.json($scope.template),
          page: $scope.pathname,
          html: $scope.content.html
        }
      })
      .success(function(ret) {
        if (ret.success) $scope.functions.initialize();
        else {
          $scope.saveError = ret.error || "There was an issue saving your data. Please try again.";
          console.log(ret);
        }

        angular.element( '#loader' ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        angular.element( '#loader' ).remove();
      });
    },

    deletePage: function() {
      if (confirm("Are you sure you want to delete this page?")) {
        var loader = new Core.Modals().asyncLoader({message:"Deleting your page..."});
        $http.post('/wikipage',{type:"delete", page: $scope.pathname})
        .success(function(ret) {
          if (ret.success) return location.href = "/";
          else alert("ERROR: " + ret.error || "There was an issue. Please try again.");

          loader.remove();
        })
        .error(function(data,err) {
          console.log(data,err);
          loader.remove();
        });
      }
    },

    prettifyHtml: function() {
      var loader = new Core.Modals().asyncLoader({message:"Prettifying your HTML!."});
      $http.post('/wikipage',{type:"prettify", html:$scope.content.html})
      .success(function(ret) {
        if (ret.success) {
          $scope.content.html = ret.html || "";
        } else {
          alert("ERROR: " + ret.error || "There was an issue. Please try again.");
        }

        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    },

    updateAliases: function(aliases) {
      aliases = aliases || [];
      delete($scope.aliasError);

      var loader = new Core.Modals().asyncLoader({message:"Updating your page's aliases!."});
      $http.post('/wikipage',{type:"aliases", page:$scope.pathname, aliases:aliases})
      .success(function(ret) {
        if (!ret.success) $scope.aliasError = ret.error;
        console.log(ret);

        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    },

    savePageEvents: function(events) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/wikipage',{type:"updatePageEvents", page:$scope.pathname, events:events})
      .success(function(ret) {
        if (ret.success) console.log("Successfully saved page events!");
        else {
          alert(ret.error || "There was an error save your events. Please try again.");
        }

        loader.remove();
      })
      .error(function(data,err) {
        alert(ret.error || "There was an error save your events. Please try again.");
        loader.remove();
      });
    },

    saveModuleInstances: function(modules) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/wikipage',{type:"updatePageModules", page:$scope.pathname, modules:modules})
      .success(function(ret) {
        if (ret.success) $scope.functions.initialize();
        else {
          alert(ret.error || "There was an error save your modules. Please try again.");
        }

        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        alert(err || "There was an error save your modules. Please try again.");
        loader.remove();
      });
    },

    updatePagePassword: function(pw,clear) {
      if (pw) {
        var info = {
          type: "updatePassword",
          page: $scope.pathname,
          password: pw
        };

        if (clear) info.clear = true;

        var loader = new Core.Modals().asyncLoader({message:"Saving your page password."});
        $http.post('/wikipage',info)
        .success(function(ret) {
          if (ret.success) {
            if (clear) $scope.password = "";
            else console.log("Successfully added page password!")
          } else {
            //$scope.passwordError = ret.error || "There was an issue entering your password. Please try again.";
            console.log(ret);
          }

          loader.remove();
        })
        .error(function(data,err) {
          console.log(data,err);
          loader.remove();
        });
      }
    },

    enterPassword: function(pw) {
      delete($scope.passwordError);

      if (!pw) {
        $scope.passwordError = "Please enter a password to submit to gain access to the page."
      } else {
        new Core.Modals().alertPopup({loading:true});
        $http.post('/wikipage',{
          type: "password",
          page: $scope.pathname,
          password: pw
        })
        .success(function(ret) {
          if (ret.success) $scope.functions.reloadPage();
          else {
            $scope.passwordError = ret.error || "There was an issue entering your password. Please try again.";
            console.log(ret);
            angular.element( '#loader' ).remove();
          }
        })
        .error(function(data,err) {
          console.log(data,err);
          angular.element( '#loader' ).remove();
        });
      }
    },

    subscribe: {
      subscribeModal: function() {
        $scope.modalInstance = $modal.open({
          animation: true,
          templateUrl: 'subscribeContent.html',
          controller: 'wikiPageCtrl',
          size: "md"
        });
      },

      subscribeToPage: function(email,useAccount) {
        email = email || "";
        useAccount = useAccount || 'no';

        delete($scope.subscribeError);
        delete($scope.subscribeSuccess);

        if (useAccount=='yes' || (email && /^.+@.+\.[\w\d]{1,10}$/.test(email))) {
          $http.post('/wikipage',{
            type: "subscribe",
            page: $scope.pathname,
            useaccount: useAccount,
            email: email
          })
          .success(function(ret) {
            if (ret.success) $scope.subscribeSuccess = "You were successfully subscribed to this page! You will now receive notifications when the page is updated.";
            else {
              $scope.subscribeError = ret.error || "There was an issue entering your password. Please try again.";
              console.log(ret);
            }
          })
          .error(function(data,err) {
            $scope.subscribeError = err;
            console.log(data,err);
          });
        } else {
          $scope.subscribeError = "Please select to use your account e-mail address (if you're logged in) or enter a valid e-mail address above (e.g. email@company.com)";
        }
      }
    },

    likePage: function(unlike) {
      unlike = unlike || false;

      var info = {type:"like", page:$scope.pathname};
      if (unlike) {
        info.unlike = true;
        $scope.pageLikes--;
        $scope.canLike = true;
      } else {
        $scope.pageLikes++;
        $scope.canLike = false;
      }

      $http.post('/wikipage',info)
      .success(function(ret) {
        //console.log(ret);

        if (ret.success) {
          console.log("Successfully saved page like.");
        } else {
          console.log("Unsuccessful in liking page: ",ret);
        }
      })
      .error(function(data,err) {
        console.log(data,err);
      });
    },

    changeViewScope: function(scopeKey,index) {
      if (typeof $scope[scopeKey]!=="undefined" && $scope[scopeKey][index]) delete($scope[scopeKey][index].data);
    },

    replaceWithDraft: function() {
      var draft = $scope.content.draft.html;

      $scope.content.html = draft;
      $scope.template = $scope.content.draft.template || {};

      $scope.functions.rteInit();
      delete($scope.content.draft);
    },

    viewGroupSearch: function(search) {
      delete($scope.pageViewScopeGroupMembershipDone);

      $scope.functions.findAdObj(search,'group',function(err,results) {
        if (err) console.log(err);
        else {
          $scope.pageViewScopeGroupMembershipDone = true;
          $scope.pageViewScopeGroupMembershipResults = results || [];
        }
      });
    },

    viewUsernameSearch: function(search) {
      delete($scope.pageViewScopeUsernameDone);

      $scope.functions.findAdObj(search,'user',function(err,results) {
        if (err) console.log(err);
        else {
          $scope.pageViewScopeUsernameDone = true;
          $scope.pageViewScopeUsernameResults = results || [];
        }
      });
    },

    uploadFile: function(file,onlyStoreScopeKey,nestedKey) {
      if (onlyStoreScopeKey) {
        if (nestedKey) {
          $scope[nestedKey] = $scope[nestedKey] || {};
          return $scope[nestedKey][onlyStoreScopeKey] = file;
        }

        return $scope[onlyStoreScopeKey] = file;
      }

      delete($scope.fileError);

      var uploadType = $scope.functions.pageStateToUploadType();

      var loader = new Core.Modals().asyncLoader({message:"Saving your file. It will be added to the list shortly..."});
      Upload.upload({
        url: '/wikipage',
        file: file,
        fields: {
          type: uploadType,
          scope: $scope.fileUploadScope,
          page: $scope.pathname
        }
      })
      .success(function(data) {
        console.log(data);
        if (data.filesuccess) {
          var whichAry = ($scope.fileUploadScope=="page") ? "pagefiles" : "userfiles";
          $scope[whichAry].push(data.fileInfo);
        } else if (data.wordsuccess) {
          $scope.content.html = ($scope.content.html || "") + data.html;
          $scope.functions.rteInit();

          $scope.functions.changePageState("view");
        } else {
          $scope.fileError = data.error || "There was a problem uploading your file. Please try again.";
        }

        loader.remove();
      })
      .error(function(ret,_err) {
        console.log(ret,_err);
        $scope.fileError = "There was a problem uploading your file. Please try again.";
        loader.remove();
      });
    },

    deleteFile: function(filename,scope) {
      if (confirm("Are you sure you want to delete the file permanently? This is an irreversible action so the file cannot be recovered later.")) {
        var loader = new Core.Modals().asyncLoader({message:"Deleting the file. It will be removed to the list shortly..."});
        $http.post('/wikipage',{type:"deleteFile", filename:filename, scope:scope, page:$scope.pathname})
        .success(function(ret) {
          //console.log(ret);

          if (ret.success) {
            var whichAry = (scope=="page") ? "pagefiles" : "userfiles";
            $scope[whichAry] = $scope[whichAry].filter(function(file) {
              return file.filename != filename;
            });
          } else {
            $scope.fileError = ret.error || "There was an issue deleting your file. Please try again.";
          }

          loader.remove();
        })
        .error(function(data,err) {
          console.log(data,err);
          loader.remove();
        });
      }
    },

    deleteTemplateConfigFile: function(key,filename) {
      $http.post('/wikipage',{type:"deleteTemplateConfigFile", page:$scope.pathname, configKey:key, filename:filename})
      .success(function(ret) {
        if (ret.success) {
          console.log($scope.template.config[key]);
          $scope.template.config[key].splice($scope.template.config[key].indexOf(filename),1);
          console.log($scope.template.config[key]);
        } else {
          console.log("something went wrong",ret);
        }
      })
      .error(function(data,err) {
        console.log(data,err);
      });
    },

    updatePath: function(newPath) {
      if ($scope.pathname != newPath && $scope.pathname != "/"+newPath) {
        if (confirm("Are you sure you want to change the path? This will change the current location where users will find this page.")) {
          new Core.Modals().alertPopup({loading:true});
          $http.post('/wikipage',{type:"updatePath", page:$scope.pathname, newPath:newPath})
          .success(function(ret) {
            //console.log(ret);

            if (ret.success) location.href = (newPath.indexOf("/") == 0) ? newPath : "/"+newPath;
            else {
              $scope.newPathError = ret.error || "There was an issue updating the setting. Please try again.";
              angular.element( '#loader' ).remove();
            }
          })
          .error(function(data,err) {
            $scope.newPathError = err || "There was an issue updating the setting. Please try again.";
            console.log(data,err);
            angular.element( '#loader' ).remove();
          });
        }
      }
    },

    getTemplate: function(template,append) {
      append = append || false;

      new Core.Modals().alertPopup({loading:true});
      $http.post('/wikipage',{type:"getTemplate", template:template})
      .success(function(ret) {
        console.log(ret);
        $scope.templateSelection = "";

        if (ret.success) {
          $scope.template = $scope.template || {};

          $scope.template.templateId = ret.templateInfo._id;
          $scope.template.isEasyConfig = ret.templateInfo.isEasyConfig;
          $scope.template.config = {};
          $scope.template.masterConfig = ret.templateInfo.config || [];

          $scope.content.html = (append && $scope.template.isEasyConfig != "Yes") ? (($scope.content.html || "")+ret.html) : ret.html;

          $scope.functions.rteInit();
          $scope.handlers.initializeEdit(true);
          //$scope.functions.changePageState("view");
        } else $scope.error = ret.error || "There was a problem fetching the template. Please try again.";

        angular.element( "#loader" ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        $scope.templateSelection = "";
        angular.element( "#loader" ).remove();
      });
    },

    clearTemplate: function() {
      $scope.templateSelection = "";
      $scope.template = {};
      $scope.templateFiles = {};

      $scope.content.html = "";

      $scope.functions.rteInit();
      $scope.handlers.initializeEdit(true);
    },

    updatePageSetting: function(key,value) {
      var loader = new Core.Modals().asyncLoader({message:"Updating the setting..."});
      $http.post('/wikipage',{type:"updatePageSetting", page:$scope.pathname, key:key, value:value})
      .success(function(ret) {
        //console.log(ret);

        if (ret.success) console.log("Successfully updated setting with key: " + key);
        else console.log(ret.error);    //$scope.error = ret.error || "There was an issue updating the setting. Please try again.";

        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    },

    addPageComment: function(oComment) {
      delete($scope.newcommentError);

      if (!$scope.isLoggedIn) return $scope.newcommentError = "You must be logged in to add a comment.";
      if (!oComment || !oComment.content) return $scope.newcommentError = "Please make sure to add a comment to submit.";

      var loader = new Core.Modals().asyncLoader({message:"Adding your comment!"});
      $http.post('/wikipage',{type:"addComment", page:$scope.pathname, comment:oComment})
      .success(function(ret) {
        //console.log(ret);

        if (ret.success) {
          oComment = null
          $scope.pageComments.push(ret.comment);
        } else {
          $scope.newcommentError = ret.error;
        }

        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        $scope.newcommentError = "There was an issue adding your comment. Please try again or contact the administrator if the problem persists.";
        loader.remove();
      });
    },

    reviewVersion: function(versionDateTime) {
      var version = $scope.content.versions.filter(function(v) {
        return v.updated == versionDateTime;
      })[0];

      $scope.content.html = version.content_html;
      $scope.functions.rteInit();
    }
  };

  $scope.functions.initialize(window.wikiPageInitComplete);
}
