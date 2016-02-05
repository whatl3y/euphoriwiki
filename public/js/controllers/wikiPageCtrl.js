function wikiPageCtrl($scope,$http,$sce,Upload) {
  $scope.pathname = location.pathname;
  $scope.newPathname = location.pathname;
  
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
    editHtml: false,
    editMarkup: false,
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
    initialize: function() {
      angular.element("button#upload-file-word").on("click",function() {
        angular.element("#file-input-word").trigger("click");
      });
      
      angular.element("button#upload-file-main").on("click",function() {
        angular.element("#file-input-main").trigger("click");
      });
      
      new Core.Modals().alertPopup({loading:true});
      $http.post('/wikipage',{type:"init", page:$scope.pathname})
      .success(function(ret) {
        if (!ret.success) {
          $scope.error = ret.error;
        } else {
          $scope.exists = ret.exists;
          
          $scope.content = $scope.content || {};
          $scope.content.html = ret.html || "";
          $scope.content.markdown = ret.markdown || "";
          $scope.content.description = ret.description || "";
          $scope.content.person = ret.person || {};
          $scope.content.lastUpdate = ret.lastUpdate || null;
          $scope.content.versions = ret.versions;
          $scope.content.tags = ret.tags || [];
          $scope.content.draft = ret.draft || false;
          
          angular.element("#rte-editor").html( $scope.content.html );
          
          $scope.widgets = ret.widgets || {};
          $scope.subpages = ret.subpages || [];
          $scope.userfiles = ret.userFiles || [];
          $scope.pagefiles = ret.pageFiles || [];
          
          $scope.availablePageTemplates = (ret.pageTemplates || []).filter(function(p) {return p.type=="page";});
          $scope.availableComponentTemplates = (ret.pageTemplates || []).filter(function(p) {return p.type=="component";});
        }
        
        $scope.functions.rteInit(true);
        
        $scope.initcomplete = true;
        angular.element( '#loader' ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        angular.element( '#loader' ).remove();
      });
    },
    
    rteInit: function(bind) {
      var rteElement = angular.element("#rte-editor");
      rteElement.html( $scope.content.html );
      
      if (bind) {
        $('#rte-editor').wysiwyg({},function($editor) {
          $scope.content.html = $editor.html();
          $scope.functions.htmlToMarkdown( $scope.content.html )
        });
        
        //bind copy/paste event handler to RTE
        var cp = new Core.CopyPaste({elements:rteElement, cb:function(err,imgSrc) {
          if (err) console.log("Error while pasting content: " + err);
          else {
            $scope.content.html += "<div class='col-xs-12 col-sm-10 col-sm-offset-1 col-md-8 col-md-offset-2'><img class='img-responsive' src='" + imgSrc + "' /></div>";
            $scope.functions.rteInit();
          }
        }});
      }
    },
    
    objSize: function(obj) {
      return Object.size(obj);
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
    
    htmlToMarkdown: function(html) {
      var und = new upndown();
      und.convert(html || "",function(e,markdown) {
        if (e) {
          console.log(e);
          return;
        }
        
        $scope.content = $scope.content || {};
        $scope.$apply(function() {
          $scope.content.markdown = markdown || "";
        });
      });
    },
    
    markdownToHtml: function(markdown) {
      $scope.content = $scope.content || {};
      $scope.content.html = marked(markdown || "");
      $scope.functions.rteInit();
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
    
    formatDateTime: function(date) {        //assumes input date is UTC
      if (date instanceof Date || (typeof date==="string" && date.length)) {
        date = date.toString().replace("T"," ").replace("Z"," ");
        
        var dt=new Core.DateTime({date:date});
        return dt.convertUTCDateToLocal('uslong');
      } else {
        return "";
      }
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
    
    style: {
      tabState: function(isActive) {
        return (isActive) ? "active" : "";
      }
    }
  };
  
  $scope.handlers = {
    initializeEdit: function() {
      $scope.functions.changePageState('view');
      $scope.editState=!$scope.editState;
      
      console.log("edit page");
      //make ajax call to lock page
      /*
      $http.post('/wikipage',{type:"edit"})
      .success(function(ret) {
        if (ret.success) location.reload();
        else {
          $scope.saveError = ret.error || "There was an issue saving your data. Please try again.";
          console.log(ret);
        }
      })
      .error(function(data,err) {
        console.log(data,err);
      });
      */
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
      $http.post('/wikipage',{
        type: (draft) ? "updateDraft" : "update",
        delete: deleteDraft,
        page: $scope.pathname,
        html: $scope.content.html,
        markdown: $scope.content.markdown
      })
      .success(function(ret) {
        if (ret.success) location.reload();
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
    
    replaceWithDraft: function() {
      var draft = $scope.content.draft.html;
      
      $scope.content.html = draft;
      $scope.functions.htmlToMarkdown();
      $scope.functions.rteInit();
      delete($scope.content.draft);
    },
    
    uploadFile: function(file) {
      delete($scope.fileError);
      
      var uploadType = $scope.functions.pageStateToUploadType();
      
      var loader = new Core.Modals().asyncLoader({message:"Saving your file. It will be added to the list shortly..."});
      Upload.upload({
        url: '/wikipage',
        file: file,
        fields: {type:uploadType, scope:$scope.fileUploadScope, page:$scope.pathname}
      })
      .success(function(data) {
        console.log(data);
        if (data.filesuccess) {
          var whichAry = ($scope.fileUploadScope=="page") ? "pagefiles" : "userfiles";
          $scope[whichAry].push(data.fileInfo);
        } else if (data.wordsuccess) {
          $scope.content.html = ($scope.content.html || "") + data.html;
          $scope.functions.htmlToMarkdown($scope.content.html);
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
        //console.log(ret);
        
        if (ret.success) {
          $scope.content.html = (append) ? (($scope.content.html || "")+ret.html) : ret.html;
          $scope.content.markdown = $scope.functions.htmlToMarkdown($scope.content.html);
          
          $scope.functions.rteInit();
          //$scope.functions.changePageState("view");
        } else $scope.error = ret.error || "There was a problem fetching the template. Please try again.";
        
        angular.element( "#loader" ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        angular.element( "#loader" ).remove();
      });
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
    
    reviewVersion: function(versionDateTime) {
      var version = $scope.content.versions.filter(function(v) {
        return v.updated == versionDateTime;
      })[0];
      
      $scope.content.html = version.content_html;
      $scope.content.markdown = version.content_markdown;
      $scope.functions.rteInit();
    }
  };
  
  $scope.functions.initialize();
}