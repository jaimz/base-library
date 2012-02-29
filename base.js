// Create the 'J' namespace...
var J;
J = J || {};


var JExtendArray = true;

if (JExtendArray) {
  // Push all the elements of one array onto the end of another (like concat but
  // modifies the array in-place).
  if (!Array.prototype.pushAll) {
    Array.prototype.pushAll = function(otherArray) {
        for (var ctr = 0; ctr < otherArray.length; ++ctr) {
          this.push(otherArray[ctr]);
        }
    }
  }
  
  // Remove the first instance of the given item from an array
  if (!Array.prototype.removeItem) {
    Array.prototype.removeItem = function(item) {
      var l = this.length;
      for (var ctr = 0; ctr < l; ++ctr) {
        if (this[ctr] === item) {
          this.splice(ctr, 1);
        }
      }
    }
  }

}


// Create the 'J' namespace
var J = J || {};
if (typeof(J) !== 'object') {
  J = {};
}


// Simple mixin function - add the properties of 'mixin' to the object
// 'receiver'
J.Mix = function(receiver, mixin) {
  for (var k in mixin) {
    // Don't copy the whole prototype chain...
    if (mixin.hasOwnProperty(k)) {
      receiver[k] = mixin[k];
    }
  }
};


J.CreateNamespace = function(name) {
	var comps = name.split('.');
	var l = comps.length;
	var ctr = 1;

	var curr_ns = J;
	while (ctr < l) {
		if (curr_ns.hasOwnProperty(comps[ctr]))
			ctr += 1;
		else
			break;
	}
	

	var new_subname = null
	while (ctr < l) {
		new_subname = comps[ctr];
		curr_ns[new_subname] = {};
		curr_ns = curr_ns[new_subname];
		ctr += 1;
	}
	
	return curr_ns;
}

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
  
  if (!to_sort || (to_sort instanceof Array) === false || to_sort.length === 0)
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