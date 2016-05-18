function adminSettingsCtrl($scope,$http,$sce) {
  $scope.settings = {};
  
  $scope.functions= {
    initialize: function() {
      new Core.Modals().alertPopup({loading:true});
      $http.post('/admin',{type:"init"})
      .success(function(ret) {
        if (ret.success) {
          $scope.settingsNav = ret.settings;
          $scope.settings = [];
          for (var _i = 0;_i<ret.settings.length;_i++) {
            if (!(_i%3)) $scope.settings.push([]);
            $scope.settings[$scope.settings.length-1].push(ret.settings[_i]);
          }
          
        } else {
          $scope.error = ret.error || "There was an issue saving your data. Please try again.";
          console.log(ret);
        }
        
        angular.element( '#loader' ).remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        angular.element( '#loader' ).remove();
      });
    },
    
    sanitizeHtml: function(html) {
      return $sce.trustAsHtml(html);
    },
    
    pushArray: function(array,value) {
      array = array || [];
      
      if (value) array.push(value);
    },
    
    titleCase: function(text) {
      return text.replace(/(\w)(\w*)/,function first(x,y,z) {return y.toUpperCase() + z.toLowerCase();});
    }
  };
  
  $scope.handlers = {
    saveSetting: function(settingKey,value) {
      var loader = new Core.Modals().asyncLoader({message:"Saving setting key: "+settingKey});
      $http.post('/admin',{type:"save", key:settingKey, value:value})
      .success(function(ret) {
        if (ret.success) console.log("Successfully saved setting key: "+settingKey);
        else {
          $scope.error = ret.error || "There was an issue saving your data. Please try again.";
          console.log(ret);
        }
        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
    },
    
    uploadFile: function(file,key) {
      $scope[key] = file;
    },
  };
  
  $scope.functions.initialize();
}