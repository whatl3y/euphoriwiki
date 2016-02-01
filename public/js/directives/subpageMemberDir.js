function subpageMemberDir($compile) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      subpageMemberLink: "=",
      subpageMemberKey: "=",
      subpageMemberVal: "="
    },
    template: "<li><div class='padding-small radius-sm subpage-page'><a data-ng-href='{{ subpageMemberLink + " + '"/"' + " + subpageMemberKey }}'>{{ subpageMemberKey }}</a></div><!--<div><small>Some small text</small></div>--></li>",
    link: function($scope, $element, $attrs) {
      if (angular.isObject($scope.subpageMemberVal)) {
        $element.append("<subpage subpages='subpageMemberVal' link='subpageMemberLink + " + '"/"' + " + subpageMemberKey'></subpage>");
        $compile($element.contents())($scope);
      }
    }
  }
}