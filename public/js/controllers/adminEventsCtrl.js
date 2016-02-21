function adminEventsCtrl($scope,$http) {
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("init",null,function(e,ret) {
        if (e) console.log(e);
        else {
          $scope.defaultEvents = ret.events || [];
          $scope.eventTypes = ret.eventTypes || [];
        }
      });
    },
    
    updateEventLength(which) {
      which = which || "inc";
      
      switch(which) {
        case "inc":
          $scope.defaultEvents = $scope.defaultEvents.concat({});
          break;
          
        case "dec":
          $scope.defaultEvents.pop();
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
    saveEvents: function(defaultEvents) {
      $scope.functions.ajax("save",{events:defaultEvents},function(e,ret) {
        if (e) console.log(e);
        else {
          console.log("Successfully saved events.");
        }
      });
    }
  };
  
  $scope.functions.initialize();
}