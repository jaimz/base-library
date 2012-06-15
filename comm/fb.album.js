(function() {
  var facebook = J.GetNamespace('J.Facebook');
  
  facebook.Album = function() {
    // Mix in tagging functionality...
    J.Mixin(this, J.Tagging.MxTagSource);
  

    this.ViewModel = {
      photos : ko.observable([]),
      prev_page : ko.observable(null),
      next_page : ko.observable(null),

      AlbumName : ko.observable(""),
      Tags : this._tagging._tags,
      ProgressMessage : ko.observable(""),
      Loading : ko.observable(false)
    };
    
    this.__photosLoaded = jQuery.proxy(this, '_photosLoaded');
  };

  
  facebook.Album.prototype = {
    _photosLoaded : function(result) {
      var vm = this.ViewModel;
      
      vm.Loading(false);
      
      if (result.hasOwnProperty('error')) {
        vm.photos([]);
        vm.prev_page("");
        vm.next_page("");
                
        J.Notifications.Post('j.facebook.failed_load_photos', this, result.error);
        return;
      }
      

      if (J.IsArray(result.data)) {
        // TODO: REMOVE
        console.log(result.data);
        
        
        vm.photos(result.data);
        this._collect_tags(result.data, 'name');
        
        J.Notifications.Notify('j.facebook.did_load_photos', this, result.data);
      } else {
        vm.photos([]);
        console.warn('Photo data from Facebook is not an Array - protocol changed?');
        J.Notifications.Notify('j.facebook.failed_load_photos', this, []);
      }
      
      if (result.hasOwnProperty('paging')) {
        if (result.paging.hasOwnProperty('previous'))
          vm.prev_page(result.paging.previous);
        else
          vm.prev_page(null);
          
        if (result.paging.hasOwnProperty('next'))
          vm.next_page(result.paging.next);
        else
          vm.next_page(null);
      } else {
        vm.next_page(null);
        vm.prev_page(null);
      }
    },

    
    LoadProfilePhotos : function(profile) {
      var _profile = profile || J.Facebook.Instance._viewModel.profile();
      _user_id = _profile.id;

      var name = _profile.name || "Snaps";
      
      this.LoadUserPhotos(_user_id, name);
    },
    
    LoadUserPhotos : function(id, name) {
      this.Clear();
      
      J.Notifications.Notify('j.facebook.will_load_user_photos', this, [ id, name ]);
      this.ViewModel.Loading(true);
      this.ViewModel.AlbumName(name);
      
      FB.api(['/', id, '/photos'].join(''), this.__photosLoaded);
    },

    LoadAlbum : function(id, name) {
      this.Clear();
      this.ViewModel.Loading(true);
      this.ViewModel.AlbumName(name);
      
      J.Notifications.Notify('j.facebook.will_load_photos', this, null);
      FB.api(['/', id, '/photos'].join(''), this.__photosLoaded);
    },


    Clear : function() {
      var vm = this.ViewModel;
      vm.photos([]);
      vm.prev_page(null);
      vm.next_page(null);
      vm.Tags([]);
      vm.AlbumName("");
      vm.ProgressMessage("");
    }
  };
}());