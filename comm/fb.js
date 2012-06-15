(function() {
  var facebook = J.GetNamespace('J.Facebook');
  
  facebook.Connection = function() {
    this._initialised = false;
    
    // The Facebook session
    this._session = null;
    
    // Short cut to the authenticated user's ID
    this.UserId = null;
    
    // Expose these attributes as a view-model that UI's
    // can bind to...
    this._viewModel = {
      // The user's profile
      profile : ko.observable({}),
      
      // The user's feed
      home : ko.observable([]),
      
      // The user's friends
      friends : ko.observable({}),
      
      // The user's photos
      photos : ko.observable([])
    };



    // We have to proxy all the callbacks because of Javascript's 
    // basket-case 'this' handling...
    this.__profileRecieved = jQuery.proxy(this, '_profileRecieved');
    this.__loginCheckReceived = jQuery.proxy(this, '_loginCheckReceived');
    this.__loginReceived = jQuery.proxy(this, '_loginReceived');
    this.__logoutReceived = jQuery.proxy(this, '_logoutReceived');
  };


  facebook.Connection.prototype = {
    Init: function() {
      if (this._initialised === true)
        return;
        
      // Load the facebook library asynchronously...
      var e = document.createElement('script');
      e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
      e.async = true;
      document.getElementById('fb-root').appendChild(e);

      this._initialised = true;
    },


    _profileRecieved : function(response) {
      console.log(response);
      this._viewModel.profile(response);
      this.UserId = response.id;
      
      J.Notifications.Notify('j.facebook.gotprofile', this, response);
    },

    LoadProfile : function() {
      J.Notifications.Notify('j.facebook.statusmessage', this, 'Loading profile....');
      FB.api('/me', this.__profileRecieved);
    },
    
    

    _loginCheckReceived : function(response) {
      this._session = response.authResponse;
      
      var key = (this._session === null) ? 'j.facebook.notloggedin' : 'j.facebook.loggedin';
      J.Notifications.Notify(key, this, null);
      
      if (this._session !== null)
        this.LoadProfile();
    },

    CheckLogin : function() {
      J.Notifications.Notify('j.facebook.statusmessage', this, 'Checking Facebook...');
      J.Notifications.Notify('j.facebook.will_check_status');
      FB.getLoginStatus(this.__loginCheckReceived);
    },
    

    _loginReceived : function(response) {
      this._session = response.authResponse;
      
      var key = (this._session === null) ? 'j.facebook.loggedout' : 'j.facebook.loggedin';
      J.Notifications.Notify(key, this, null);
      
      if (this._session !== null)
        this.LoadProfile();
    },
    
    Login : function(scope) {
      J.Notifications.Notify('j.facebook.statusmesage', this, 'Signing in...');
      var _scope = scope;
      if (_scope === undefined)
        _scope = 'read_stream,publish_stream,offline_access,user_photos,user_photo_video_tags';
      FB.login(this.__loginReceived, { scope : _scope });
    },


    
    _logoutReceived : function(response) {
      if (!response || response.error) {
        var msg = "Could not log out"
        if (response && response.error)
          msg = msg + ': '+response.error;
          
        J.Notifications.Notify('j.facebook.errormessage', msg);
      } else {
        J.Notifications.Notify('j.facebook.loggedout', J.Facebook, null);
      }
    },

    Logout : function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Signing out...');
      FB.logout(this.__logoutReceived);      
    },
  };
  

  // Apply this 'behaviour' to any UI that presents a dialog to log into Facebook.
  // I.e. if you have a DOM structure of the form
  //    div#fb_author
  //      *.j-login-button
  //      *.j-logout-button
  //      *.j-progress-label
  //
  // Then you can make this into a working auth dialog with:
  //    J.Facebook.IsAuthor($('#fb_author'))
  facebook.IsAuthenticator = (function() {
    var _doLogin = function() {
      J.Facebook.Instance.Login();
    };
  
    var _doLogout = function() {
      J.Facebook.Instance.Logout();
    };
  
    var _authDialogs = $();
    var _progressPanels = $();


    // unauthd -> authing -> authd
    // unauthd -> authing -> (unauthd + errored)
    // authd -> unauthd
    J.Notifications.Subscribe('j.facebook.authenticating', 
      function() {
        _authDialogs.addClass('j-authenticating');
      }
    );


    J.Notifications.Subscribe('j.facebook.loggedin', 
      function() {
        _authDialogs.removeClass('j-checking-auth').removeClass('j-authenticating').removeClass('j-unauthenticated').addClass('j-authenticated');
      }
    );
  
    var removeAuth = function() {
      _authDialogs.removeClass('j-checking-auth').removeClass('j-authenticating').removeClass('j-authenticated').addClass('j-unauthenticated');
    };

    J.Notifications.Subscribe('j.facebook.loggedout', removeAuth);
    J.Notifications.Subscribe('j.facebook.notloggedin',removeAuth);

    J.Notifications.Subscribe('j.fb.autherror',
      function() {
        _authDialogs.removeClass('j-checking-auth').removeClass('j-authenticated').addClass('j-errored');
      }
    );



    return function(panel) {
      if (panel === null)
        return null;

      // TODO: Check that 'panel' is a jQuery object...
      _authDialogs = _authDialogs.add(panel);
   
      panel.find('.j-login-button').click(_doLogin);
      panel.find('.j-logout-button').click(_doLogout);
      _progressPanels = _progressPanels.add(panel.find('.j-progress-label'));
    };
  }());

  
  
  facebook.Instance = new facebook.Connection();


  
  // The Facebook library called this when it is loaded...
  window.fbAsyncInit = function() {
    FB.init({
      appId: '104738679566253',
      status: true,
      cookie: true,
      xfbml: true
    });
    
    facebook.Instance.CheckLogin();
  }
}());