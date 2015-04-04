'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'lds.io',
  'myApp.progress',
  'myApp.splash',
  'myApp.login',
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
    'LdsApiSession'
  , 'LdsApiRequest'
  , '$location'
  , function (LdsApiSession, LdsApiRequest, $location) {
  //var RC = this;

  console.info('root controller');
  LdsApiSession.checkSession().then(function (session) {
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
    'LdsApiSession'
  , 'LdsApiRequest'
  , '$location'
  , '$scope'
  , function (LdsApiSession, LdsApiRequest, $location, $scope) {
  var SC = this;

  LdsApiSession.onLogin($scope, function () {
    $location.url('/');
  });

  SC.login = function (/*name*/) {
    LdsApiSession.login().then(function (session) {
      $location.url('/');
      return LdsApiRequest.profile(session);
    }, function (err) {
      // just in case the session is bad
      LdsApiSession.logout();
      window.alert("Login failed: " + err.message);
    });
  };
}])
;

angular.module('myApp').controller('MyNavCtrl', [
    '$scope'
  , '$timeout'
  , '$window'
  , '$location'
  , '$http'
  , 'LdsApiSession'
  , 'LdsApiRequest'
  , function ($scope, $timeout, $window, $location, $http, LdsApiSession, LdsApiRequest) {

  var MNC = this;

  LdsApiSession.onLogin($scope, function (session) {
    MNC.session = session;
  });

  LdsApiSession.onLogout($scope, function () {
    MNC.session = null;
  });

  LdsApiSession.restore().then(function (session) {
    MNC.session = session;
  });

  MNC.login = function (/*name*/) {
    LdsApiSession.login().then(function (session) {
      return LdsApiRequest.profile(session, { expire: true }).then(function () {
        MNC.session = MNC.session;
      });
    }, function (err) {
      LdsApiSession.logout();
      window.alert("Login failed: " + err.message);
    });
  };

  MNC.logout = function (/*name*/) {
    LdsApiSession.logout();
  };
}]);

angular.module('myApp').run([
    '$rootScope'
  , '$timeout'
  , '$q'
  , 'LdsApi'
  , 'LdsApiSession'
  , function ($rootScope, $timeout, $q, LdsApi, LdsApiSession) {

  return LdsApi.init({
    appId: 'TEST_ID_9e78b54c44a8746a5727c972'
  , appVersion: '1.2.1'
  , invokeLogin: function () {
      // TODO how to properly get callback from modal?
      $rootScope.rootShowLoginModal = true;
      $rootScope.rootLoginDeferred = $q.defer();
      $timeout(function () {
        $rootScope.rootShowLoginModalFull = true;
      }, 100);

      return $rootScope.rootLoginDeferred.promise;
    }
  }).then(function (LdsApiConfig) {
    return LdsApiSession.backgroundLogin().then(function () {
      $rootScope.rootReady = true;
      $rootScope.rootDeveloperMode = LdsApiConfig.developerMode;
      console.warn("TODO set UI flag with notice when in developer mode");
    });
  });
}]);
