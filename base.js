// fake a console if none exists...
if (!window.console) {
  window.console = {
    log : function() {},
    warn: function() {},
    error: function() {}
  };
}

/// Top level namespace
var J = {};

var J_ExtendObject = true;
var J_ExtendArray = true;
var J_ExtendString = true;
var J_ExtendDate = true;


if (J_ExtendArray) {
  // Push all the elements of one array onto the end of another (like concat
  // but modifies the array in-place)
  if (!Array.prototype.pushAll) {
    Array.prototype.pushAll = function(otherArray) {
      if (!otherArray || !otherArray.length)
        return;
      

      var l = otherArray.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        this.push(otherArray[ctr]);
      }
    };
  }

  // Remove the first instance of the given item form an array
  if (!Array.prototype.remove) {
    Array.prototype.remove = function(item) {
      if (!item)
        return;

      var l = this.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        if (this[ctr] === item) {
          this.splice(ctr, 1);
          break;
        }
      }
    };
  }
  
  if (!Array.prototype.insertSortedUnique) {
    Array.prototype.insertSortedUnique = function(item) {
      if (!item)
        return;
        

      var l = this.length;
      if (l === 0) {
        this.push(item);
      }
      
      var insertIdx = 0;
      while(insertIdx < l && this[insertIdx] < item)
        ++insertIdx;

      if (insertIdx < l) {
        if (this[insertIdx] === item)
          return; // alredy in the list...
      }
      
      this.splice(insertIdx, 0, item);
    }
  }
  
}

if (J_ExtendString === true) {
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(str) {
      if (!str || typeof(s) !== "string")
        return false;

      if (str === "")
        return true;

      return this.substring(0, str.length) === str;
    };
  }
}


// Return a reference to the specified namespace.
// 'name' should be a '.' separated namespace name: e.g. "mycorp.data.concurrent"
// This will create a namespace if the name has not previously been specified
J.GetNamespace = function _J_getNamespace (name) {
  var comps = name.split('.');
  var l = comps.length;
  var ctr = 0;
  
  if (l < 1) {
    console.warn('Creating anonymous namespace - this is probably not what you meant');
    return {};
  }
    
  if (comps[0] === 'J')
    ctr = 1;
  
  var curr_ns = J;
  while (ctr < l) {
    if (curr_ns.hasOwnProperty(comps[ctr])) {
      curr_ns = curr_ns[comps[ctr]];
      ctr += 1;
    } else {
      break;
    }
  }

  
  var new_subname = null;
  while (ctr < l) {
    new_subname = comps[ctr];
    curr_ns[new_subname] = {};
    curr_ns = curr_ns[new_subname];
    ctr += 1;
  }

  
  return curr_ns;
};



// Call the method 'method_name' on each object in the array 'delegate_list'
// Each method invokation will have the 'this' pointer set to 'context' and will
// have the parameters 'params'
J.Delegate = function(delegate_list, method_name, params) {
  if (J.IsArray(delegate_list) === false) {
    console.warn('T8.Delegate: delegate list is not an array');
    return;
  }

  if (J.IsNonEmptyString(method_name) === false) {
    console.warn('T8.Delegate: you must supply a delegate method name');
    return;
  }
  
  var real_params = params;
  if (params !== undefined && T8.IsArray(params) === false)
    real_params = [ params ];


  var l = delegate_list.length;
  for (var ctr = delegate_list.length - 1; ctr >= 0; ctr--){
    delegate = delegate_list[ctr];
    if (J.IsFunction(delegate[method_name]) === true)
      try {
        delegate[method_name].apply(delegate, real_params);
      } catch (e) {
        console.warn('Delegate method ' + method_name + ' threw exception: ' + e);
      }
  };
};


// Simple mixin function - add the properties of 'mixin' to the object
// 'receiver'.
J.Mixin = function _J_mixin (receiver, mixin) {
  if (typeof(mixin) !== 'object') {
    console.warn("Type of mixin must be an object (not a " + (typeof mixin) + ")");
    return;
  }
  
  if (mixin.hasOwnProperty('_j_mixin_init')) {
    if (typeof(mixin['_j_mixin_init'])!== 'function') {
      console.warn('Minix initialiser must be a function: '+typof(mixin['_j_mix_init']));
      return;
    }
      
    mixin._j_mixin_init(receiver);
  }
  

  
  // Don't copy the whole prototype chain (???)
  // TODO: What if receiver already has 'k'
  for (var k in mixin) {
    if (mixin.hasOwnProperty(k)) {
      receiver[k] = mixin[k];
    }
  }
};




// Get the 'length' of an object - how many property names it has (not including
// properties it has inherited in its prototype chain)
J.ObjectCount = function(obj) {
  if (J.IsObject(obj) === false) {
    console.warn("J.ObjectCount: parameter is not an object: " + obj);
    return 0;
  }

  var count = 0;
  for (k in obj) {
    if (obj.hasOwnProperty(k))
      count++;
  }
  
  return count;
};



J.SortObject = function(obj) {
  var count = [];
  var result = [];
  
  var l = 0;
  var curr, curr_count;
  var highest_count = 0;
  
  for (k in obj) {
    curr_count = obj[k];
    
    if (curr_count > highest_count)
      highest_count = curr_count;
      
    if (count[curr_count] !== undefined)
      count[curr_count] = count[curr_count] + 1;
    else
      count[curr_count] = 1;
  }
  
  for (var ctr = 0; ctr <= highest_count; ++ctr) {
    if (count[ctr] === undefined)
      count[ctr] = 0;
  }
  
  var total = 0;
  var c;
  for (var ctr = 0; ctr <= highest_count; ++ctr) {
    c = count[ctr];
    count[ctr] = total;
    total = total + c;
  }
  
  var result_idx = 0;
  for (k in obj) {
    curr_count = obj[k];
    result_idx = count[curr_count];
    
    result[result_idx] = k;
    count[curr_count] = count[curr_count] + 1;
  }
  
  return result;
};


J.CountSortObjects = function(to_sort, scorer) {
  if (!scorer || typeof(scorer) !== "function") {
    console.warn('J.CountSortObjects: scorer must be a function');
    return [];
  }
  
  if (!to_sort || (to_sort instanceof Array) === false) {
    console.warn('J.CountSortObjects: parameter is null or not an Array');
    return [];
  }
    
  
  if (to_sort.length === 0)
    return [];
    
  var count = [];
  var result = [];
  
  var l = 0;
  var curr, curr_count;
  var highest_count = 0;
  
  var len = to_sort.length;
  var curr_obj = null;
  for (var ctr = 0; ctr < len; ++ctr) {
    curr_obj = to_sort[ctr];
    curr_count = scorer(curr_obj);
    
    if (curr_count > highest_count)
      highest_count = curr_count;
      
    if (count[curr_count] !== undefined)
      count[curr_count] = count[curr_count] + 1;
    else
      count[curr_count] = 1;
  }
  
  for (var ctr = 0; ctr <= highest_count; ++ctr) {
    if (count[ctr] === undefined)
      count[ctr] = 0;
  }
  
  var total = 0;
  var c;
  for(var ctr = 0; ctr <= highest_count; ++ctr) {
    c = count[ctr];
    count[ctr] = total;
    total = total + c;
  }
  
  var result_idx = 0;
  for (var ctr = 0; ctr < len; ++ctr) {
    curr_obj = to_sort[ctr];
    curr_count = scorer(curr_obj);
    
    result_idx = count[curr_count];
    result[result_idx] = curr_obj;
    count[curr_count] = count[curr_count] + 1;
  }
  
  return result;
};

J.CountingSort = function(to_sort) {
  var count = [];
  var result = [];
  
  var l = to_sort.length;
  var curr, curr_count;
  var highest_count = 0;
  for (var ctr = 0; ctr < l; ++ctr) {
    curr = to_sort[ctr];
    curr_count = curr.count;

    if (curr_count > highest_count)
      highest_count = curr_count;

    if (count[curr_count] !== undefined)
      count[curr_count] = count[curr_count] + 1;
    else
      count[curr_count] = 1;
  }
    

  for (var ctr = 0; ctr <= highest_count; ++ctr) {
    if (count[ctr] === undefined)
      count[ctr] = 0;
  }


  var total = 0;
  var c;
  for (var ctr = 0; ctr <= highest_count; ++ctr) {
    c = count[ctr];
    count[ctr] = total;
    total = total + c;
  }

  var result_idx = 0;
  for (var ctr = 0; ctr < l; ++ctr) {
    curr = to_sort[ctr];
    curr_count = curr.count;
    result_idx  = count[curr_count];

    result[result_idx] = curr;
    count[curr_count] = count[curr_count] + 1;
  }

  return result;
};


J.IsObject = function _J_is_object (o) {
  return (o !== undefined && o !== null && typeof(o) === 'object');
}

J.IsObjectOfConstructor = function _J_is_obj_cstr (o, cstr) {
  return (J.IsObject(o) && o.constructor ===  cstr);
}

J.IsJQuery = function _J_is_jquery (o) {
  return J.IsObjectOfConstructor(o, jQuery);
};

J.IsDate = function _J_is_date (d) {
  return J.IsObjectOfConstructor(d, Date);
}

J.IsArray = function _J_is_array (o) {
  return J.IsObjectOfConstructor(o, Array);
}

J.IsNonEmptyString = function _is_non_emp_string (s) {
  return (typeof(s) === 'string' && s.length > 0);
}


/*
  Check that 'obj' is an object exposing the given array of property
  names.
*/
J.IsObjectWith = function _J_obj_with (obj, props) {
  if (J.IsObjectOfConstructor(props, Array) === false) {
    console.warn('J.IsObjectWith: props must be an array');
    return false;
  }
  
  var result = J.IsObject(obj);
  if (result) {
    var l = props.length;
    
    // NOTE: We dont' check the whole property chain - possibly wrong but
    // woks for now...
    for (var i = 0; i < l; ++i) {
      result = obj.hasOwnProperty(props[i]);
      if (!result)
        break;
    }
  }
  
  return result;
}

J.IsFunction = function _J_is_fun (obj) {
  return (obj !== undefined && obj !== null && typeof(obj) === 'function');
}