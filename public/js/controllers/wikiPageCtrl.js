function wikiPageCtrl($scope,$http,$sce) {
	$scope.pathname = location.pathname;
	$scope.emptyPageError = "There is no content on this page yet. Feel free to add content now by cliking to Edit Page link at the top right of your page!";
	$scope.content = {};
	$scope.config = {
		ckOptions: {
			allowedContent: true,
			fullPage: true
		}
	};
	
	$scope.pageState = {
		view: true,
		editHtml: false,
		editMarkup: false,
		olderVersions: false
	};
	
	$scope.functions = {
		initialize: function() {
			new Core.Modals().alertPopup({loading:true});
			$http.post('/initwikipage',{type:"init", page:location.pathname})
			.success(function(ret) {
				if (!ret.success) {
					$scope.error = ret.error;
				} else {
					$scope.exists = ret.exists;
					
					$scope.content = $scope.content || {};
					$scope.content.html = ret.html || "";
					$scope.content.markdown = ret.markdown || "";
					$scope.content.person = ret.person || {};
					$scope.content.lastUpdate = ret.lastUpdate || null;
					$scope.content.versions = ret.versions || [];
				}
				
				$scope.initcomplete = true;
				angular.element( '#loader' ).remove();
			})
			.error(function(data,err) {
				console.log(data,err);
				angular.element( '#loader' ).remove();
			});
		},
		
		htmlToMarkdown: function(html) {
			var und = new upndown();
			und.convert(html || "",function(e,markdown) {
				if (e) {
					console.log(e);
					return;
				}
				
				$scope.content = $scope.content || {};
				$scope.$apply(function() {
					$scope.content.markdown = markdown || "";
				});
			});
		},
		
		markdownToHtml: function(markdown) {
			$scope.content = $scope.content || {};
			$scope.content.html = marked(markdown || "");
		},
		
		sanitizeHtml: function(html) {
			return $sce.trustAsHtml(html);
		},
		
		changePageState: function(activeState) {
			for (var _k in $scope.pageState) {
				if (activeState == _k) $scope.pageState[_k] = true;
				else $scope.pageState[_k] = false;
			}
		},
		
		reloadPage: function() {
			location.reload();
		},
		
		formatDateTime: function(date) {				//assumes input date is UTC
			if (date instanceof Date || (typeof date==="string" && date.length)) {
				date = date.toString().replace("T"," ").replace("Z"," ");
				
				var dt=new Core.DateTime({date:date});
				return dt.convertUTCDateToLocal('uslong');
			} else {
				return "";
			}
		},
		
		style: {
			tabState: function(isActive) {
				return (isActive) ? "active" : "";
			}
		}
	};
	
	$scope.handlers = {
		saveChanges: function() {
			delete($scope.saveError);
			
			if (!$scope.content || !$scope.content.html) {
				$scope.saveError = "Before saving, please ensure you have some content you want to display on the page.";
				return;
			}
			
			new Core.Modals().alertPopup({loading:true});
			$http.post('/initwikipage',{type:"update", page:location.pathname, html:$scope.content.html, markdown:$scope.content.markdown})
			.success(function(ret) {
				if (ret.success) location.reload();
				else {
					$scope.saveError = ret.error || "There was an issue saving your data. Please try again.";
					console.log(ret);
				}
				
				angular.element( '#loader' ).remove();
			})
			.error(function(data,err) {
				console.log(data,err);
				angular.element( '#loader' ).remove();
			});
		},
		
		reviewVersion: function(versionDateTime) {
			var version = $scope.content.versions.filter(function(v) {
				return v.updated == versionDateTime;
			})[0];
			
			$scope.content.html = version.content_html;
			$scope.content.markdown = version.content_markdown;
		}
	};
	
	$scope.functions.initialize();
}