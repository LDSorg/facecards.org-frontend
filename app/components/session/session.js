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
    //var oauthPrefix = providerBase + '/api/oauth3';
    var logins = {};
    var myAppDomain;
    var myAppId;
    
    // note: host includes 'port' when port is non-80 / non-443
    myAppDomain = $window.location.protocol + '//' + $window.location.host;
    myAppDomain += $window.location.pathname;

    // TODO track granted scopes locally
    function save(session) {
      localStorage.setItem('io.lds.session', JSON.stringify(session));
      return $q.when(session);
    }

    function restore() {
      // Being very careful not to trigger a false onLogin or onLogout via $watch
      var storedSession;

      if (shared.session.token) {
        return $q.when(shared.session);
      }

      storedSession = JSON.parse(localStorage.getItem('io.lds.session') || null) || {};

      if (storedSession.token) {
        shared.session = storedSession;
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

    function init(appId) {
      myAppId = appId;
      // TODO delete stale sessions (i.e. on public computers)
    }

    function backgroundLogin() {
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

      var tokenMatch = url.match(/(^|\#|\?|\&)access_token=([^\&]+)(\&|$)/);
      var idMatch = url.match(/(^|\#|\?|\&)id=([^\&]+)(\&|$)/);
      var token;
      var id;

      if (tokenMatch) {
        token = tokenMatch[2];
      }

      if (idMatch) {
        id = idMatch[2];
      }

      return { token: token, id: id };
    }

    $window.completeLogin = function (name, url) {
      var params = parseLogin(name, url);
      var d = logins[params.id];

      if (!params.id) {
        throw new Error("could not parse id from login");
      }

      if (!params.token) {
        return $q.reject(new Error("didn't get token")); // destroy();
      }

      shared.session.token = params.token;
      // TODO rid token on reject
      return testToken(shared.session).then(save).then(d.resolve, d.reject);
    };

    function createLogin(d, oauthscope) {
      var requestedScope = oauthscope || ['me'];
      var id = Math.random().toString().replace(/0\./, '');
      logins[id] = d;

      var url = 'https://lds.io/api/oauth3/authorization_dialog'
        + '?response_type=token'
        + '&client_id=' + myAppId
          // TODO use referrer?
        + '&redirect_uri='
            + encodeURIComponent(myAppDomain + '/oauth-close.html?id=' + id + '&type=/providers/ldsio/callback/')
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
      var $iframe = $('<iframe src="' + url + '" width="1px" height="1px" style="opacity: 0.01;" frameborder="0"></iframe>');

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

    function login(oauthscope, opts) {
      // TODO note that this must be called on a click event
      // otherwise the browser will block the popup
      function forceLogin() {
        var d = $q.defer();
        var url = createLogin(d, oauthscope);

        // This is for client-side (implicit grant) oauth2
        $window.open(url, 'ldsioLogin', 'height=720,width=620');

        return d.promise;
      }

      return checkSession().then(function (session) {
        if (!session.id || opts && opts.force) {
          return forceLogin();
        }

        return session;
      }, forceLogin);
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
      _scope.$watch('__stsessionshared__.session', function (newValue, oldValue) {
        if (!oldValue.token && newValue.id) {
          fn(shared.session);
        }
      }, true);
    }

    function onLogout(_scope, fn) {
      _scope.__stsessionshared__ = shared;
      _scope.$watch('__stsessionshared__.session', function (newValue, oldValue) {
        if (oldValue.token && !newValue.token) {
          fn();
        }
      }, true);
    }

    return {
      init: init
    , restore: restore
    , destroy: destroy
    , login: login
    , logout: logout
    , onLogin: onLogin
    , onLogout: onLogout
    , checkSession: checkSession
    , requireSession: requireSession
    , backgroundLogin: backgroundLogin
    };
  }])
  ;
