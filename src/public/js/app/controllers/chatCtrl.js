export { chatCtrl as default }

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
        },
        {
          Name: "chatCtrl_usertyping",
          Handler: function(data) {
            $scope.usersTyping = $scope.usersTyping || [];

            $scope.$apply(function() {
              if (!data.typing) {
                $scope.usersTyping = $scope.usersTyping.filter(function(user) {
                  return user.id != data.info.id;
                });
              } else {
                var alreadyCached = $scope.usersTyping.filter(function(user) {
                  return user.id == data.info.id;
                }).length;

                if (!alreadyCached) {
                  $scope.usersTyping.push(data.info);
                }
              }
            });

          }
        },
        {
          Name: "chatCtrl_error",
          Handler: function(warning) {
            $scope.functions.warning(warning);
          }
        }
      ]
    },

    warning: function(message,remove,fadeTime) {
      if (remove) return delete($scope.chatWarning);

      $scope.chatWarning = message;

      if (fadeTime !== -1) {
        setTimeout(function() {
          $scope.$apply(function() {
            delete($scope.chatWarning);
          });
        }, fadeTime || 5000);
      }
    },

    splitUsersTypingComma: function(ary) {
      ary = ary || [{}];
      ary = ary.map(function(a) {
        return a.name || a.user || "A guest";
      });

      return (ary || []).join(", ");
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
      //console.log(messages);
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
    },

    userTyping: function(text) {
      EuphoriwikiSocket.emit("usertyping",{room:$scope.pathname, val:text || ""});
    }
  };

  $scope.functions.initialize();
}
