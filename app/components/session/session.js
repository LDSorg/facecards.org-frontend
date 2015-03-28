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
    var session = {};
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
      session = JSON.parse(localStorage.getItem('io.lds.session') || null) || {};
      if (session.token) {
        return $q.when(session);
      } else {
        return $q.reject(new Error("No Session"));
      }
    }

    function destroy() {
      session = {};
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
        var accounts = resp.data;
        var id;

        // TODO accounts should be an object
        // (so that the type doesn't change on error)
        if (!Array.isArray(accounts) || accounts.error) { 
          return $q.reject(new Error("could not verify session")); // destroy();
        }

        id = accounts[0].appScopedId || accounts[0].id;
        session.id = id;

        return session;
      });
    }

    function logout() {
      // TODO also logout of lds.io
      return destroy();
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
      console.info('implicit grant url');
      console.log(url);

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
          session.token = token;
          return testToken(session).then(save).then(d.resolve, d.reject);
        });
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
      var $iframe = $('<iframe src="' + url + '" width="800px" height="800px" border="0"></iframe>');

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
        if (session.token) {
          return session;
        } else {
          // TODO how to properly get callback from modal?
          $rootScope.rootShowLoginModal = true;
          $rootScope.rootLoginPromise = $q.defer();
          $timeout(function () {
            $rootScope.rootShowLoginModalFull = true;
          }, 0);

          return $rootScope.loginPromise;
        }
      });
    }

    function checkSession() {
      return restore().then(function (session) {
        if (session.token) {
          return session;
        } else {
          return $q.reject(new Error("no session"));
        }
      });
    }

    /*
    function onLogin($scope, fn) {
    }

    function onLogout($scope, fn) {
    }
    */

    init();

    return {
      restore: restore
    , destroy: destroy
    , login: login
    , logout: logout
    //, onLogin: onLogin
    //, onLogout: onLogout
    , checkSession: checkSession
    , requireSession: requireSession
    };
  }])
  ;
