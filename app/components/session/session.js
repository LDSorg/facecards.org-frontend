'use strict';

angular
  .module('myApp.session', [])
  .service('MyAppSession', [
    '$window'
  , '$rootScope'
  , '$timeout'
  , '$q'
  , '$http'
  , 'StApiCache'
  , function StSession($window, $rootScope, $timeout, $q, $http, StApiCache) {
    var shared = { session: {} };
    var providerBase = 'https://lds.io';
    var apiPrefix = providerBase + '/api/ldsio';
    var myAppDomain = 'https://local.ldsconnect.org:8043';
    var myAppId = 'TEST_ID_9e78b54c44a8746a5727c972';
    //var oauthPrefix = providerBase + '/api/oauth3';

    // TODO track granted scopes locally
    function save(session) {
      localStorage.setItem('io.lds.session', JSON.stringify(session));
      return $q.when(session);
    }

    function restore() {
      if (shared.session.token) {
        return $q.when(shared.session);
      }

      shared.session = JSON.parse(localStorage.getItem('io.lds.session') || null) || {};
      if (shared.session.token) {
        return $q.when(shared.session);
      } else {
        return $q.reject(new Error("No Session"));
      }
    }

    function destroy() {
      if (!shared.session.token) {
        return $q.when(shared.session);
      }

      shared.session = {};
      localStorage.removeItem('io.lds.session');
      return StApiCache.destroy().then(function (session) {
        return session;
      });
    }

    function testToken(session) {
      // TODO cache this also, but with a shorter shelf life?
      return $http.get(
        apiPrefix + '/accounts'
      , { headers: { 'Authorization': 'Bearer ' + session.token } }
      ).then(function (resp) {
        var accounts = resp.data && resp.data.accounts || resp.data;
        var id;

        // TODO accounts should be an object
        // (so that the type doesn't change on error)
        if (!Array.isArray(accounts) || accounts.error) { 
          console.error("ERR acc", accounts);
          return $q.reject(new Error("could not verify session")); // destroy();
        }

        if (1 !== accounts.length) {
          console.error("SCF acc.length", accounts.length);
          return $q.reject(new Error("[SANITY CHECK FAILED] number of accounts: '" + accounts.length + "'"));
        }

        id = accounts[0].app_scoped_id || accounts[0].id;

        if (!id) {
          console.error("SCF acc[0].id", accounts);
          return $q.reject(new Error("[SANITY CHECK FAILED] could not get account id"));
        }

        session.id = id;
        session.ts = Date.now();

        return session;
      });
    }

    function logout() {
      // TODO also logout of lds.io
      return $http.delete(
        apiPrefix + '/session'
      , { headers: { 'Authorization': 'Bearer ' + shared.session.token } }
      ).then(function () {
        return destroy();
      });
    }

    function init() {
      // TODO delete stale sessions (i.e. on public computers)
      return restore().then(function (session) {
        // TODO check expirey
        return testToken(session);
      }, function () {
        silentLogin();
        return;
      });
    }

    function parseLogin(name, url) {
      // TODO return granted_scope and expires_at

      var match = url.match(/(^|\#|\?|\&)access_token=([^\&]+)(\&|$)/);
      var token;

      if (match) {
        token = match[2];
      }
        
      if (!token) {
        return $q.reject(new Error("didn't get token")); // destroy();
      }

      return $q.when(token);
    }

    function createLogin(d, oauthscope) {
      $window.completeLogin = function (name, url) {
        $window.completeLogin = null;

        parseLogin(name, url).then(function (token) {
          shared.session.token = token;
          // TODO rid token on reject
          return testToken(shared.session).then(save);
        }).then(d.resolve, d.reject);
      };

      var requestedScope = oauthscope || ['me'];

      var url = 'https://lds.io/api/oauth3/authorization_dialog'
        + '?response_type=token'
        + '&client_id=' + myAppId
          // TODO use referrer?
        + '&redirect_uri=' + myAppDomain + '/oauth-close.html?type=/providers/ldsio/callback/'
        + '&scope=' + encodeURIComponent(requestedScope.join(' '))
        + '&state=' + Math.random().toString().replace(/^0./, '')
        ;

      return url;
    }

    // This is for client-side (implicit grant) oauth2
    function silentLogin(oauthscope) {
      if (silentLogin._inProgress) {
        return silentLogin._inProgress;
      }

      var d = $q.defer();
      var url = createLogin(d, oauthscope); // resolves in createLogin
      var $iframe = $('<iframe src="' + url + '" width="800px" height="800px" frameborder="0"></iframe>');

      function removeIframe(data) {
        silentLogin._inProgress = null;
        $iframe.remove();
        return data;
      }

      function removeIframeErr(err) {
        silentLogin._inProgress = null;
        $iframe.remove();
        return $q.reject(err);
      }

      $('body').append($iframe);

      silentLogin._inProgress = d.promise.then(removeIframe, removeIframeErr);

      return silentLogin._inProgress;
    }

    function login(oauthscope) {
      var d = $q.defer();
      var url = createLogin(d, oauthscope);

      // This is for client-side (implicit grant) oauth2
      $window.open(url, 'ldsioLogin', 'height=720,width=620');

      return d.promise;
    }

    function requireSession() {
      return restore().then(function (session) {
        return session;
      }, function (/*err*/) {
        // TODO how to properly get callback from modal?
        $rootScope.rootShowLoginModal = true;
        $rootScope.rootLoginDeferred = $q.defer();
        $timeout(function () {
          $rootScope.rootShowLoginModalFull = true;
        }, 100);

        return $rootScope.rootLoginDeferred.promise;
      });
    }

    function checkSession() {
      return restore();
    }

    function onLogin(_scope, fn) {
      // This is better than using a promise.notify
      // because the watches will unwatch when the controller is destroyed
      _scope.__stsessionshared__ = shared;
      _scope.$watch('__stsessionshared__.session', function () {
        if (shared.session.id) {
          fn(shared.session);
        }
      }, true);
    }

    function onLogout(_scope, fn) {
      _scope.__stsessionshared__ = shared;
      _scope.$watch('__stsessionshared__.session', function () {
        if (!shared.session.token) {
          fn();
        }
      }, true);
    }

    init();

    return {
      restore: restore
    , destroy: destroy
    , login: login
    , logout: logout
    , onLogin: onLogin
    , onLogout: onLogout
    , checkSession: checkSession
    , requireSession: requireSession
    };
  }])
  ;
