function chatCtrl($scope,$http) {
  $scope.pathname = decodeURI(location.pathname);
  $scope.newPathname = decodeURI(location.pathname);
  
  $scope.functions = {
    initialize: function() {
      
      $scope.socketHandler=new Core.SocketHandler({
        $scope: $scope,
        socket: EuphoriwikiSocket,
        wshost: LOCAL_DATA.wshost,
        namespace: LOCAL_DATA.namespace || "/",
        events: this.chatSocketEvents()
      });
      
      $scope.socketHandler.initialize();
    },
    
    date: {
      formatDateTime: function(date) {        //assumes input date is UTC
        if (date instanceof Date || (typeof date==="string" && date.length)) {
          date = date.toString().replace("T"," ").replace("Z"," ");
          
          var dt=new Core.DateTime({date:date});
          return dt.convertUTCDateToLocal('uslong');
        } else {
          return "";
        }
      }
    },
    
    chatSocketEvents: function() {
      return [
        {
          Name: "chatCtrl_messages",
          Handler: this.bindMessages
        },
        {
          Name: "chatCtrl_chatmessage",
          Handler: function(message) {
            $scope.functions.updateMessages(message);
            
          }
        }
      ]
    },
    
    updateMessages: function(mes,type) {
      type = type || "push";
      
      $scope.$apply(function() {
        $scope.messages = $scope.messages || [];
        
        switch (type) {
          case "absolute":
            $scope.messages = mes;
            break;
            
          default:
            $scope.messages.push(mes);
        }
      });
      
      $scope.functions.chatWrapperScrollHandler();
    },
    
    bindMessages: function(messages) {
      console.log(messages);
      $scope.functions.updateMessages(messages,"absolute");
    },
    
    chatWrapperScrollHandler: function() {
      var go = function() {
        var scrollWrapper = $( ".chat-message-wrapper" );
        var chatList = scrollWrapper.find( "ul" );
        var messages = chatList.children( "li" );
        
        var numMessages = Math.floor(messages.length/2);
        var messageHeight = messages.first().outerHeight(true);
        var messagesInWrapper = Math.floor(scrollWrapper.outerHeight()/messageHeight);
        var messagePadding = 5;											//a padding that we can use to assume 5 messages determine a true scroll value
        
        var totalMessagesAgainstMessagesInWrapper = numMessages-messagesInWrapper-messagePadding;
        
        if (scrollWrapper.scrollTop() >= totalMessagesAgainstMessagesInWrapper*messageHeight) {
          scrollWrapper.scrollTop(numMessages*(messageHeight + 40));
          //scrollWrapper.animate({scrollTop:numMessages*messageHeight},10);
        }
      }
      
      if ($( ".chat-message-wrapper" ).length) {
        go();
      } else {
        $(function() {
          go();
        });
      }
    }
  };
  
  $scope.handlers = {
    submitMessage: function(message) {
      if (message) {
        $scope.chatMessage = "";
        EuphoriwikiSocket.emit("chatmessage",{room:$scope.pathname, msg:message});
      }
    }
  };
  
  $scope.functions.initialize();
}