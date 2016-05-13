function adminModulesCtrl($scope,$http,Upload) {
  $scope.pathname = decodeURI(location.pathname);
  
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("init",{page:$scope.pathname},function(e,ret) {
        if (e) console.log(e);
        else {
          $scope.modules = ret.modules || [];
          $scope.availableModules = ret.modules || [];
          $scope.moduleInstances = ret.instances || [];
        }
        //console.log(e,ret);
      });
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
    
    getModuleDescription: function(moduleKey) {
      moduleKey = moduleKey || null;
      if (moduleKey) return $scope.availableModules.filter(function(m){return m.key == moduleKey})[0].description || "";
      
      return "";
    },
    
    updateNewModuleConfigLength: function(which) {
      which = which || "inc";
      
      $scope.newModule = $scope.newModule || {};
      $scope.newModule.config = $scope.newModule.config || [];
      
      switch(which) {
        case "inc":
          $scope.newModule.config = $scope.newModule.config.concat({});
          break;
          
        case "dec":
          $scope.newModule.config.pop();
          break;
      }
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
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin/modules',Object.merge({type:type},(data || {})))
      .success(function(ret) {
        if (ret.success) cb(null,ret)
        else {
          cb(ret.error || "There was an issue processing your data. Please try again.");
        }
        
        loader.remove();
      })
      .error(function(data,err) {
        cb(err || "There was an issue processing your data. Please try again.",data);
        loader.remove();
      });
    }
  };
  
  $scope.handlers = {
    uploadFile: function(file,key) {
      $scope[key] = file;
    },
    
    createModule: function(fileScopeKey) {
      var file = $scope[fileScopeKey] || null;
      $scope.newModule = $scope.newModule || {};
      
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      Upload.upload({
        url: '/admin/modules',
        file: file,
        fields: {
          type: "uploadModule",
          module: $scope.newModule
        }
      })
      .success(function(data) {
        if (data.success) {
          $scope.modules = $scope.modules.filter(function(m) {
            return m.key != $scope.newModule.key;
          });
          $scope.modules.push(data.module);
          
        } else {
          console.log(data);
          $scope.error = data.error || "There was a problem creating your module. Please try again.";
        }
        
        loader.remove();
      })
      .error(function(ret,_err) {
        console.log(ret,_err);
        $scope.error = "There was a problem creating your module. Please try again.";
        loader.remove();
      });
    },
    
    editModule: function(oModule) {
      $scope.newModule = oModule || {};
      $scope.editPaneOpen = true;
    },
    
    deleteModule: function(key,template,scopeAryIndex) {
      if (key && confirm("Are you sure you want to delete this module? This is irreversible.")) {
        $scope.functions.ajax("deleteModule",{key:key, template:template},function(e,ret) {
          if (e) console.log(e);
          else $scope.modules.splice(scopeAryIndex,1);
        });
      }
    },
    
    saveModuleInstances: function(modules) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/wikipage',{type:"updatePageModules", page:$scope.pathname, modules:modules})
      .success(function(ret) {
        if (ret.success) $scope.functions.initialize();
        else console.log(ret);
        
        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    }
  };
  
  $scope.functions.initialize();
}