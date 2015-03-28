'use strict';

angular.module('myApp.directory', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/directory', {
    templateUrl: 'views/directory/directory.html',
    controller: 'DirectoryCtrl as WDC'
  });
}])

.controller('DirectoryCtrl', [
  'MyAppSession'
, 'LdsIoApi'
, '$location'
, 'StProgress'
, function (MyAppSession, LdsIoApi, $location, StProgress) {
  console.log("WDC HELLO");
  var WDC = this;

  WDC.loading = true;
  MyAppSession.requireSession().then(function (session) {
    StProgress.start(10 * 1000);
    LdsIoApi.profile(session).then(function (profile) {
      LdsIoApi.ward(session, profile.home_stake_id, profile.home_ward_id).then(function (ward) {
        console.info('ward');
        console.log(ward);

        WDC.ward = ward;

        LdsIoApi.wardPhotos(session, profile.home_stake_id, profile.home_ward_id).then(function (wardPhotos) {
          StProgress.stop();
          WDC.loading = false;
          console.info('wardPhotos');
          console.log(wardPhotos);

          WDC.wardPhotos = wardPhotos;
        });
      });
    });
  }, function (err) {
    console.error(err);
    WDC.loading = false;
    $location.url('/');
  });
}]);
