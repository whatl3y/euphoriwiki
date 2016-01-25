function fileread($window) {
	return {
		scope: {
			fileread: '='
		},
		link: function($scope,$element) {
			$element.bind('change', function (changeEvent) {
				if (window.File && window.FileReader) {
					var reader = new FileReader();
					reader.onload = function (loadEvent) {
						$scope.$apply(function () {
							$scope.fileread = loadEvent.target.result;
							$scope.$parent.handlers.newImageFile(changeEvent.target.files[0]);
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