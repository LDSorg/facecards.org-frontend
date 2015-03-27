'use strict';

angular
  .module('myApp.session', [])
  .service('MyAppSession', [ '$window', '$q', '$http', function StSession($window, $q, $http) {
    var session = {};
    var providerBase = 'https://lds.io';
    var apiPrefix = providerBase + '/api/ldsio';
    var promises = {};
    var caches = JSON.parse(localStorage.getItem('io.lds.caches') || null) || {};
    //var oauthPrefix = providerBase + '/api/oauth3';

    // TODO track granted scopes locally
    // TODO separate session from cache and api

    /*
    function batchApiCall(ids, url, handler) {
      // freshIds, staleIds = ids.filter()
      // get url but don't cache
      handler(result, function (id, data) {
        // put id into result set
      });
    }
    */
    function apiCall(id, url, opts) {
      var refreshWait = (15 * 60 * 1000);
      var uselessAt = (30 * 24 * 60 * 60 * 1000);
      var fresh;
      var usable;
      var result;
      var now;

      function doGet() {
        promises[id] = $http.get(
          url
        , { headers: { 'Authorization': 'Bearer ' + session.token } }
        ).then(function (resp) {
          delete promises[id];

          if (!resp.data) {
            window.alert("[SANITY FAIL] '" + url + "' returned nothing (not even an error)");
            return;
          }

          if (resp.data.error) {
            console.error('[ERROR]', url);
            console.error(resp.data);
            window.alert("[DEVELOPER ERROR] '" + url + "' returned an error (is the url correct? did you check login first?)");
            return;
          }

          localStorage.setItem('io.lds.' + id, JSON.stringify(resp.data));
          caches[id] = Date.now();
          localStorage.setItem('io.lds.caches', JSON.stringify(caches));

          return resp.data;
        }, function (err) {
          delete promises[id];

          return $q.reject(err);
        });

        return promises[id];
      }

      if (promises[id]) {
        return promises[id];
      }

      if (caches[id] && !(opts && opts.expire)) {
        now = Date.now();
        usable = now - caches[id] < refreshWait;
        fresh = now - caches[id] < uselessAt;
        if (!fresh) {
          doGet();
        }
        result = JSON.parse(localStorage.getItem('io.lds.' + id) || null);
      }

      if (result) {
        if (!usable) {
          return doGet().then(function () {
            return { updated: caches[id], value: result, stale: false };
          });
        } else {
          return $q.when({ updated: caches[id], value: result, stale: !fresh });
        }
      }

      return doGet().then(function (result) {
        return { updated: caches[id], value: result, stale: false };
      });
    }

    function save() {
      localStorage.setItem('io.lds.session', JSON.stringify(session));
      return $q.when(session);
    }

    function restore() {
      session = JSON.parse(localStorage.getItem('io.lds.session') || null) || {};
      return $q.when(session);
    }

    function destroy() {
      localStorage.removeItem('io.lds.session');
      localStorage.removeItem('io.lds.profile');
      Object.keys(caches).forEach(function (key) {
        localStorage.removeItem('io.lds.' + key);
      });
      localStorage.removeItem('io.lds.caches');
      caches = {};
      session = {};
      return session;
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
          return destroy();
        }

        id = accounts[0].appScopedId || accounts[0].id;
        session.id = id;

        return session;
      });
    }

    function logout() {
      // TODO also logout of lds.io
      destroy();
    }

    function init() {
      // TODO delete stale sessions (i.e. on public computers)

      return restore().then(function (session) {
        if (!session.token) {
          silentLogin();
          return;
        }

        // TODO check expirey
        return testToken(session).then(function (session) {
          if (!session.token) {
            silentLogin();
          }
        });
      });
    }

    function createLogin(d, oauthscope) {
      $window.completeLogin = function (name, url) {
        // TODO return granted_scope and expires_at
        console.info('implicit grant url');
        console.log(url);

        $window.completeLogin = null;
        var match = url.match(/(^|\#|\?|\&)access_token=([^\&]+)(\&|$)/);
        var token;

        if (match) {
          token = match[2];
        }
          
        if (!token) {
          return destroy();
        }

        session.token = token;
        return testToken(session).then(function () {
          save();
          return getProfile({ expire: true }).then(d.resolve, d.reject);
        });
      };

      var myAppDomain = 'https://local.ldsconnect.org:8043';
      var myAppId = 'TEST_ID_9e78b54c44a8746a5727c972';
      var requestedScope = oauthscope || ['me'];

      var url = 'https://lds.io/api/oauth3/authorization_dialog'
        + '?response_type=token'
        + '&client_id=' + myAppId
        + '&redirect_uri=' + myAppDomain + '/oauth-close.html?type=/providers/ldsio/callback/'
        + '&scope=' + encodeURIComponent(requestedScope.join(' '))
        + '&state=' + Math.random().toString().replace(/^0./, '')
        ;

      return url;
    }

    function silentLogin(oauthscope) {
      var d = $q.defer();
      var url = createLogin(d, oauthscope);
      var $iframe = $('<iframe src="' + url + '" width="800px" height="800px" border="0"></iframe>');

      // This is for client-side (implicit grant) oauth2
      $('body').append($iframe);
      function removeIframe(data) {
        $iframe.remove();
        return data;
      }

      function removeIframeErr(err) {
        $iframe.remove();
        return $q.reject(err);
      }

      return d.promise.then(removeIframe, removeIframeErr);
    }

    function login(oauthscope) {
      var d = $q.defer();
      var url = createLogin(d, oauthscope);

      // This is for client-side (implicit grant) oauth2
      $window.open(url, 'ldsioLogin', 'height=720,width=620');

      return d.promise;
    }

    function ifSession() {
      return restore().then(function (session) {
        if (session.token) {
          return session;
        } else {
          return $q.reject(new Error("no session"));
        }
      });
    }

    function getProfile(opts) {
      return ifSession().then(function (session) {
        var id = session.id + '.me';
        var url = apiPrefix + '/' + session.id + '/me';

        return apiCall(id, url, opts).then(function (data) {
          return data.value;
        });
      });
    }

    function onLogin($scope, fn) {
    }

    function onLogout($scope, fn) {
    }

    init();

    return {
      restore: restore
    , save: save
    , destroy: destroy
    , login: login
    , logout: logout
    , onLogin: onLogin
    , onLogout: onLogout
    , session: session
    , getProfile: getProfile
    };
  }])
  ;
