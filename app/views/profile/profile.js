'use strict';

angular.module('myApp.profile', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/profile', {
    templateUrl: 'views/profile/profile.html',
    controller: 'ProfileCtrl as MP'
  });
}])

.controller('ProfileCtrl', [ 'MyAppSession', function (MyAppSession) {
  var MP = this
    ;

  // sharing session data between the service
  MP.session = MyAppSession.session;
  MyAppSession.getProfile().then(function (profile) {
    console.info('profile');
    console.log(profile);
    var photoUrl = 'https://lds.io/api/ldsio/'
      + MP.session.id + '/photos/individual/'
      + profile.individual_id + '/medium/'
      + profile.name + '.jpg'
      + '?access_token=' + MP.session.token
      ;

    MP.profile = profile;
    MP.headshot = profile.photos[0] && photoUrl;
  });
}]);
