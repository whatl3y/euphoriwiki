function loginCtrl($scope,$http) {
  $scope.functions = {
    returnClassHasData: function(data) {
      return ((data || "").length) ? "has-success": "";
    }
  };
  
  $scope.handlers = {
    loginSubmission: function(data) {
      data = data || {};
      delete($scope.error);
      
      if (data.username && data.password) {
        new Core.Modals().alertPopup({loading:true});
        $http.post('/login',{username:data.username, password:data.password})
        .success(function(ret) {
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
          console.log(data,err);
          angular.element( '#loader' ).remove();
        });
      } else {
        $scope.error = "Please fill out the form completely to log in.";
      }
    }
  };
}