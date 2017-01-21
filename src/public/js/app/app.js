import * as FastClick from 'fastclick'

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
import mainHomeCtrl from './controllers/mainHomeCtrl'
import wikiPageCtrl from './controllers/wikiPageCtrl'

angular.module('Euphoriwiki',['ngFileUpload','ui.bootstrap','ngAnimate'/*,'ngCkeditor'*/],function($httpProvider) {
  // Use x-www-form-urlencoded Content-Type
  $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

  /**
   * The workhorse; converts an object to x-www-form-urlencoded serialization.
   * @param {Object} obj
   * @return {String}
   */
  var param = function(obj) {
    var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

    for(name in obj) {
      value = obj[name];

      if(value instanceof Array) {
        for(i=0; i<value.length; ++i) {
          subValue = value[i];
          fullSubName = name + '[' + i + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value instanceof Object) {
        for(subName in value) {
          subValue = value[subName];
          fullSubName = name + '[' + subName + ']';
          innerObj = {};
          innerObj[fullSubName] = subValue;
          query += param(innerObj) + '&';
        }
      }
      else if(value !== undefined && value !== null)
        query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
    }

    return query.length ? query.substr(0, query.length - 1) : query;
  };

  // Override $http service's default transformRequest
  $httpProvider.defaults.transformRequest = [function(data) {
    return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
  }];
})
.directive('fileread',fileread)
.directive('compileHtml',compileHtml)
.directive('wikiModule',wikiModuleDir)
.directive('subpage',subpageDir)
.directive('subpageMember',subpageMemberDir)
.directive('comments',commentsDir)
.directive('subComments',subCommentsDir)
.controller('globalCtrl',globalCtrl)
.controller('mainHomeCtrl',mainHomeCtrl)
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