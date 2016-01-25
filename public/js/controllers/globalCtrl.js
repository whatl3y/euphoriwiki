function globalCtrl($scope) {
	window.EuphoriwikiSocket=window.EuphoriwikiSocket || io(LOCAL_DATA.wshost);		//io(LOCAL_DATA.wshost+":"+LOCAL_DATA.port+LOCAL_DATA.namespace);
	
	$scope.global = {};
	$scope.functions= {
		initialize: function() {
			$scope.socketHandler=new Core.SocketHandler({
				$scope: $scope,
				socket: EuphoriwikiSocket,
				wshost: LOCAL_DATA.wshost,
				namespace: LOCAL_DATA.namespace,
				events: LOCAL_DATA.socketEvents
			});
			
			$scope.socketHandler.initialize();
			
			if (!(window.File && window.FileReader)) {
				$scope.global.error = "There are some components your browser doesn't support that we use to validate tickets. Please use another browser.";
			}
		}
	};
	
	$scope.functions.initialize();
}