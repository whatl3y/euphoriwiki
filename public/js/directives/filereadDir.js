function fileread($window) {
  return {
    scope: {
      fileread: "=",
      mainkey: "=",
      nested: "="
    },
    link: function($scope,$element,$attrs) {
      $element.bind('change', function (changeEvent) {
        if (window.File && window.FileReader) {
          var reader = new FileReader();
          reader.onload = function (loadEvent) {
            $scope.$apply(function () {
              //$scope.fileread = loadEvent.target.result;
              var file = ($attrs.multiple) ? changeEvent.target.files : changeEvent.target.files[0];
              $scope.$parent.handlers.uploadFile(file,$scope.mainkey || $attrs.fileread,$attrs.nested);
            });
          }
          if (changeEvent.target.files[0]) reader.readAsDataURL(changeEvent.target.files[0]);
          // or all selected files:
          // scope.fileread = changeEvent.target.files;
        } else {
          console.log("FileReader or File is not supported in this browser, so can't do a file upload...");
        }
      });
    }
  }
}