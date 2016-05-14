function adminTemplateMgmtCtrl($scope,$http) {
  $scope.functions= {
    initialize: function() {
      console.log("here");
    },
    
    updateAryLength: function(scopeKey,which) {
      scopeKey = scopeKey || "";
      which = which || "inc";
      
      switch(which) {
        case "inc":
          $scope[scopeKey] = $scope[scopeKey].concat({});
          break;
          
        case "dec":
          $scope[scopeKey].pop();
          break;
      }
    },
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin/events',Object.merge({type:type},(data || {})))
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
   
  };
  
  $scope.functions.initialize();
}