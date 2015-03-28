'use strict';

angular
  .module('myApp.api', [])
  .service('LdsIoApi', [
    '$window'
  , '$q'
  , '$http'
  , 'StApiCache'
  , function LdsIoApi($window, $q, $http, StApiCache) {
    var providerBase = 'https://lds.io';
    var apiPrefix = providerBase + '/api/ldsio';
    var promises = {};

    /*
    function batchApiCall(ids, url, handler) {
      // freshIds, staleIds = ids.filter()
      // get url but don't cache
      handler(result, function (id, data) {
        // put id into result set
      });
    }
    */

    function realGet(session, id, url) {
      if (promises[id]) {
        return promises[id];
      }

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


        return resp.data;
      }, function (err) {
        delete promises[id];

        return $q.reject(err);
      });

      return promises[id];
    }

    function promiseApiCall(session, id, url, opts) {
      return StApiCache.read(id, url, function () {
        return realGet(session, id, url);
      }, opts).then(function (data) {
        return data.value;
      });
    }

    return {
      profile: function (session, opts) {
        var id = session.id + '.me';
        var url = apiPrefix + '/' + session.id + '/me';

        return promiseApiCall(
          session
        , id
        , url
        , opts
        );
      }
    , stake: function (session, stakeId, opts) {
        var id = session.id + 'stake.' + stakeId;
        var url = apiPrefix + '/' + session.id + '/stakes/' + stakeId;

        return promiseApiCall(
          session
        , id
        , url
        , opts
        );
      }
    , stakePhotos: function (session, stakeId, opts) {
        var id = session.id + 'stake.' + stakeId;
        var url = apiPrefix + '/' + session.id + '/stakes/' + stakeId + '/photos';

        return promiseApiCall(
          session
        , id
        , url
        , opts
        );
      }
    , ward: function (session, stakeId, wardId, opts) {
        var id = session.id + 'stake.' + stakeId + '.ward.' + wardId;
        var url = apiPrefix + '/' + session.id + '/stakes/' + stakeId + '/wards/' + wardId;

        return promiseApiCall(
          session
        , id
        , url
        , opts
        );
      }
    , wardPhotos: function (session, stakeId, wardId, opts) {
        var id = session.id + 'stake.' + stakeId + '.ward.' + wardId;
        var url = apiPrefix + '/' + session.id + '/stakes/' + stakeId + '/wards/' + wardId + '/photos';

        return promiseApiCall(
          session
        , id
        , url
        , opts
        );
      }
    , photoUrl: function (session, photo, type, size) {
        // https://lds.io/api/ldsio/<accountId>/photos/individual/<individualId>/<date>/medium/<whatever>.jpg
        return apiPrefix + '/' + session.id 
          + '/photos/' + type
          + '/' + photo.id + '/' + photo.updated_at 
          + '/' + size + '/' + photo.id + '.jpg'
          ;
      }
    };
  }])
  ;
