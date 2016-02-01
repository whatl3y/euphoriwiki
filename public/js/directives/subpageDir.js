function subpageDir($window) {
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