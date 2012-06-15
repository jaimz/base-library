if (typeof(J) === 'undefined')
  J = {};


J.Facebook = (function() {
  var _initialised = false;
  var _started = false;

  // The Facebook session
  var _session = null;
  
  // The profile of the current user
  var _profile = null;

  // Initialise the module...
  // TODO: Err - what should this actuall do??
  var _init = function() {
    if (_initialised === true)
      return;

    _initialised = true;
  };


  // 'Start' the module - asynchronously load the Facebook JS library
  // NOTE: Is this really different from _init?
  var _start = function() {
    if (_started === true)
      return; // already started

    // Load the facebook library asynchronously...
    var e = document.createElement('script');
    e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
    e.async = true;
    document.getElementById('fb-root').appendChild(e);
    
    _started = true;
  };


  // Load the profile information for the current user...
  var _loadProfile = (function() {
    var __received = function(response) {
      // TODO: CHECKING
      _profile = response;
      
      J.Notifications.Notify('j.facebook.gotprofile', J.Facebook, _profile);
    };
    
    return function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Loading profile…');
      FB.api('/me', __received);
    };
  }());
  

  var _loadPhotos = (function() {
    var __received = function(response) {
      // TODO: ERROR CHECKING
      J.Notifications.Notify('j.facebook.me_photos', J.Facebook, response);
    };
    
    return function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Loading photos...');
      FB.api('/'+ J.Facebook.GetUserProfile().id +'/photos', __received);
//      FB.api('/me/photos', __received);
    };
  }());


  // Check whether we are currently logged into Facebook.
  // Issue 'j.facebook.loggedin' notification if we are,
  // 'j.facebook.loggedout' notification if we are not.
  var _checkLogin = (function() {
    var __loginStatusResult = function(response) {
      _session = response.authResponse;
      
      var key = (_session === null) ? 'j.facebook.loggedout' : 'j.facebook.loggedin';
      J.Notifications.Notify(key, J.Facebook, null);

      if (_session !== null)      
        _loadProfile();
    };

    return function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Checking Facebook...');
      FB.getLoginStatus(__loginStatusResult);
    };
  }());


  
  // Log in to Facebook...
  var _login = (function() {
    var __loginComplete = function(response) {
      _session = response.authResponse;
      
      var key = (_session === null) ? 'j.facebook.loggedout' : 'j.facebook.loggedin';
      J.Notifications.Notify(key, J.Facebook, null);
      
      if (_session !== null)      
        _loadProfile();
    };

    return function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Signing in...');    
      // TODO: User should be able to configure the permissions
      FB.login(__loginComplete, { scope : 'read_stream,publish_stream,offline_access,user_photos,user_photo_video_tags' });
    };
  }());



  // Log out of Facebook
  var _logout = (function() {
    var __logoutComplete = function(response) {
      if (!response || response.error) {
        var msg = "Could not log out"
        if (response && response.error)
          msg = msg + ': '+response.error;
        J.Notifications.Notify('j.facebook.errormessage', msg);
      } else {
        J.Notifications.Notify('j.facebook.loggedout', J.Facebook, null);
      }
    };

    return function() {
      J.Notifications.Notify('j.facebook.statusmessage', J.Facebook, 'Signing out...');
      FB.logout(__logoutComplete);
    };
  }());
  
  


  return {
    Init : _init,
    Start : _start,

    GetSession : function() { return _session; },
    GetUserProfile : function() { return _profile; },
    GetUserPhotos : _loadPhotos,
    CheckLogin : _checkLogin,
    Login : _login,
    Logout : _logout
  };
}());



J.HasFBAuth = (function() {
  var _doLogin = function() {
    J.Facebook.Login();
  };
  
  var _doLogout = function() {
    J.Facebook.Logout();
  };
  
  var _authDialogs = [];
  var _progressPanels = [];
  


  // unauthd -> authing -> authd
  // unauthd -> authing -> (unauthd + errored)
  // authd -> unauthd
  J.Notifications.Subscribe('j.facebook.authenticating', 
    function() {
      var l = _authDialogs.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        _authDialogs[ctr].classList.add('j-authenticating');
      }
    }
  );

  J.Notifications.Subscribe('j.facebook.loggedin', 
    function() {
      var l = _authDialogs.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        _authDialogs[ctr].classList.remove('j-unauthenticated');
        _authDialogs[ctr].classList.remove('j-unauthenticating');
        _authDialogs[ctr].classList.add('j-authenticated');
      }
    }
  );
  
  J.Notifications.Subscribe('j.facebook.loggedout',
    function() {
      var l = _authDialogs.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        _authDialogs[ctr].classList.remove('j-authenticated');
      }
    }
  );

  J.Notifications.Subscribe('j.fb.autherror',
    function() {
      var l = _authDialogs.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        _authDialogs[ctr].classList.remove('j-authenticated');
        _authDialogs[ctr].classList.add('j-errored');
      }
    }
  );



  return function(panel) {
    if (panel === null)
      return null;
  
    _authDialogs.push(panel);
    
  
    if (panel.getElementsByClassName === undefined) {
      J.Warn("No getElementsByClassName")
      return null;
    }
   
    var _loginButtons = panel.getElementsByClassName('j-login-button');
    var l = _loginButtons.length;
    if (l > 0) {
      for (var ctr = 0; ctr < l; ++ctr)
        _loginButtons[ctr].addEventListener('click', _doLogin, false);
    }
    
    var _logoutButtons = panel.getElementsByClassName('j-logout-button');
    l = _logoutButtons.length;
    if (l > 0) {
      for (var ctr = 0; ctr < l; ++ctr)
        _logoutButtons[ctr].addEventListener('click', _doLogout, false);
    }
    
    var _progress = panel.getElementsByClassName('j-progress-label');
    l = _progress.length;
    if (l > 0) {
      for (var ctr = 0; ctr < l; ++ctr)
        _progressPanels.push(_progress[ctr]);
    }
  };
}());



// The Facebook library calls this when it is loaded...
window.fbAsyncInit = function() {
  FB.init({
    appId: '104738679566253',
		status: true,
		cookie: true,
		xfbml: true
  });

  // Let our object know that the FB API is ready to use
  J.Facebook.CheckLogin();
};