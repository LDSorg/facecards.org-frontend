'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.cache',
  'myApp.api',
  'myApp.login',
  'myApp.session',
  'myApp.progress',
  'myApp.splash',
  'facecards',
  'steve.progress'
])
.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({ redirectTo: '/' });
  //$routeProvider.otherwise({ redirectTo: '/profile' });
}])
;

angular.module('myApp.splash', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    template: '<p>Error: Should have redirected to either /login or /play</p>'
  , controller: 'RootController as RC'
  });
}])
.controller('RootController', [ 
    'MyAppSession'
  , 'LdsIoApi'
  , '$location'
  , function (MyAppSession, LdsIoApi, $location) {
  //var RC = this;

  console.info('root controller');
  MyAppSession.checkSession().then(function (session) {
    console.info('root controller checked');
    if (session.token) {
      $location.url('/play');
    } else {
      $location.url('/login');
    }
  }, function () {
    $location.url('/login');
  });
}])
.config(['$routeProvider', function($routeProvider) {
  var tpl = window.jQuery('.st-view-splash').html();
  window.jQuery('.st-view-splash').html(' ');
  $routeProvider.when('/login', {
    template: tpl
  , controller: 'SplashController as SC'
  });
}])
.controller('SplashController', [ 
    'MyAppSession'
  , 'LdsIoApi'
  , '$location'
  , function (MyAppSession, LdsIoApi, $location) {
  var SC = this;

  SC.login = function (/*name*/) {
    MyAppSession.login().then(function (session) {
      $location.url('/play');
      return LdsIoApi.profile(session);
    });
  };
}])
;

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
