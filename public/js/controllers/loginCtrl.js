function loginCtrl($scope,$http) {
  $scope.functions = {
    initialize: function() {
      $scope.functions.ajax("authTypes",null,function(err,data) {
        if (err) return console.log(err);
        $scope.authTypes = data.types;
      });
    },
    
    returnClassHasData: function(data) {
      return ((data || "").length) ? "has-success": "";
    },
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/login',Object.merge({type:type},(data || {})))
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
    loginSubmission: function(data) {
      data = data || {};
      delete($scope.error);
      
      if (data.username && data.password) {
        new Core.Modals().alertPopup({loading:true});
        $http.post('/login',{type:"loginLocal", username:data.username, password:data.password})
        .success(function(ret) {
          console.log(ret);
          if (ret.success) {
            if (location.pathname == "/") location.href = "/";
            else location.reload();
          } else {
            $scope.error = ret.error;
            console.log(ret.debug);
            angular.element( '#loader' ).remove();
          }
        })
        .error(function(data,err) {
          $scope.error = "There was an error logging you in. Please make sure your username and password are correct and try again.";
          console.log(data,err);
          angular.element( '#loader' ).remove();
        });
      } else {
        $scope.error = "Please fill out the form completely to log in.";
      }
    }
  };
  
  $scope.functions.initialize();
}