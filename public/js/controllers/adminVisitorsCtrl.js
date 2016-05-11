function adminVisitorsCtrl($scope,$http) {
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("visitors",null,function(e,ret) {
        if (e) return console.log(e);
        
        $scope.visitors = ret.visitors;
      });
    },
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin',Object.merge({type:type},(data || {})))
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