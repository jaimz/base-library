ko.extenders.sorted_array = function(target, scorer) {
  var _scorer = scorer;
  
  // Create a writable computed observable that intercepts and
  // sorts the new value
  var result = ko.computed({
    read: target,
    write: function(new_value) {
      if (!_scorer) {
        target(new_value);
      } else {
        var sorted = J.CountSortObjects(new_value);
        target(sorted);
      }
    }
  });
  

  // initialise with the current value
  result(target());
  
  return result;
};