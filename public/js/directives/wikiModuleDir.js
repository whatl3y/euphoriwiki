function wikiModuleDir($compile,$http,$sce) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      id: "=",
      hide: "="
    },
    template: "<div><div class='module-placeholder text-center'><h3 class='padding-medium'><div><img style='width:30px;height:30px' src='/public/images/loader.gif' /></div><div>Loading Module...</div></h3></div></div>",
    link: function($scope, $element, $attrs) {
      var moduleId = $scope.id;
      var hide = $scope.hide || false;

      $scope.functions = {
        loadComplete: function(oInfo,returnInfo) {
          window.WikiModules = window.WikiModules || {};
          window.WikiModules[moduleId] = window.WikiModules[moduleId] || ((oInfo) ? oInfo : false);

          return (returnInfo) ? window.WikiModules[moduleId] : !!window.WikiModules[moduleId];
        },

        bindInfo: function(ret) {
          $scope.results = ret.results;
          $element.html(ret.template || "");
          $compile($element.contents())($scope);

          if (typeof ret.clientCode === "string" && ret.clientCode) {
            try {
              var DATA = $scope.results;
              eval(ret.clientCode);
            } catch(err) {
              console.log("Error evaling client code",err);
            }
          }
        },

        sanitizeHtml: function(html) {
          return $sce.trustAsHtml(html);
        }
      };

      if (moduleId) {
        if (!$scope.functions.loadComplete()) {
          var loader = new Core.Modals().asyncLoader({message:"Loading module..."});
          $http.post('/wikimodule',{type:"getModule", id:moduleId, path:decodeURI(location.pathname)})
          .success(function(ret) {
            //console.log(ret);
            if (ret.success) {
              $scope.functions.bindInfo(ret);
            } else {
              $element.replaceWith( "" );
              console.log(ret);
            }

            $scope.functions.loadComplete(ret);
            loader.remove();
          })
          .error(function(data,err) {
            console.log(data,err);
            $element.replaceWith( "" );
            $scope.functions.loadComplete({template:"<h2>Module not loaded, please provide a valid module ID.</h2>"});
            loader.remove();
          });
        } else {
          var ret = $scope.functions.loadComplete(null,true);
          $scope.functions.bindInfo(ret);
        }

      } else {
        if (hide) {
          $element.remove();
        } else {
          $element.html("<h2>Module not loaded, please provide a valid module ID.</h2>");
        }
      }
    }
  }
}
