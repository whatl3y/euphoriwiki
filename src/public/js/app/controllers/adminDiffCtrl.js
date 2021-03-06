export { adminDiffCtrl as default }

function adminDiffCtrl($scope,$http,$sce) {
  $scope.functions= {
    initialize: function() {
      $scope.functions.ajax("init",null,function(e,ret) {
        if (e) console.log(e);
        else {
          $scope.previousProcesses = ret.processes;
        }
      });
    },

    ajax: function(type,data,cb) {
      var loader = new Core.Modals().asyncLoader({message:"Processing your request."});
      $http.post('/admin/diff',Object.merge({type:type},(data || {})))
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
    checkDir: function(dir) {
      delete($scope.message);

      if (dir) {
        $scope.functions.ajax("checkdir",{directory:dir},function(e,ret) {
          if (e) {
            $scope.message = {
              type: "danger",
              content: e
            };
          } else {
            $scope.message = {
              type: "success",
              content: "The directory you entered exists and can be processed!"
            };
          }
        });
      } else {
        $scope.message = {
          type: "danger",
          content: "Please put a valid directory before trying to check it."
        };
      }
    },

    processDir: function(dir,type) {
      type = type || "process";
      delete($scope.message);

      if (dir) {
        $scope.functions.ajax(type,{directory:dir},function(e,ret) {
          if (e) {
            $scope.message = {
              type: "danger",
              content: e
            };
          } else {
            $scope.message = {
              type: "success",
              content: ret.message
            };
          }
        });
      } else {
        $scope.message = {
          type: "danger",
          content: "Please put a valid directory before trying to process it."
        };
      }
    }
  };

  $scope.functions.initialize();
}
