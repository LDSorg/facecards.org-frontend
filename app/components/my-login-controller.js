'use strict';

angular
  .module('myApp.login', [])
  .controller('MyLoginCtrl', [
    '$rootScope'
  , '$timeout'
  , 'LdsApiSession'
  , function MyLoginCtrl($rootScope, $timeout, LdsApiSession) {
    var MLC = this;

    function hide() {
      $rootScope.rootShowLoginModalFull = false;
      // TODO use animate event?
      $timeout(function () {
        $rootScope.rootShowLoginModal = false;
      }, 500);
    }

    MLC.login = function () {
      LdsApiSession.login().then(function (session) {
        $rootScope.rootLoginDeferred.resolve(session);
      }, function (err) {
        $rootScope.rootLoginDeferred.reject(err);
      }).then(hide);
    };

    MLC.cancel = function () {
      $rootScope.rootLoginDeferred.reject(new Error("login cancelled"));
      hide();
    };
  }])
  ;
