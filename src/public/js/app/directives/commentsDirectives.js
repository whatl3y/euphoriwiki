export { commentsDir, subCommentsDir }

//a list of comments
function commentsDir() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      comments: "="
    },
    template: "<ul class='list-unstyled list-left page-comments'><sub-comments data-ng-repeat='(key,comment) in comments' comment='comment'></sub-comments></ul>"
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
    template: "<li class='comment'><div class='heading'>{{ (comment.firstname || 'Unknown') + ' ' + (comment.lastname || 'Unknown') }}</div><div class='soft-text'><small><small>{{ formatDateTime(comment.date) }}</small></small></div><div class='padding-medium'>{{ comment.content }}</div></li>",
    link: function($scope, $element, $attrs) {
      if (angular.isArray($scope.comment.subcomments) && $scope.comment.subcomments.length) {
        $element.append("<comments comments='comment.subcomments'></comments>");
        $compile($element.contents())($scope);
      }
    },
    controller: function($scope) {
      $scope.formatDateTime = function(date) {        //assumes input date is UTC
        if (date instanceof Date || (typeof date==="string" && date.length)) {
          date = date.toString().replace("T"," ").replace("Z"," ");

          var dt=new Core.DateTime({date:date});
          return dt.convertUTCDateToLocal('uslong');
        } else {
          return "";
        }
      }
    }
  }
}
