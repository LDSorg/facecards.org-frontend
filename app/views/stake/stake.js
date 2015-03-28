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
, 'StProgress'
, function (MyAppSession, LdsIoApi, $location, StProgress) {
  var SDC = this;

  SDC.loading = true;
  MyAppSession.requireSession().then(function (session) {
    StProgress.start(10 * 1000);
    LdsIoApi.profile(session).then(function (profile) {
      LdsIoApi.stake(session, profile.home_stake_id).then(function (stake) {
        console.info('stake');
        console.log(stake);

        SDC.stake = stake;
      });
      LdsIoApi.stakePhotos(session, profile.home_stake_id).then(function (stakePhotos) {
        StProgress.stop();
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
