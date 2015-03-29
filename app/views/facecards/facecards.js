'use strict';

angular.module('facecards', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  var tpl = window.jQuery('.st-view-facecards').html();
  window.jQuery('.st-view-facecards').html(' ');
  $routeProvider.when('/play', {
    //templateUrl: 'views/facecards/facecards.html'
    template: tpl
  , controller: 'FacecardsController as FC'
  });
}])

.controller('FacecardsController', [
  '$scope'
, '$timeout'
, '$location'
, 'MyAppSession'
, 'StProgress'
, 'LdsIoApi'
, function ($scope, $timeout, $location, MyAppSession, StProgress, LdsIoApi) {
  var FC = this;
  var scope = this;
  var shuffle = window.knuthShuffle;
  var mine;
  var cardCache = {};

  MyAppSession.onLogout($scope, function () {
    $location.url('/');
  });

  MyAppSession.requireSession().then(function (session) {
    // TODO this should be a directive and I realize that.
    // I'm just to lazy to do it right, right now
    $location.url('/play');

    FC.flashMessage = "Downloading Ward / Stake info...";
    StProgress.start(4 * 1000);
    return LdsIoApi.profile(session).then(function (profile) {
      FC.flashMessage = "Downloading Ward directory...";
      StProgress.restart(6 * 1000, { style: "success" });
      return LdsIoApi.ward(session, profile.home_stake_id, profile.home_ward_id).then(function (/*ward*/) {
        FC.flashMessage = "Downloading Photo directory...";
        StProgress.restart(10 * 1000, { style: "warning" });
        return LdsIoApi.wardPhotos(session, session.home_stake_id, profile.home_ward_id).then(function (/*photos*/) {
          FC.flashMessage = "";
          StProgress.stop(350);
          startGame();
          // update roster with photourls
        });
      });
    }, function (err) {
      console.error("[ERROR] when downloading directories");
      console.log(err);
      FC.flashMessage = err.message || "Unknown error while downloading ...";
      StProgress.stop(350);
    });
  }, function (e) {
    console.error('[ERROR] require session');
    console.log(e);
    $location().url('/');
  });


  //
  // GAME
  //
  //
  function startGame() {
    // TODO select stake and ward
    MyAppSession.requireSession().then(function (session) {
      return LdsIoApi.profile(session).then(function (profile) {
        return LdsIoApi.ward(session, profile.home_stake_id, profile.home_ward_id).then(function (ward) {
          return LdsIoApi.wardPhotos(session, profile.home_stake_id, profile.home_ward_id).then(function (photos) {
            var memberMap = {};
            var photoMemberMap = {};
            var photoHomeMap = {};

            // TODO app_scoped_ids
            photos.members.forEach(function (m) {
              photoMemberMap[m.app_scoped_id || m.id] = m;
            });
            photos.families.forEach(function (h) {
              photoHomeMap[h.app_scoped_id || h.id] = h;
            });

            ward.members.forEach(function (m) {
              var id = m.app_scoped_id || m.id;
              var photo = photoMemberMap[id] || photoHomeMap[id] || null;

              memberMap[id] = m;

              // TODO check updated but deleted and flag in server api
              if (photo && photo.updated_at) {
                m.photoUrl = LdsIoApi.photoUrl(session, photo, 'medium', photo.type);
              }
            });

            return ward.members.filter(function (m) {
              return m.photoUrl;
            }).map(function (m) {
              return {
                id: m.app_scoped_id || m.id
              , photo: m.photoUrl
              , name: m.name + ' ' + m.surnames.join(' ')
              , callings: m.callings
              , gender: LdsIoApi.guessGender(m)
              , attempts: 0
              };
            });
          });
        }).then(function (cardables) {
          scope.goodCards = cardables.slice(0);
          scope.allCards = cardables.slice(0);
          scope.playAgain();
        });
      });
    });
  }

  scope.skip = function () {
    // TODO mark as missing picture
    scope.validCardCount -= 1;
    scope.goodCards.shift();
    nextCard();
  };

  scope.choose = function (i) {
    if (scope.card !== scope.choices[i]) {
      scope.misses[scope.card.id] = true;
      scope.missCount = Object.keys(scope.misses).length;
      //TODO scope.misses[scope.choices[i].id] = true;
      scope.choices[i].disabled = true;
      return;
    }

    if (!scope.misses[scope.card.id]) {
      scope.hits[scope.card.id] = true;
      scope.hitCount += 1;
    }

    // TODO mark against pic and wrong choice
    scope.choices.forEach(function (choice) {
      delete choice.disabled;
    });

    scope.goodCards.shift();
    nextCard();
  };

  function gameOver() {
    // do something
    scope.finished = true;
    // https://www.facebook.com/sharer/sharer.php?s=100&p[url]=http://www.otlcampaign.org/blog/2013/02/04/inconvenient-truth-education-reform&p[images][0]=http://www.otlcampaign.org/sites/default/files/journey-for-justice-mlk-memorial.jpg&p[title]=The+Inconvenient+Truth+of+Education+%27Reform%27!&p[summary]=Recent+events+have+revealed+how+market-driven+education+policies,+deceivingly+labeled+as+%22reform,%22+are+revealing+their+truly+destructive+effects+on+the+streets+and+in+the+corridors+of+government:
    scope.xfbShare = "https://www.facebook.com/sharer/sharer.php"
      + '?s=100'
      + '&p[title]=How+well+do+you+know+your+wardies?'
      + '&p[url]=http://facecards.org'
      + '&p[images][0]=http://facecards.org/images/logo-256px.png'
      + '&p[summary]=Fight+the+awkward.+Learn+the+names+of+your+ward+members.'
      ;
    return;
  }

  function preloadImage(card) {
    var id = card.id;
    if (cardCache[id]) {
      return;
    }
    cardCache[id] = { img: new Image() };
    cardCache[id].img.addEventListener('load', function () {
      cardCache[id].loaded = true;
    });
    cardCache[id].img.addEventListener('error', function () {
      cardCache[id].error = true;
    });
    cardCache[id].img.src = card.photo;
  }

  function nextCard() {
    var card = scope.goodCards[0];
    var id = scope.goodCards[0].id;

    // always be preloading the next 6 cards
    scope.goodCards.slice(0, 6).forEach(function (card) {
      preloadImage(card);
    });

    if (cardCache[id].loaded) {
      realNextCard();
      return;
    }
    if (cardCache[id].error) {
      scope.skip();
      return;
    }
    
    StProgress.start(2500);
    cardCache[id].img.addEventListener('load', function () {
      StProgress.stop(250);
      realNextCard();
      $scope.$apply();
    });
    cardCache[id].img.addEventListener('error', function () {
      scope.skip();
      $scope.$apply();
    });
  }

  function realNextCard() {
    // TODO skip cards without pics, but put those names in the deck
    var choices = [];
    var card;
    var i = 1;

    scope.card = card = scope.goodCards[0];
    if (!scope.card) {
      gameOver();
      return;
    }

    i = 1; // 0 is the definite card
    while (i < scope.goodCards.length && choices.length < 12) {
      if (card.gender === scope.goodCards[i].gender) {
        choices.push(scope.goodCards[i]);
      }
      i += 1;
    }

    // TODO why isn't this one 1 also?
    // BUG XXX when hanna was playing she had the same dude's name
    // appear as 2 (not just 1) of the 4 options.
    i = 0;
    while (i < scope.allCards.length && choices.length < 12) {
      if (card.gender === scope.allCards[i].gender) {
        choices.push(scope.allCards[i]);
      }
      i += 1;
    }

    shuffle(choices);
    choices = [scope.card, choices[0], choices[1], choices[2]];
    shuffle(choices);

    scope.choices = choices;

    if (!scope.card.photo) {
      console.warn('[MISSING PERSON REPORT]', scope.card);
      scope.skip();
      return;
    }
  }

  scope.shareOnFacebook = function () {
    var score = ((scope.hitCount / (scope.hitCount + scope.missCount)) * 100).toFixed(0)
      ;

    Facebook.ui(
      {
        method: 'feed',
        name: 'YSA Facecards',
        link: 'http://facecards.org',
        picture: 'http://facecards.org/images/logo-256px.png',
        caption: "I know " + score + "% of my ward members. How well do you know yours?",
        description: "Fight the awkward. Learn people's names!"
      },
      function(response) {
        if (response && response.post_id) {
          //window.alert('Post was published.');
        } else {
          //window.alert('Post was not published.');
        }
      }
    );
  };

  scope.playAgain = function () {
    scope.hits = {};
    scope.hitCount = 0;
    scope.misses = {};
    scope.missings = {};
    scope.validCardCount = scope.allCards.length;
    scope.finished = false;
    shuffle(scope.allCards);
    scope.goodCards = scope.allCards.slice(0);
    //loadsort(scope.allCards.slice(0));
    nextCard();
  };
}])
;
