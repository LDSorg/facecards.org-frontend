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
  console.log('logout');
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
    console.info("Game Start");
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

            console.log(ward.members[0]);
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
  /*
  scope.makeGuess = function (item, model, str) {
    if (str) {
      scope.guess = str;
    }

    scope.guess = scope.guess || '';

    console.log('guess', scope.guess);

    if (scope.guess.toLowerCase() === scope.card.name.toLowerCase()) {
      scope.goodCards.shift();
      nextCard();
    } else {
      scope.hint = scope.card.name.substr(0, scope.hint.length + 1);
      scope.guess = scope.hint;
    }
  };
  */

  scope.sortByName = function () {
    // TODO sort by first name
    return 0.5 - Math.random();
  };

  function nextCard() {
    // TODO skip cards without pics, but put those names in the deck
    var choices = []
      , card
      , i = 1
      ;

    scope.card = card = scope.goodCards[0];
    //scope.hint = '';
    //scope.guess = '';
    if (!scope.card) {
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

    i = 1; // 0 is the definite card
    while (i < scope.goodCards.length && choices.length < 12) {
      if (card.gender === scope.goodCards[i].gender) {
        choices.push(scope.goodCards[i]);
      }
      i += 1;
    }

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

    console.log('scope.card -- CHEATER NO CHEATING!!!');
    console.log(scope.card);

    if (!scope.card.photo) {
      console.log('[MISSING PERSON REPORT]', scope.card);
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

  function loadsort(cards) {
    var groups = [[], []];
    cards.forEach(function (card, i) {
      groups[i % groups.length].push(card);
    });
    groups.forEach(function (group) {
      preload(group);
    });
  }

  function preload(cards) {
    var card = cards.pop();
    var img;

    if (!card) {
      // done preloading
      return;
    }

    if (cardCache[card.id]) {
      return preload(cards);
    }

    img = new Image();
    img.onload = function () {
      cardCache[card.id] = true;
      return preload(cards);
    };
    img.onerror = function () {
      return preload(cards);
    };
    img.src = card.photo;
  }

  scope.playAgain = function () {
    scope.hits = {};
    scope.hitCount = 0;
    scope.misses = {};
    scope.missings = {};
    scope.validCardCount = scope.allCards.length;
    scope.finished = false;
    shuffle(scope.allCards);
    scope.goodCards = scope.allCards.slice(0);
    console.log('scope.goodCards');
    console.log(scope.goodCards);
    loadsort(scope.allCards.slice(0));
    nextCard();
  };

  function run() {
    /*
    var infog
      , rosterg
      ;
    */

    StProgress.start();
    LdsConnect.init().then(function (_mine) {
      console.log('mine');
      console.log(mine);
      mine = _mine;
      //loadStakes(me.currentStakes, me.currentUnits.stakeUnitNo);
      scope.stakes = mine.currentStakes;
      scope.units = mine.currentUnits;
      scope.groups = {
        brethren: true
      , sisters: true
      , leadership: true
      };
      scope.selectWard();
    });
  }
}])
;
