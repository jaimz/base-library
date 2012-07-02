(function() {
  var Tagging = J.GetNamespace('J.Tagging');
  
  Tagging.MxTagSource = {

    _j_mixin_init : function(receiver) {
      receiver._tagging = {
        _lexer : new Lexer(),
        _tagger : new POSTagger(),
        _tags : []
      };
      
      // If the Knockout MVVM library is present we can
      // sort tags and post changes
      if (ko !== undefined) {
        var tag_scorer = function(tag) {
          result = 0;
          if (J.IsArray(tag.items)) {
            result = tag.items.length;
          }
          
          return result;
        };

        receiver._tagging._tags = ko.observable([]).extend({ sorted_array: tag_scorer });
      }
    },
    

    _collect_tags : (function() {

      var _insert_tag = function(tag_collection, tag) {
        var l = tag_collection.length;
        var idx = 0;
        
        // TODO: Binary chop (?)
        while (idx < l && tag_collection[idx].text < tag.textAlign)
          ++idx;
          
        if (idx === l)
          tag_collection.push(tag);
        else
          tag_collection.splice(idx, 0, tag);
      };
      
      
      var _find_tag = function(tag_collection, tag_text) {
        var low = 0, high = tag_collection.length - 1;
        var i, comp;
        
        while (low <= high) {
          i = Math.floor((low + high) / 2);
          if (tag_collection[i].text < tag_text) { low = i + 1; continue; }
          if (tag_collection[i].text > tag_text) { high = i - 1; continue; }

          return tag_collection[i];
        }
        
        return null;
      };
      

      
    
      var _add_tag_to_collection = function(tag_collection, tag_text, tag_source) {
        var _tagged_item = _find_tag(tag_collection, tag_text);
        if (_tagged_item === null) {
          _tagged_item = { text: tag_text, items: [ ] };
          _insert_tag(tag_collection, _tagged_item);
        }
        
        _tagged_item.items.push(tag_source);
      };

      
      return function(items, property_name, pos_type) {
        if ((J.IsArray(items) || J.IsObject(items) || J.IsNonEmptyString(items)) === false) {
          console.warn('J.Tagging.MxTagSource: items should be an array, an object or a non-empty string');
          return;
        }
          
      
        var tagging = this._tagging;
        if (!tagging) {
          console.warn('J.Tagging.MxTagSource: object does not have tagging object');
          return;
        }
        
        var _pos_type = pos_type || 'JJ';
        var _prop_name = property_name || 'text';
        var lexer = tagging._lexer;
        var tagger = tagging._tagger;
        var tag_collection = tagging._tags;
        if (ko !== undefined)
          tag_collection = tag_collection();
        
        var _items = items;
        if (J.IsArray(_items) === false) {
          _items = [ items ];
        }
        
        var l = _items.length;
        var text, words, pos_tags;
        var pos_tag_idx = 0;
        var curr_noun = [];
        var curr_pos_tag, pos_tag_count;
        var curr_item;
        for (var ctr = 0; ctr < l; ++ctr) {
          curr_item = items[ctr];
          if (J.IsNonEmptyString(curr_item)) {
            text = curr_item;
          } else {
            if (curr_item.hasOwnProperty(_prop_name))
              text = curr_item[_prop_name];
            else
              continue;
          }
          
          if (!text)
            continue;
            
          words = lexer.lex(text);
          if (words.length === 0)
            continue;
            
          pos_tags = tagger.tag(words);
          
          pos_tag_idx = 0;
          curr_noun = [];
          pos_tag_count = pos_tags.length;
          while (pos_tag_idx < pos_tag_count) {
            curr_pos_tag = pos_tags[pos_tag_idx];

            // Collect consecutive nouns...
            if (curr_pos_tag[1] === 'JJ') {
              curr_noun.push(curr_pos_tag[0]);
            } else {
              if (curr_noun.length > 0) {
                _add_tag_to_collection(tag_collection, curr_noun.join(' '), curr_item);
                curr_noun = [];
              }
            }
            
            pos_tag_idx += 1;
          }
          
          if (ko !== undefined)
            tagging._tags(tag_collection);
        }
      };
    }())
    
  };
}());