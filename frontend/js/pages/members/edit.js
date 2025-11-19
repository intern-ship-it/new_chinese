// js/pages/members/edit.js
// Edit Member Page - Routes to create.js with edit mode

(function($, window) {
    'use strict';
    
    // The edit page just uses the create page in edit mode
    window.MembersEditPage = {
        init: function(params) {
            // Call the create page with edit mode
            if (window.MembersCreatePage) {
                window.MembersCreatePage.init(params);
            } else {
                // Load create page script if not loaded
                $.getScript('/js/pages/members/create.js').done(function() {
                    window.MembersCreatePage.init(params);
                }).fail(function() {
                    TempleCore.showToast('Failed to load edit page', 'danger');
                    TempleRouter.navigate('members');
                });
            }
        }
    };
    
})(jQuery, window);