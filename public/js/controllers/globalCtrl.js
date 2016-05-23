function globalCtrl($scope,$http) {
  window.EuphoriwikiSocket=window.EuphoriwikiSocket || io(LOCAL_DATA.wshost);    //io(LOCAL_DATA.wshost+":"+LOCAL_DATA.port+LOCAL_DATA.namespace);
  
  //setup event listener for hiding the header
  $scope.$on("hideAllOfHeader",function(_event,hide) {
    $scope.hideAllOfHeader = hide;
    //$scope.$broadcast("hideAllOfHeader",hide);
  });
  
  $scope.global = {};
  $scope.functions= {
    initialize: function() {
      $.autocompleteselect();
      
      $scope.socketHandler=new Core.SocketHandler({
        $scope: $scope,
        socket: EuphoriwikiSocket,
        wshost: LOCAL_DATA.wshost,
        namespace: LOCAL_DATA.namespace || "/",
        events: this.globalSocketEvents()
      }).initialize();
      
      EuphoriwikiSocket.emit("subscribe",{room:decodeURI(location.pathname)});
      
      this.setSearchQuery();
      
      if (!(window.File && window.FileReader)) {
        $scope.global.error = "There are some components your browser doesn't support that we use to validate tickets. Please use another browser.";
      }
      
      //check if there was an out of scope issue with viewing the page
      //and give feedback to the user if so.
      var notAuth = new Core.QueryString("auth").keyInQueryString();
      if (notAuth) {
        $scope.global.error = "You are not authorized to view page: " + notAuth + ". If you think this is an error please reach out to the wiki administrator(s) for assistance."
      }
      
      //go get all pages to be used in the quick search
      $http.post('/global',{type:"init"})
      .success(function(ret) {
        if (!ret.success) {
          $scope.allPages=[];
          console.log(ret);
        } else {
          $scope.allPages = ret.allpages;
          $scope.navLogo = (ret.logo) ? "/file/" + ret.logo : "/public/images/euphoriwiki.png";
          angular.element( 'select.allpages' ).autocompleteselect({
            placeholder: "Quick Page Search (3 character minimum)",
            inputclasses: "form-control input-xs"
          });
        }
      })
      .error(function(data,err) {
        console.log(data,err);
        //angular.element( '#loader' ).remove();
      });
      
      //----------------------------------------------------------------------
      //#global-error-wrapper is in layout.jade, and initially this
      //has a style attribute to set display property: none. As soon as the DOM
      //loads, we will remove that style attribute. This is needed to prevent showing angular
      //markup before all the JS has loaded on the page and the controller(s) have began initializing.
      angular.element( "#global-error-wrapper" ).removeAttr("style");
      //----------------------------------------------------------------------
    },
    
    globalSocketEvents: function() {
      return [
        {
          Name: "globalCtrl_subscribe",
          Handler: function(userData) {
            //console.log(userData);
            var name = "<strong>" + ((userData.firstname) ? userData.firstname + " " + userData.lastname : "A guest") + "</strong>";
            var loader = new Core.Modals().asyncLoader({message: name + " just joined the page!"});
            setTimeout(function() {
              loader.remove();
            }, 3000);
            
            $scope.$apply(function() {
              $scope.usersOnPage = $scope.usersOnPage || [];
              $scope.usersOnPage.push(userData);
              $scope.functions.showUsersOnPage();
            });
            
          }
        },
        {
          Name: "globalCtrl_populateclientlist",
          Handler: function(clients) {
            $scope.$apply(function() {
              $scope.usersOnPage = clients;
              $scope.functions.showUsersOnPage();
            });
          }
        },
        {
          Name: "globalCtrl_disconnect",
          Handler: function(socketId) {
            $scope.$apply(function() {
              $scope.usersOnPage = $scope.usersOnPage || [];
              $scope.usersOnPage = $scope.usersOnPage.filter(function(user) {
                return user.socketId != socketId;
              });
              
              $scope.functions.showUsersOnPage();
            });
            
          }
        }
      ]
    },
    
    showUsersOnPage: function() {
      $scope.usersOnPageSanitized = $scope.usersOnPage.map(function(u) {
        if (u.socketId == EuphoriwikiSocket.id) return Object.merge(u,{
          firstname: "You",
          lastname: ""
        });
        
        return u;
      });
    },
    
    setSearchQuery: function() {
      $scope.query = (location.pathname.indexOf("/search/")==0) ? decodeURI(location.pathname.replace("/search/","").replace("/","")) : "";
    }
  };
  
  $scope.handlers= {
    quickSearchSelect: function(path) {
      new Core.Modals().alertPopup({loading:true});
      location.href = path.path;
    },
    
    search: function(query) {
      query = query || "";
      if (query.length) {
        location.href = "/search/" + query;
      } else {
        $scope.searchError = "Please include some text to search the wiki for.";
      }
    }
  }
  
  $scope.functions.initialize();
}