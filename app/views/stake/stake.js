'use strict';

angular.module('myApp.stake', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/stake', {
    templateUrl: 'views/stake/stake.html',
    controller: 'StakeDirectoryController as SDC'
  });
}])

.controller('StakeDirectoryController', [
  'MyAppSession'
, 'LdsIoApi'
, '$location'
, function (MyAppSession, LdsIoApi, $location) {
  var SDC = this;

  SDC.loading = true;
  MyAppSession.requireSession().then(function (session) {
    LdsIoApi.profile(session).then(function (profile) {
      LdsIoApi.stake(session, profile.home_stake_id).then(function (stake) {
        console.info('stake');
        console.log(stake);

        SDC.stake = stake;
      });
      LdsIoApi.stakePhotos(session, profile.home_stake_id).then(function (stakePhotos) {
        SDC.loading = false;
        console.info('stakePhotos');
        console.log(stakePhotos);

        SDC.stakePhotos = stakePhotos;
      });
    });
  }, function () {
    SDC.loading = false;
    $location.url('/');
  });
}]);
