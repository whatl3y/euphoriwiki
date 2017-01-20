export { subpageDir, subpageMemberDir }

//a list of subpages
function subpageDir() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      subpages: "=",
      link: "=",
      showChildren: "="
    },
    template: "<ul class='list-unstyled list-left-lg subpages'><subpage-member data-ng-repeat='(key,page) in subpages' subpage-member-key='key' subpage-member-val='page' subpage-member-link='link || \"\"' show-children='showChildren'></subpage-member></ul>"
  }
}

//single member of the subpage list
function subpageMemberDir($compile) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      subpageMemberLink: "=",
      subpageMemberKey: "=",
      subpageMemberVal: "=",
      showChildren: "="
    },
    template: "<li data-ng-show='showSelf'><span class='click glyphicon' data-ng-class='(showDirectChildren) ? \"glyphicon-triangle-bottom\" : \"glyphicon-triangle-right\"' data-ng-click='functions.showOrHideChildren()'></span><span class='padding-small radius-sm subpage-page'><a data-ng-href='{{ subpageMemberLink + " + '"/"' + " + subpageMemberKey }}'>{{ subpageMemberKey }}</a></span><!--<span><small>Some small text</small></span>--></li>",
    link: function($scope, $element, $attrs) {
      $scope.showDirectChildren = $scope.showChildren;
      $scope.showSelf = (!$scope.subpageMemberLink) ? true : !!$scope.$parent.showChildren;

      if (angular.isObject($scope.subpageMemberVal) && Object.size($scope.subpageMemberVal)) {
        $element.append("<subpage subpages='subpageMemberVal' link='subpageMemberLink + " + '"/"' + " + subpageMemberKey' show-children='showChildren'></subpage>");
        $compile($element.contents())($scope);
      } else {
        $scope.showDirectChildren = true;
      }
    },
    controller: function($scope) {
      $scope.$on("showDirectChildrenEvent",function(e,data) {
        var link = data.link;
        var show = data.showOrHide;

        if (link.split("/").length == $scope.subpageMemberLink.split("/").length-1) {
          if (show) $scope.showSelf = true;
          else $scope.showSelf = false;
        }
      });

      $scope.functions = {
        showOrHideChildren: function() {
          if (!$scope.expanded) {
            $scope.expanded = true;
            $scope.showDirectChildren = !$scope.showDirectChildren;

            $scope.$broadcast("showDirectChildrenEvent",{link:$scope.subpageMemberLink, showOrHide:$scope.showDirectChildren});

            setTimeout(function() {
              $scope.$apply(function() {
                $scope.expanded = false;
              });
            },500);
          }
        }
      }
    }
  }
}
