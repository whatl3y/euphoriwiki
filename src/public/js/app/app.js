import async from 'async'
import marked from 'marked'
import * as FastClick from 'fastclick'
import angularAnimate from 'angular-animate'
import angularMoment from 'angular-moment'
import ngTouch from 'angular-touch'
import ui_bootstrap from 'angular-ui-bootstrap'

import { commentsDir, subCommentsDir } from './directives/commentsDirectives'
import compileHtml from './directives/compileHtml'
import fileread from './directives/filereadDir'
import { subpageDir, subpageMemberDir } from './directives/subpageDirectives'
import wikiModuleDir from './directives/wikiModuleDir'

import adminDiffCtrl from './controllers/adminDiffCtrl'
import adminEventsCtrl from './controllers/adminEventsCtrl'
import adminModulesCtrl from './controllers/adminModulesCtrl'
import adminSettingsCtrl from './controllers/adminSettingsCtrl'
import adminTemplateMgmtCtrl from './controllers/adminTemplateMgmtCtrl'
import adminThemingCtrl from './controllers/adminThemingCtrl'
import adminVisitorsCtrl from './controllers/adminVisitorsCtrl'
import chatCtrl from './controllers/chatCtrl'
import globalCtrl from './controllers/globalCtrl'
import loginCtrl from './controllers/loginCtrl'
import MainHomeController from './controllers/mainHomeCtrl'
import wikiPageCtrl from './controllers/wikiPageCtrl'

// Make sure we put marked on the window scope
window.marked = marked

angular.module('Euphoriwiki',[angularAnimate,angularMoment,ngTouch,ui_bootstrap,'ngFileUpload'])
.run(function($rootScope,$filter) {
  // Initiate FastClick for mobile devices to remove the built-in 300ms
  // delay. Read more in https://github.com/ftlabs/fastclick
  angular.element(document).ready(function() {
    FastClick.attach(document.body)
  })

  $rootScope._async = async;

  $rootScope.unserialize = function(string) {
    string = (/^\?/.test(string)) ? string.substring(1) : string
    const a = string.split("&")
    let obj = {}
    for (let _i = 0; _i < a.length; _i++) {
      var _a = a[_i].split("=")
      obj[ decodeURIComponent(_a[0]) ] = decodeURIComponent(_a[1])
    }
    return obj
  }

  // can use the following to turn a number into American formatted dollars (i.e. 9999999.11111 > $9,999,999.11)
  $rootScope.formatMoney = function(number, afterDecimalNumbers, decimalChar, thousandsDelimiter) {
    let n = Number(number)
    c = afterDecimalNumbers || 2,
    c = isNaN(c = Math.abs(c)) ? 2 : c,
    d = decimalChar || '.',
    t = thousandsDelimiter || ',',
    s = n < 0 ? "-" : "",
    i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
    j = (j = i.length) > 3 ? j % 3 : 0
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "")
  }

  $rootScope.truncateRight = function(text, numChars, addEllipses=false) {
    if (text.length <= numChars) return text
    const ret = text.substring(text.length-numChars)
    return (addEllipses) ? `...${ret}` : ret
  }

  // These functions are used all over the place for hovering between relative and absolute dates.
  $rootScope.exactDate = function(dateString) { return $filter('date')(dateString, 'MMM d, y h:mm a') }
  $rootScope.relativeDate = function(dateString) { return $filter('amTimeAgo')(dateString) }
  $rootScope.formatDateTime = function(date) {        //assumes input date is UTC
    if (date instanceof Date || (typeof date === "string" && date.length)) {
      date = date.toString().replace("T"," ").replace("Z"," ");
      var dt = new Core.DateTime({date:date})
      return dt.convertUTCDateToLocal('uslong')
    } else {
      return ""
    }
  }
  $rootScope.css = {
    classes: {
      hasData: function(string) {
        string = string || ''
        return (string.length) ? 'has-success' : ''
      }
    }
  }

  const a = navigator.userAgent||navigator.vendor||window.opera
  $rootScope.isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))
})
.directive('fileread',fileread)
.directive('compileHtml',compileHtml)
.directive('wikiModule',wikiModuleDir)
.directive('subpage',subpageDir)
.directive('subpageMember',subpageMemberDir)
.directive('comments',commentsDir)
.directive('subComments',subCommentsDir)
.controller('globalCtrl',globalCtrl)
.controller('MainHomeController',MainHomeController)
.controller('loginCtrl',loginCtrl)
.controller('wikiPageCtrl',wikiPageCtrl)
.controller('chatCtrl',chatCtrl)
.controller('adminSettingsCtrl',adminSettingsCtrl)
.controller('adminDiffCtrl',adminDiffCtrl)
.controller('adminModulesCtrl',adminModulesCtrl)
.controller('adminEventsCtrl',adminEventsCtrl)
.controller('adminVisitorsCtrl',adminVisitorsCtrl)
.controller('adminTemplateMgmtCtrl',adminTemplateMgmtCtrl)
.controller('adminThemingCtrl',adminThemingCtrl);
