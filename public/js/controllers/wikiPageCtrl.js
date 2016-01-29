function wikiPageCtrl($scope,$http,$sce,Upload) {
  $scope.pathname = location.pathname;
  $scope.pagePieces = LOCAL_DATA.EXTRA.pagePieces;
  $scope.emptyPageError = "There is no content on this page yet. Feel free to add content now by cliking to Edit Page link at the top right of your page!";
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
          $scope.content.versions = ret.versions || [];
          $scope.content.tags = ret.tags || [];
          
          $scope.widgets = ret.widgets || {};
          $scope.subpages = ret.subpages || [];
          $scope.userfiles = ret.userFiles || [];
        }
        
        //console.log(ret);
        
        $scope.initcomplete = true;
        angular.element( '#loader' ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        angular.element( '#loader' ).remove();
      });
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
    
    saveChanges: function() {
      delete($scope.saveError);
      
      if (!$scope.content || !$scope.content.html) {
        $scope.saveError = "Before saving, please ensure you have some content you want to display on the page.";
        return;
      }
      
      new Core.Modals().alertPopup({loading:true});
      $http.post('/wikipage',{
        type: "update",
        page: location.pathname,
        description: $scope.content.description,
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
    
    uploadFile: function(file) {
      delete($scope.fileError);
      
      var uploadType = $scope.functions.pageStateToUploadType();
      
      var loader = new Core.Modals().asyncLoader({message:"Saving your file. It will be added to the list shortly..."});
      Upload.upload({
        url: '/wikipage',
        file: file,
        fields: {type:uploadType}
      })
      .success(function(data) {
        console.log(data);
        if (data.filesuccess) {
          $scope.userfiles.push(data.fileInfo);
        } else if (data.wordsuccess) {
          $scope.content.html = ($scope.content.html || "") + data.html;
          $scope.functions.htmlToMarkdown($scope.content.html);
          
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
    
    deleteFile: function(filename) {
      if (confirm("Are you sure you want to delete the file permanently? This is an irreversible action so the file cannot be recovered later.")) {
        var loader = new Core.Modals().asyncLoader({message:"Deleting the file. It will be removed to the list shortly..."});
        $http.post('/wikipage',{type:"deleteFile", filename:filename})
        .success(function(ret) {
          //console.log(ret);
          
          if (ret.success) {
            $scope.userfiles = $scope.userfiles.filter(function(file) {
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
    
    updateTags: function() {
      var loader = new Core.Modals().asyncLoader({message:"Updating your widget configuration now..."});
      $http.post('/wikipage',{type:"updateTags", page:$scope.pathname, tags:$scope.content.tags})
      .success(function(ret) {
        //console.log(ret);
        
        if (ret.success) console.log("Successfully updated tags");
        else $scope.error = ret.error || "There was an issue updating your tags. Please try again.";
        
        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    },
    
    updateWidgets: function() {
      var loader = new Core.Modals().asyncLoader({message:"Updating your widget configuration now..."});
      $http.post('/wikipage',{type:"updateWidgets", page:$scope.pathname, widgets:$scope.widgets})
      .success(function(ret) {
        //console.log(ret);
        
        if (ret.success) console.log("Successfully updated widgets");
        else $scope.error = ret.error || "There was an issue updating your widgets. Please try again.";
        
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
    }
  };
  
  $scope.functions.initialize();
}