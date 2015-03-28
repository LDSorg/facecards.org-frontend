'use strict';

angular.module('steve.progress', [])
  .service('StProgress', function StProgress($timeout, $q) {
    // AngularJS will instantiate a singleton by calling "new" on this function

    var Progress = { scope: {} }
      , d = $q.defer()
      ;

    Progress.messages = [
      "Waiting the wait"
    , "Breaking bad"
    , "Taking a number"
    , "Taking a long time"
    , "Bathroom break"
    , "Taking a coffee break (is that okay?)"
    , "Filling out paperwork"
    , "Using a black or blue ball point pen"
    , "Watching the pot boil"
    , "Keeping promises"
    , "Configurating the configurations"
    , "Authenticating with the authorities"
    , "Duct taping the ducks"
    , "Cleaning all the things"
    , "Watching cat videos"
    , "Streaming digital content"
    , "Checking facebook"
    , "Waiting for the hot water to turn on"
    , "Checking out Beiber's twitter feed"
    , "Wow! More cat videos"
    , "Setting phasers to stun"
    , "Plunging the pipework"
    , "Rescuing the princess"
    , "Making the horizons vertical"
    , "Loading"
      // Matrix
    , "Going down the rabbit hole"
    , "Taking the red pill"
      // Finding Nemo
    , "Finding nemo"
      // Zoolander
    , "Being ridiculously good-looking"
    , "Remembering thinking \"wow, you're ridiculously good looking\""
    , "Building a building at least... three times bigger than this"
      // Harry Potter
    , "Destroying Horcruxes"
      // Gravity
    , "Making it down there in one piece"
      // Psych
    , "Fist bumping"
    , "Having great hair"
      // Chuck
    , "Flashing on the intersect"
      // Doctor Who
    , "Running"
    , "Allons-y-ing"
      // Emperor's new Groove
    , "Throwing off the groove"
    , "Pulling the lever"
    , "Leading you down the path of righteousness"
    , "Leading you down the path that rocks"
    , "And I'm one of those two, right?"
      // Princess Bride
    , "Finding true love" // ??
    , "Building up an immunity to iocane powder"
    , "Blaving"
      // BTTF
    , "Going back to the future"
    , "Getting to 88 miles per hour"
    , "Generating 1.21 gigawatts"
      // Toy Story
    , "Riding like the wind"
      // Mary Poppins
    , "Tidying up the nursery"
      // OUYA!
      // https://devs.ouya.tv/update_strings.txt
    , "Preparing to televise the Revolution"
    , "Downloading awesome sauce"
    , "Maximizing fun level"
    , "Shifting bits"
    , "Tasting rainbows"
    , "Herding cats"
    , "Aligning synergies"
    , "Shooting stars"
    , "Well, I never!"
    , "Bending genres"
    , "Stretching analogies"
    , "Calculating odds"
    , "Peeling away layers"
    , "Reducing complexity"
    , "Opening flaps"
    , "Inventing emoticons"
    , "Sharpening skates"
    , "Keeping calm"
    , "Refactoring bezier curves"
    , "We Must Perform A Quirkafleeg"
    //, "To be honest, just downloading a firmware update"
    , "To be honest, just downloading data"
    , "Rearranging deckchairs"
    , "Arming Photon Torpedoes"
    , "Adding the fun"
      // STAR WARS
      // http://www.rebellegion.com/forum/viewtopic.php?t=44301&start=0&sid=7de4a81df6ce49432b1d35dd7f15b650
    , "Staying on target"
    , "Looking at the size of that thing"
    , "Watching for enemy fighters"
    , "Staying in formation"
    , "Blowing this thing so we can go home"
    , "Making the jump to lightspeed"
    , "Destroying the Death Star"
    , "Locking S-foils in attack position"
    , "Accelerating to attack speed"
    ].sort(function () { return 0.5 - Math.random(); });

    Progress.start = function (timeEstimate) {
      console.log('starting progress');
      var me = this;
      var total = 100;                          // 100%
      var updateRate = 250;                     // milliseconds
      var numSteps = timeEstimate / updateRate; // if it takes 6 seconds it will be 12 steps
      var step = total / numSteps;              // each step would be 8.33% if there are 12 steps
      var msgUpdateRate = 2000;                 // milliseconds

      if (me._started) {
        console.log("already started");
        return;
      }
      me._started = Date.now();
      me.scope.elapsed = 1000;
      me.scope.remaining = timeEstimate;
      me.scope.progress = 0;

      function updateProgress() {
        // Goal get the counter to 75% by the estimated time

        console.log(step);
        me.scope.progress += step;
        if (me.scope.progress >= 105) {
          me.scope.progress = 70;
        }
        me.scope.elapsed = Date.now() - me._started;
        me.scope.remaining = timeEstimate - me.scope.elapsed;
        if (me.scope.remaining < 0) {
          me.scope.remainingMsg = '';
        } else {
          me.scope.remainingMsg = (me.scope.remaining/1000).toFixed(0) + 's'; 
        }
        me._timer2 = $timeout(updateProgress, updateRate);
      }

      function update() {
        function innerUpdate() {
          console.log('Hello!', me.scope.message);
          me.scope.message = Progress.messages[me._count % Progress.messages.length] + '...';
          me._count += 1;
          me._timer = $timeout(innerUpdate, msgUpdateRate);
        }
        innerUpdate();
      }

      me._count = me._count || 0;
      update();
      updateProgress();
    };
    Progress.stop = function (time) {
      console.log('stopping progress');
      var me = this;
      me.scope.progress = 100; // total %
      $timeout.cancel(me._timer);
      $timeout.cancel(me._timer2);
      return $timeout(function () {
        me._started = 0;
        me.scope.progress = 0; // total %
        me.scope.message = '';
      }, (time || 0) + 250);
    };
    Progress.subscribe = function (fn) {
      d.then(null, null, fn);
    };
    Progress.restart = function (time) {
      Progress.stop(250).then(function () {
        Progress.start(time);
      });
    };

    return Progress;
  });
