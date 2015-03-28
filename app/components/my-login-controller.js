'use strict';

angular
  .module('myApp.login', [])
  .controller('MyLoginCtrl', [
    '$rootScope'
  , '$timeout'
  , 'MyAppSession'
  , function MyLoginCtrl($rootScope, $timeout, MyAppSession) {
    var MLC = this;

    function hide() {
      $rootScope.showLoginModalFull = false;
      // TODO use animate event?
      $timeout(function () {
        $rootScope.showLoginModal = false;
      }, 500);
    }

    MLC.login = function () {
      MyAppSession.login().then(function (session) {
        $rootScope.rootLoginPromise.resolve(session);
      }, function (err) {
        $rootScope.rootLoginPromise.reject(err);
      }).then(hide);
    };

    MLC.cancel = function () {
      $rootScope.rootLoginPromise.reject(new Error("login cancelled"));
      hide();
    };
  }])
  ;
