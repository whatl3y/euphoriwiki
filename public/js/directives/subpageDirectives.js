//a list of subpages
function subpageDir() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      subpages: "=",
      link: "="
    },
    template: "<ul class='list-unstyled list-left subpages border-left border-soft'><subpage-member ng-repeat='(key,page) in subpages' subpage-member-key='key' subpage-member-val='page' subpage-member-link='link||" + '""' + "'></subpage-member></ul>"
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