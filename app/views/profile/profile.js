'use strict';

angular.module('myApp.profile', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/profile', {
    templateUrl: 'views/profile/profile.html',
    controller: 'ProfileCtrl as MP'
  });
}])

.controller('ProfileCtrl', [
  'MyAppSession'
, 'LdsIoApi'
, '$location'
, function (MyAppSession, LdsIoApi, $location) {
  var MP = this;

  MyAppSession.requireSession().then(function (session) {
    console.error('profile the things');
    LdsIoApi.profile(session).then(function (profile) {
      console.info('profile');
      console.log(profile);

      var photoUrl = 'https://lds.io/api/ldsio/'
        + session.id + '/photos/individual/'
        + profile.individual_id + '/medium/'
        + profile.name + '.jpg'
        + '?access_token=' + session.token
        ;

      MP.profile = profile;
      MP.headshot = profile.photos[0] && photoUrl;
    });
  }, function () {
    $location.url('/');
  });
}]);
