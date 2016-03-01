function wikiModuleDir($compile,$http) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      id: "=",
      hide: "="
    },
    template: "<div class='module-placeholder text-center'><h3 style='padding:100px'><div><img style='width:30px;height:30px' src='/public/images/loader.gif' /></div><div>Loading Module...</div></h3></div>",
    link: function($scope, $element, $attrs) {
      var moduleId = $scope.id;
      var hide = $scope.hide || false;
      
      if (moduleId) {
        console.log(moduleId);
        
        //go to server and get module information
        //$element.replaceWith("<div>GOTCHA!!!</div>");
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