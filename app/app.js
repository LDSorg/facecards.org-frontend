'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.version',
  'myApp.profile',
  'myApp.directory',
  'myApp.session'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({ redirectTo: '/profile' });
}]);

angular.module('myApp').controller('MyNavCtrl', [
    '$scope'
  , '$timeout'
  , '$window'
  , '$http'
  , 'MyAppSession'
  , function ($scope, $timeout, $window, $http, MyAppSession) {

  var MNC = this;

  MyAppSession.restore().then(function (session) {
    MNC.session = session;
  });

  MNC.login = function (/*name*/) {
    MyAppSession.login();
  };

  MNC.logout = function (/*name*/) {
    MyAppSession.logout();
  };
}]);
