function adminSettingsCtrl($scope,$http,$sce) {
  $scope.settings = {};
  
  $scope.functions= {
    initialize: function() {
      new Core.Modals().alertPopup({loading:true});
      $http.post('/adminsettings',{type:"init"})
      .success(function(ret) {
        if (ret.success) $scope.settings = ret.settings;
        else {
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
      if (value) array.push(value);
    }
  };
  
  $scope.handlers = {
    saveSetting: function(settingKey,value) {
      var loader = new Core.Modals().asyncLoader({message:"Saving setting key: "+settingKey});
      $http.post('/adminsettings',{type:"save", key:settingKey, value:value})
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