function wikiModuleDir($compile,$http) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      id: "=",
      hide: "="
    },
    template: "<div><div class='module-placeholder text-center'><h3 style='padding:100px'><div><img style='width:30px;height:30px' src='/public/images/loader.gif' /></div><div>Loading Module...</div></h3></div></div>",
    link: function($scope, $element, $attrs) {
      var moduleId = $scope.id;
      var hide = $scope.hide || false;
      
      if (moduleId) {
        var loader = new Core.Modals().asyncLoader({message:"Loading your module..."});
        $http.post('/wikimodule',{type:"getModule", id:moduleId})
        .success(function(ret) {
          if (ret.success) {
            $scope.results = ret.results || null;
            
            $element.html(ret.template || "");
            $compile($element.contents())($scope);
          } else {
            $element.replaceWith( "" );
            console.log(ret);
          }
          
          loader.remove();
        })
        .error(function(data,err) {
          console.log(data,err);
          loader.remove();
        });
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