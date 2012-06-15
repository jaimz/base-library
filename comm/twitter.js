var J = J || {};
var J.Comm = J.Comm || {};
var J.Comm.Twitter = J.Comm.Twitter || {};


/*
  Represents a twitter account
*/
J.Comm.Twitter.CreateProxy = function(proxy_url) {
  var _have_init = false;
  var _have_account = false;

  var _user_profile = null;
  var _home_timeline = null;

  var _proxy_url = proxy_url || 'http://www.thebitflow.com/twitter/tramp.php';

  // shortcut to the global notification center
  var _notifications = J.Notifications || J.CreateNotificationCenter();

  var _user = null;


  // The remote proxy (or Twitter itself) has returned an error
  var _handle_twitter_error = function(obj) {
    var j_error = obj['j_error'];
    if (j_error !== undefined) {
      switch (j_error) {
      case 'not authenticated':
        _notifications.Notify('j.twitter.not_authenticated');
        break;
      default:
        _notifications.Notify('j.twitter.error', this, j_error);
        break;
      }
    } else {
      // TODO: this
      _notifications.Notify('j.twitter.error', this, 'unknown error');
    }
  }

  

  // Call the Twitter REST api via the configured proxy
  // e.g _api('/status/home.json', { max: 10}, 'GET', callback)
  var _api = function() {
    if (arguments.length === 0)
      return;
    
    var url = arguments[0];
    if (typeof(url) !== 'string') {
      console.warn('First argument to J.Twitter.Api must be a string');
      return;
    }
    
    var optional = Array.prototype.splice.call(arguments, 1);
    var data = null;
    var method = 'GET';
    var callback = null;
    var l = optional.length;
    var curr, t;

    for (var ctr = 0; ctr < l; ++ctr) {
      curr = optional[ctr];
      t = typeof(curr);

      if (t === 'object')
        data = curr;
      else if (t === 'string')
        method = curr;
      else if (t === 'function')
        callback = curr;
    }


    if (data !== null) {
      url = [ url, '?', jQuery.param(data) ].join('');
    }
    
    method = method || "GET";
    
    $.ajax({
      url : 'http://www.thebitflow.com/twitter/tramp.php',
      type: method,
      data: { turl: url },
      success: callback,
      error: (function(req, status, exn) { callback({ error : ('' + status) }) })
    });

  };



  // Update the home timeline for the currently authenticated account
  // holder.
  // TODO: Multiple accounts (?)
  var _set_home_timeline = function(timeline) {
    if (timeline.hasOwnProperty('j_error')) {
      _handle_twitter_error(timeline);
      return;
    }

    _home_timeline = timeline;
    _notifications.Notify('j.twitter.have_timeline', this, _home_timeline);
  };



  // Set the profile object for the currently authenticated account
  // holder.
  // TODO: Multiple accounts (?)
  var _set_account = function(user) {
    if (user.hasOwnProperty('j_error')) {
      _handle_twitter_error(user);
      return;
    } 
    
    _user_profile = user;
    _notifications.Notify('j.twitter.have_user');
  };



  var _check_for_account = function() {
    _api('/account/verify_credentials.json', _set_account);
  };
  

  var _did_auth = function() {
    _check_for_account();
  };
  _notifications.Subscribe('j.twitter.did_auth', _did_auth);


  return {
//	CheckForAccount : _check_for_account,
    Update : _update_home_timeline,
    Api : _api
  };
};



// The Singleton AuthManager handles all authentication against twitter
// regardless of account
J.Comm.Twitter.AuthManager = (function() {
  var _origin = window.location.origin;
  if (_origin === undefined) {
    console.warn('HasTwitterAuth: Could not get window origin.');
  }

  var _auth_window = null;

  var _authFinishedListener = function(e) {
    _el.removeClass('j-in-progress');

    if (e.origin === _origin || e.origin === ('www.' + _origin)) {
      var msg = e.data;
      if (msg === 'twitter.authenticated') {
        // Twitter authenticated OK
        var twitter_token = localStorage.getItem('auth.twitter.token');
        var twitter_token_secret = localStorage.getItem('auth.twitter.token.secret');
        
        if (_auth_window !== null) {
          _auth_window.close();
          _auth_window = null;
        }

        _el.removeClass('j-not-authd');
        _el.addClass('j-authenticated');


        if (J.Notifications)
          J.Notifications.Notify('j.twitter.did_auth', this, null);

      }
      else if (msg === 'twitter.failed_authentication') {

        if (J.Notifications)
          J.Notifications.Notify('j.twitter.did_fail_auth', this, null);
      }
    }
  };

  window.addEventListener('message', _authFinishedListener);


  var _start_auth = function(authentication_url) {
    if (_auth_window !== null)
      return; // authentication already in progress

    _auth_window.open(authentication_url);
  };
  

  return {
    StartAuthentication: _start_auth
  };
}());



// Apply the behaviour 'TwitterAuth' to the DOM element el
// I.e. 'el' contains sub elements that provide Twitter login buttons.
// We use OAuth for Twitter login, the auhtentication URL can either be
// supplied to this function - HasTwitterAuth(el, 'http://....') - or
// be defined in the global J.Comm.Twitter.AuthUrl
J.Comm.Twitter.HasAuth = function(el, authUrl) {
  if (el === null || (e instanceof Element) === false) {
    console.warn('HasTwitterAuth: el must be an element');
    return;
  }

  
  var _authentication_url = authUrl || J.Comm.Twitter.AuthUrl;
  if (!_authUrl) {
    console.warn('HasTwitterAuth: Could not find authentication url.')
    return;
  }



  var _el = $(el);
  var _login_buttons = _el.find('.j-twt-login');
  
  var _did_auth = function() {
    _el.removeClass('j-not-authd');
    _el.addClass('j-authenticated');
  };

  var _did_fail_auth = function() {
    _el.addClass('j-auth-errored');
  };

  var _did_deauth = function() {
    _el.removeClass('j-authenticated');
    _el.addClass('j-unauthenticated');
  };


  if (J.Notifications) {
    J.Notifications.Subscribe('j.twitter.did_auth', _did_auth);
    J.Notifications.Subscribe('j.twitter.did_fail_auth', _failed_auth);
    J.Notifications.Subscribe('j.twitter.did_deauth', _did_deauth);
  }


  var _do_auth = function() {
    if (!J.Comm.Twitter.AuthManager) {
      console.warn('Could not find twitter authentication manager');
      return;
    }

    J.Comm.Twitter.AuthManager.StartAuthentication(_authentication_url);
  };

  
  _login_buttons.on('click', _do_auth);
};


// Create a 'global' twitter proxy - this is all most apps will ever
// need...
J.Comm.Twitter.Default = J.Comm.Twitter.CreateProxy();