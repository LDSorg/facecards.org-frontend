'use strict';

angular
  .module('myApp.cache', [])
  .service('StApiCache', [
    '$window'
  , '$q'
  , function StApiCache($window, $q) {
    var caches;
    //var oauthPrefix = providerBase + '/api/oauth3';

    /*
    function batchApiCall(ids, url, handler) {
      // freshIds, staleIds = ids.filter()
      // get url but don't cache
      handler(result, function (id, data) {
        // put id into result set
      });
    }
    */

    function apiCall(id, url, fetch, opts) {
      var refreshWait = (15 * 60 * 1000);
      var uselessWait = Infinity; //(30 * 24 * 60 * 60 * 1000);
      var fresh;
      var usable;
      var result;
      var now;

      function fin(value) {
        caches[id] = Date.now();
        localStorage.setItem('io.lds.' + id, JSON.stringify(value));
        localStorage.setItem('io.lds.caches', JSON.stringify(caches));
        return { updated: caches[id], value: value, stale: false };
      }

      if (caches[id] && !(opts && opts.expire)) {
        now = Date.now();
        usable = now - caches[id] < uselessWait;
        fresh = now - caches[id] < refreshWait;
        if (!fresh) {
          fetch().then(fin);
        }
        result = JSON.parse(localStorage.getItem('io.lds.' + id) || null);
      }

      if (result) {
        if (!usable) {
          return fetch().then(fin);
        } else {
          return $q.when({ updated: caches[id], value: result, stale: !fresh });
        }
      }

      return fetch().then(fin);
    }

    function destroy() {
      Object.keys(caches).forEach(function (key) {
        localStorage.removeItem('io.lds.' + key);
      });
      localStorage.removeItem('io.lds.caches');
      caches = {};
      return $q.when();
    }

    function init() {
      caches = JSON.parse(localStorage.getItem('io.lds.caches') || null) || {};
    }

    init();

    return {
      destroy: destroy
    , read: apiCall
    };
  }])
  ;
