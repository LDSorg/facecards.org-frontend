'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.version',
  'myApp.profile',
  'myApp.directory',
  'myApp.cache',
  'myApp.api',
  'myApp.login',
  'myApp.session'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({ redirectTo: '/' });
  //$routeProvider.otherwise({ redirectTo: '/profile' });
}]);

angular.module('myApp').controller('MyNavCtrl', [
    '$scope'
  , '$timeout'
  , '$window'
  , '$http'
  , 'MyAppSession'
  , 'LdsIoApi'
  , function ($scope, $timeout, $window, $http, MyAppSession, LdsIoApi) {

  var MNC = this;

  MyAppSession.restore().then(function (session) {
    MNC.session = session;
  });

  MNC.login = function (/*name*/) {
    MyAppSession.login().then(function () {
      return LdsIoApi.profile({ expire: true });
    });
  };

  MNC.logout = function (/*name*/) {
    MyAppSession.logout();
  };
}]);
