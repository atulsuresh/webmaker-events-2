// Services -------------------------------------------------------------------

angular.module('myApp.services', ['ngResource'])
  .constant('config', window.eventsConfig)
  .constant('chrono', window.chrono)
  .constant('analytics', window.analytics)
  .factory('loadGoogleMaps', ['$window',
    function ($window) {

      function initialize(callback) {
        $window.onInit = callback;
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&sensor=false&' +
          'callback=onInit';
        document.body.appendChild(script);
      }

      return {
        ready: function (callback) {
          if ($window.google) {
            callback();
          } else {
            initialize(callback);
          }
        }
      };
    }
  ])
  .factory('eventService', ['$rootScope', '$resource', 'config',
    function ($rootScope, $resource, config) {
      return $resource(config.eventsLocation + '/events/:id', {
        organizerId: '@organizerId',
        after: '@after',
        limit: '@limit',
        dedupe: '@dedupe'
      }, {
        get: {
          method: 'GET',
          withCredentials: true
        },
        save: {
          method: 'POST',
          withCredentials: true
        },
        'delete': {
          method: 'DELETE',
          withCredentials: true
        },
        update: {
          method: 'PUT',
          withCredentials: true
        }
      });
    }
  ])
  .factory('eventFormatter', ['$rootScope', 'moment', 'chrono',
    function ($rootScope, moment, chrono) {

      return function (form, eventData) {
        if (!form || !eventData) {
          console.warn('You must provide a form instance and event data on a $scope');
          return;
        }

        if (form.$invalid) {
          // prevent form from being sent if there are invalid fields
          console.warn('Form is invalid.');
          window.scrollTo(0, 0);
          return;
        }

        // Create a serialized event object to avoid modifying $scope
        var serializedEvent = angular.copy(eventData);

        if (eventData.beginDate) {
          serializedEvent.beginDate = eventData.parsedNaturalStartDate.toISOString();
        }

        if (eventData.duration !== 'unknown') {
          serializedEvent.endDate = moment(eventData.parsedNaturalStartDate).add('hours', parseFloat(eventData.duration, 10)).toISOString();
        } else {
          // Don't send an end date if duration is not specific
          delete serializedEvent.endDate;
        }

        if (typeof serializedEvent.registerLink === 'string' && serializedEvent.registerLink.trim() === '') {
          delete serializedEvent.registerLink;
        }

        // Remove nonexistant DB values from client event object
        delete serializedEvent.duration;
        delete serializedEvent.parsedNaturalStartDate;

        // Convert CSV tags to array of Strings

        if (serializedEvent.tags && typeof serializedEvent.tags === 'string') {
          var tagArray = serializedEvent.tags.split(',');

          tagArray.forEach(function (tag, index) {
            tagArray[index] = tag.trim();
          });

          serializedEvent.tags = tagArray;
        } else {
          serializedEvent.tags = [];
        }

        return serializedEvent;
      };
    }
  ])
  .factory('moment', ['$window', 'config',
    function ($window, config) {
      var moment = $window.moment;
      moment.lang(config.lang);
      return moment;
    }
  ])
  .factory('authService', ['$rootScope', 'config',
    function authService($rootScope, config) {

      // This is needed to apply scope changes for events that happen in
      // async callbacks.
      function apply() {
        if (!$rootScope.$$phase) {
          $rootScope.$apply();
        }
      }

      var auth = new WebmakerAuthClient({
        handleNewUserUI: false
      });

      // Set up login/logout functions
      $rootScope.login = auth.login;
      $rootScope.logout = auth.logout;

      // Set up user data
      $rootScope._user = {};

      // Set locale information
      if (config.supported_languages.indexOf(config.lang) > 0) {
        $rootScope.lang = config.lang;
      } else {
        $rootScope.lang = config.defaultLang;
      }
      $rootScope.direction = config.direction;
      $rootScope.arrowDir = config.direction === 'rtl' ? 'left' : 'right';

      $rootScope.ga_account = config.ga_account;
      $rootScope.ga_domain = config.ga_domain;

      $rootScope.eventsLocation = config.eventsLocation;

      auth.on('login', function (user) {
        $rootScope._user = user;
        apply();

      });

      auth.on('logout', function (why) {
        $rootScope._user = {};
        apply();
      });

      auth.on('error', function (message, xhr) {
        console.log('error', message, xhr);
      });

      return auth;
    }
  ]);
