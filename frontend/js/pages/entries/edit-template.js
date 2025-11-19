// js/pages/entries/edit-template.js
// Template for creating edit pages for different entry types
(function($, window) {
    'use strict';
    
    window.EntryEditTemplate = {
        createEditPage: function(entryType, config) {
            return {
                entryId: null,
                entryData: null,
                ledgers: [],
                funds: [],
                items: [],
                itemCounter: 0,
                
                init: function(params) {
                    this.entryId = params.id;
                    this.loadEntry();
                },
                
                loadEntry: function() {
                    const self = this;
                    
                    TempleCore.showLoading(true);
                    
                    TempleAPI.get(`/accounts/entries/${this.entryId}`)
                        .done(function(response) {
                            if (response.success) {
                                self.entryData = response.data;
                                
                                // Check if entry can be edited
                                if (!self.entryData.can_edit) {
                                    TempleCore.showToast('This entry cannot be edited', 'error');
                                    TempleRouter.navigate('entries');
                                    return;
                                }
                                
                                // Check entry type matches
                                if (self.entryData.entrytype_id != config.entryTypeId) {
                                    TempleCore.showToast('Invalid entry type', 'error');
                                    TempleRouter.navigate('entries');
                                    return;
                                }
                                
                                self.render();
                                self.loadMasterData();
                                self.bindEvents();
                                self.populateForm();
                            } else {
                                TempleCore.showToast('Entry not found', 'error');
                                TempleRouter.navigate('entries');
                            }
                        })
                        .fail(function() {
                            TempleCore.showToast('Failed to load entry', 'error');
                            TempleRouter.navigate('entries');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                },
                
                render: function() {
                    // Use config.renderFunction to generate HTML
                    const html = config.renderFunction(this.entryData);
                    $('#page-container').html(html);
                },
                
                loadMasterData: function() {
                    // Load funds, ledgers based on config
                    config.loadMasterData.call(this);
                },
                
                populateForm: function() {
                    // Populate form fields with entry data
                    config.populateForm.call(this, this.entryData);
                },
                
                bindEvents: function() {
                    // Bind events based on config
                    config.bindEvents.call(this);
                },
                
                updateEntry: function() {
                    if (!config.validateForm.call(this)) {
                        return;
                    }
                    
                    const formData = config.getFormData.call(this);
                    
                    TempleCore.showLoading(true);
                    
                    TempleAPI.put(`/accounts/entries/${entryType}/${this.entryId}`, formData)
                        .done(function(response) {
                            if (response.success) {
                                TempleCore.showToast(`${config.entryName} updated successfully`, 'success');
                                TempleRouter.navigate('entries');
                            } else {
                                TempleCore.showToast(response.message || `Failed to update ${config.entryName}`, 'error');
                            }
                        })
                        .fail(function(xhr) {
                            const response = xhr.responseJSON;
                            TempleCore.showToast(response?.message || 'An error occurred', 'error');
                        })
                        .always(function() {
                            TempleCore.showLoading(false);
                        });
                }
            };
        }
    };
    
})(jQuery, window);