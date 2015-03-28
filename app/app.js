'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.version',
  'myApp.profile',
  'myApp.directory',
  'myApp.stake',
  'myApp.cache',
  'myApp.api',
  'myApp.login',
  'myApp.session',
  'myApp.progress',
  'steve.progress'
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

  MyAppSession.onLogin($scope, function (session) {
    MNC.session = session;
  });

  MyAppSession.onLogout($scope, function () {
    MNC.session = null;
  });

  MyAppSession.restore().then(function (session) {
    MNC.session = session;
  });

  MNC.login = function (/*name*/) {
    MyAppSession.login().then(function (session) {
      return LdsIoApi.profile(session, { expire: true });
    });
  };

  MNC.logout = function (/*name*/) {
    MyAppSession.logout();
  };
}]);
