// js/pages/entries/copy-template.js
(function($, window) {
    'use strict';
    
    window.EntryCopyTemplate = {
        createCopyFunction: function(createPageModule) {
            return function(params) {
                const entryId = params.id;
                
                // Load the source entry
                TempleCore.showLoading(true);
                
                TempleAPI.get(`/accounts/entries/${entryId}`)
                    .done(function(response) {
                        if (response.success) {
                            const sourceEntry = response.data;
                            
                            // Initialize the create page
                            createPageModule.init();
                            
                            // Wait for page to load then populate with source data
                            setTimeout(function() {
                                // Set date to today
                                $('#entryDate').val(new Date().toISOString().split('T')[0]);
                                
                                // Copy other fields based on entry type
                                $('#fundId').val(sourceEntry.fund_id);
                                $('#narration').val(sourceEntry.narration);
                                
                                // Copy specific fields based on entry type
                                if (sourceEntry.paid_to) {
                                    $('#receivedFrom, #paidTo').val(sourceEntry.paid_to);
                                }
                                
                                if (sourceEntry.payment) {
                                    $('#paymentMode').val(sourceEntry.payment).trigger('change');
                                }
                                
                                // Copy entry items
                                sourceEntry.entry_items.forEach(function(item, index) {
                                    if (index > 0) {
                                        $('#btnAddRow').click();
                                    }
                                    
                                    setTimeout(function() {
                                        const rowId = index + 1;
                                        $(`.ledger-select[data-row="${rowId}"]`).val(item.ledger_id);
                                        
                                        if (item.dc === 'D') {
                                            $(`.debit-amount[data-row="${rowId}"], .amount[data-row="${rowId}"]`).val(item.amount);
                                        } else {
                                            $(`.credit-amount[data-row="${rowId}"]`).val(item.amount);
                                        }
                                        
                                        if (item.details) {
                                            $(`.details[data-row="${rowId}"]`).val(item.details);
                                        }
                                        
                                        if (item.quantity) {
                                            $('#quantity').val(item.quantity);
                                            $('#unitPrice').val(item.unit_price);
                                        }
                                    }, 100);
                                });
                                
                                // Show notification
                                TempleCore.showToast('Entry copied. Please review and make necessary changes.', 'info');
                            }, 500);
                        } else {
                            TempleCore.showToast('Source entry not found', 'error');
                            TempleRouter.navigate('entries');
                        }
                    })
                    .fail(function() {
                        TempleCore.showToast('Failed to load source entry', 'error');
                        TempleRouter.navigate('entries');
                    })
                    .always(function() {
                        TempleCore.showLoading(false);
                    });
            };
        }
    };
    
})(jQuery, window);