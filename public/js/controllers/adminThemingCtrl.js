function adminThemingCtrl($scope,$http,Upload) {
  $scope.pathname = decodeURI(location.pathname);
  
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("init",{page:$scope.pathname},function(e,ret) {
        if (e) console.log(e);
        else {
          $scope.curLogo = ret.logo || null;
          $scope.curLogoPath = ($scope.curLogo) ? "/file/" + $scope.curLogo : "/public/images/euphoriwiki.png";
          
          $scope.homeBody = ret.homeBody || null;
          $scope.homeBodyFile = ($scope.homeBody) ? "/file/" + $scope.homeBody : null;
        }
        //console.log(e,ret);
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
    
    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin/theming',Object.merge({type:type},(data || {})))
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
    
    updateLogo: function(fileScopeKey) {
      var file = $scope[fileScopeKey] || null;
      
      var loader = new Core.Modals().asyncLoader({message:"Updating your logo!"});
      Upload.upload({
        url: '/admin/theming',
        file: file,
        fields: {
          type: "updateLogo",
          currentLogoFile: $scope.curLogo
        }
      })
      .success(function(data) {
        if (data.success) {
          $scope.curLogo = data.newLogo || null;
          $scope.curLogoPath = ($scope.curLogo) ? "/file/" + $scope.curLogo : "/public/images/euphoriwiki.png";
          
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
    
    updateMainPage: function(fileScopeKey) {
      var file = $scope[fileScopeKey] || null;
      
      var loader = new Core.Modals().asyncLoader({message:"Updating your home page body!"});
      Upload.upload({
        url: '/admin/theming',
        file: file,
        fields: {
          type: "updateMainBody",
          currentFile: $scope.homeBody
        }
      })
      .success(function(data) {
        if (data.success) {
          $scope.homeBodyFile = (data.homeBody) ? "/file/" + data.homeBody : null;
          
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
    }
  };
  
  $scope.functions.initialize();
}