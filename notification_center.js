// requires base.js


/*
  Creates an object that acts as a notification broker. The object provides three functions:

    subscribe(key, callback) 
      register the listener "callback" against the notification with name 'key'. 'callback'
      should be a function with the signature
         callback(key, source, data)
      where 'key' is the name of the notification triggering the callback, 'source' is the entity
      that posted the notification, and 'data' is some data associated with the notification.
      
    unsubscribe(key, callback)
      stop the notification 'key' triggering the callback 'callback'
      
    notify(key, source, data)
      post the notification 'key'. 'source' should be the entity posting the notification and
      'data' is some data (of any type) to associate with the notification


  Notification keys are heirarchical and use '.' to separate components in the keypath. For example:
    register('sys.prefs.font', function(k, s, d) { console.log('System font changed!'); });

  '*' can be used as a wildcard in path names. For example:
    register('*.prefs.font', function() { console.log('Font changed!'); });
    register('sys.prefs.*', function() { console.log('Preference changed!'); });
    
  The notification center can be used by itself or can by mixed into other objects.
  To use standalone:
    var nc = CreateNotificationCenter();
    nc.notify('sys.prefs.bgcolor', colorpanel, '#0000ff');
    
  To use as a mixin:
    function Name(first, last) {
      this.first = first; 
      this.last = last; 
      
      // Mixin the notification functionality...
      mix(this, CreateNotificationCenter()); 
    };
    Name.prototype = { 
      SetFirst: function(newFirst) { 
        this.first = newFirst; 
        if (this.notify) 
          this.notify('name.first.changed', this, this.first); 
      }
    };
    
    var name = new Name('Jim', 'OBrien');
    name.SetFirst('James'); // fires 'name.first.changed' notification
*/
J.CreateNotificationCenter = (function() {
  // Key paths (e.g. foo.bar.boo) are mapped to a heirarchical namespace. Each node
  // in the heirarchy has the structure:
  //      { name: ..., children: ..., listeners: [ ... ], backlog: [ ... ]}
  //
  // Where:
  //   name      -> the keypath segment for this level in the heirarchy (e.g. 'bar')
  //   children  -> the subheirarchy corresponding to keypaths prefixed by
  //                the current segment (e.g. 'bar.boo', 'bar.flibble')
  //   listeners -> the collection of callbacks listening at the current keypath
  //   backlog   -> the collection of notifications already sent to this point in
  //                the keypath - unbounded for now, need something cleverer

  // The top level of the key namespace...
  var _listenerTree = [];


  // Create a function that calls 'process(node)' for each node that matches the given 
  // key...
  var _visitKey = (function() {
		var _recurse = function(keyPath, keyIdx, level, process) {
			var levelLen = level.length;
			var node = null;
			
			var processed = false;

			// visit each node at this level of the keyspace...
			for (var nodeIdx = 0; nodeIdx < levelLen; ++nodeIdx) {
				node = level[nodeIdx];
				
				// see if the node's name matches the current key segment -
				// may want to use a regex here...
				if (keyPath[keyIdx] === '*' || node.name === '*' || node.name === keyPath[keyIdx]) {
					if (keyIdx === (keyPath.length - 1)) {
						// we have matched the whole key - call process
						process(node);
						processed = true;
					} else {
						// we have matched the current key segment - move down the tree
						processed = _recurse(keyPath, (keyIdx + 1), node.children, process);
					}
				}
			}
			
			if (!processed) {
				// fell off the end of a level without finding the
				// key segment - need to create nodes corresponding to the
				// key suffix we didn't match...
				while (keyIdx < keyPath.length) {
					node = { name: keyPath[keyIdx], children: [], listeners: [], backlog: [] };
					level.push(node);
					level = node.children;
					keyIdx += 1;
				}
				
				// process should still be called on the new node
				process(node);
			}
			
			return processed;
		};
		
		return (function(key, process) {
			if (process === null || key === null)
				return;
			
			var keyPath = key.split('.');
			if (keyPath.length > 0)
				_recurse(keyPath, 0, _listenerTree, process);
		});
	}());


  // removes a registered callback at the given key
  var _removeListenerAtKey = function(key, listener) {
    _visitKey(key, function(node) { node.listeners.removeItem(listener) });
  };

    
  // gets all the callbacks at the given key
  var _listenersForKey = function(key) {
    var result = [];
    _visitKey(key, function(node) { result.pushAll(node.listeners); });
    return result;
  };


  // post a notification to the listeners at 'key'
  var _postNotification = function(key, source, data) {
    // create a notification object to add to the backlog...
    var o = { key: key, source: source, data: data };
    
    // listeners to notify get accumulated here...
    var listenerAccu = [];
    
    // get the listeners at the keypath and push the notification
	  // onto each affected node's backlog...
    _visitKey(key, 
              function(node)
              { 
                listenerAccu.pushAll(node.listeners); 
                node.backlog.push(o); 
              });
    
    // call the interested listeners.
    if (listenerAccu.length > 0) {
      var f = null;
      for (var ctr = 0; ctr < listenerAccu.length; ++ctr) {
        if (listenerAccu[ctr].constructor === Function)
          (listenerAccu[ctr])(key, source, data);
      }
    };
  };

  

  // find the right node for the given key - creating it if necessary
  // NOTE: Why do we need this *and* _visitKey?
  var _nodeForKey = function(keyParts, keyIdx, level) {
    var levLen = level.length;
    levCtr = 0;
    
    var result = null
    for (levCtr = 0; levCtr < levLen; ++levCtr) {
      if (keyParts[keyIdx] === level[levCtr].name || level[levCtr].name === '*') {
        if (keyIdx === keyParts.length - 1) {
          result = level[levCtr];
        } else {
          if (level[levCtr].children.length > 0) {
            result = _nodeForKey(keyParts, (keyIdx + 1), level[levCtr].children);
          } else {
            while(keyIdx < keyParts.length) {
              result = { name: keyParts[keyIdx], children: [], listeners: [], backlog: [] };
              level.children.push(result);
              level = result.children;
              keyIdx += 1;
            }
          }
        }
      }
    }
    
    if (result == null) {
      // Fell off the end of a level without finding a match - need
      // to create the subtree corresponding to the remainder of the key...
      while (keyIdx < keyParts.length) {
        result = { name: keyParts[keyIdx], children: [], listeners: [], backlog: [] };
        level.push(result);
        level = result.children;
        
        keyIdx += 1;
      }
    }
    
    return result;
  };


  
  return {
    Subscribe: function(key, callback) {
      if (key === null || callback === null)
        return;
      
      var keyParts = key.split('.');
      
      if (keyParts.length > 0) {
        var node = _nodeForKey(keyParts, 0, _listenerTree);
        if (node) {
          // If the node has a backlog, deliver all the messages now...
          if (node.backlog.length > 0) {
            var not = null;
            for (var ctr = 0; ctr < node.backlog.length; ++ctr) {
              not = node.backlog[ctr];
              callback(not.key, not.source, not.data);
            }
          }
          
          // ...then subscribe.
          node.listeners.push(callback);
        }
      }
    },
    
    
    Unsubscribe: function(key, callback) {
      _removeListenerAtKey(key, callback);
    },
    
    
    Notify: function(key, source, data) {
      _postNotification(key, source, data);
    }
  };
});

J.Notifications = J.CreateNotificationCenter();
