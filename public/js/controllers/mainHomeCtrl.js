function mainHomeCtrl($scope,$http) {
  $scope.functions= {
    initialize: function() {
      var loader = new Core.Modals().asyncLoader({message:"Loading wiki page widgets..."});
      $http.post('/mainhome',{type:"getWidgets"})
      .success(function(ret) {
        if (!ret.success) {
          $scope.error = ret.error;
        } else {
          $scope.widgets = ret.widgets;
        }
        
        //console.log(ret);
        loader.remove();
      })
      .error(function(data,err) {
        console.log(data,err);
        loader.remove();
      });
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
  };
  
  $scope.handlers = {
    newPage: function(path) {
      path = path || "";
      if (path.length) {
        location.href = (path[0] == "/") ? path.substring(1) : path;
      } else {
        $scope.newPageError = "Please enter something for the path in order to navigate to that new page.";
      }
    }
  };
  
  $scope.functions.initialize();
}