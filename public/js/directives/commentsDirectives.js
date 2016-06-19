//a list of comments
function commentsDir() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      comments: "="
    },
    template: "<ul class='list-unstyled list-left'><sub-comments data-ng-repeat='(key,comment) in comments' comment='comment'></sub-comments></ul>"
  }
}

//single member of the subcomments
function subCommentsDir($compile) {
  return {
    restrict: "E",
    replace: true,
    scope: {
      comment: "="
    },
    template: "<li><span class='padding-small radius-sm'>{{ comment.content }}</span></li>",
    link: function($scope, $element, $attrs) {
      if (angular.isArray($scope.comment.subcomments) && $scope.comment.subcomments.length) {
        $element.append("<comments comments='comment.subcomments'></comments>");
        $compile($element.contents())($scope);
      }
    }
  }
}
