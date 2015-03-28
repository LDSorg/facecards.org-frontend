'use strict';

angular.module('myApp.progress', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/progress', {
    templateUrl: 'views/progress/progress.html',
    controller: 'ProgressController as PC'
  });
}])

.controller('ProgressController', [
  '$timeout'
, 'StProgress'
, function ($timeout, StProgress) {
  var PC = this;

  // TODO this should be a directive and I realize that.
  // I'm just to lazy to do it right, right now
  PC.progress = StProgress.scope;

  PC.start = function (expected, actual) {
    expected = expected * 1000;
    actual = actual * 1000;
    StProgress.start(expected);
    $timeout(function () {
      StProgress.stop(250);
    }, actual || expected);
  };
  PC.stop = function () {
    StProgress.stop(250);
  };
  PC.restart = function (expected, actual) {
    expected = expected * 1000;
    actual = actual * 1000;

    StProgress.restart(expected);
    $timeout(function () {
      StProgress.stop(250);
    }, actual || expected);
  };
}]);
