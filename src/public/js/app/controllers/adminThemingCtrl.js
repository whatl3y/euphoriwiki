export { adminThemingCtrl as default }

function adminThemingCtrl($scope,$http,Upload) {
  $scope.pathname = decodeURI(location.pathname);

  var layoutColumnsClasses = function(which) {
    var baseClass = "col-md-3";

    switch(which) {
      case "left":
        return baseClass + " pull-left";

      case "right":
        return baseClass + " pull-right";
    }

    return "";
  }

  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("init",{page:$scope.pathname},function(e,ret) {
        if (e) console.log(e);
        else {
          $scope.curLogo = ret.logo || null;
          $scope.curLogoPath = ($scope.curLogo) ? "/file/" + $scope.curLogo : "/public/images/euphoriwiki.png";

          $scope.homeBody = ret.homeBody || null;
          $scope.homeBodyFile = ($scope.homeBody) ? "/file/" + $scope.homeBody : null;

          $scope.columns = ret.addons;
        }
        //console.log(e,ret);
      });
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
          currentLogoFile: $scope.curLogo || "",
          logoLink: $scope.navLogoLink || ""
        }
      })
      .success(function(data) {
        if (data.success) {
          console.log(data.newLogo,typeof data.newLogo);
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
          $scope.homeBody = data.homeBody || null;
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
    },

    updateMainBodyColumns: function(columns) {
      for (var _key in columns) {
        columns[_key].classes = layoutColumnsClasses(columns[_key].alignment);
      }

      var loader = new Core.Modals().asyncLoader({message:"Updating your add-ons!"});
      $http.post('/admin/theming',{type:"updateAddOns", addons:columns})
      .success(function(ret) {
        console.log(ret);
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
