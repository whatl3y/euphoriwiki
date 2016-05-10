//a list of subpages
function subpageDir() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      subpages: "=",
      link: "="
    },
    template: "<ul class='list-unstyled list-left subpages'><subpage-member data-ng-repeat='(key,page) in subpages' subpage-member-key='key' subpage-member-val='page' subpage-member-link='link || \"\"' show-children='showChildren'></subpage-member></ul>"
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
    template: "<li><span class='click glyphicon' data-ng-class='(showChildren) ? \"glyphicon-triangle-bottom\" : \"glyphicon-triangle-right\"' data-ng-click='showChildren = true'></span><span class='padding-small radius-sm subpage-page'><a data-ng-href='{{ subpageMemberLink + " + '"/"' + " + subpageMemberKey }}'>{{ subpageMemberKey }}</a></span><!--<span><small>Some small text</small></span>--></li>",
    link: function($scope, $element, $attrs) {
      if (angular.isObject($scope.subpageMemberVal) && Object.size($scope.subpageMemberVal)) {
        $element.append("<subpage subpages='subpageMemberVal' link='subpageMemberLink + " + '"/"' + " + subpageMemberKey' data-ng-show='showChildren'></subpage>");
        $compile($element.contents())($scope);
      } else {
        $scope.showChildren = true;
      }
    }
  }
}