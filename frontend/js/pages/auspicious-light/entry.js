// // frontend/js/pages/auspicious-light/entry.js
// // Auspicious Light Entry Form - New Registration

/**
 * ================================================================
 * UPDATED entry.js WITH FAMILY MEMBER FUNCTIONALITY
 * Location: frontend/js/pages/auspicious-light/entry.js
 * ================================================================
 *
 * CHANGES MADE:
 * 1. Added familyData property to store family information
 * 2. Added selectedFamilyMembers array to track checkbox selections
 * 3. Added searchFamilyByNric() method
 * 4. Added displayFamilyMembers() method
 * 5. Added Family Members Section in the HTML
 * 6. Added auto-assign toggle for family lights
 * 7. Modified form submission to handle multiple registrations
 */

/**
 * ================================================================
 * UPDATED entry.js WITH LIGHT SELECTION VALIDATION
 * ================================================================
 *
 * NEW FEATURES:
 * 1. Validates that lights selected <= family members selected
 * 2. Shows warning if trying to select more lights than members
 * 3. Multiple light selection for family members
 * 4. Auto-assign assigns exactly N lights for N members
 */

/**
 * ================================================================
 * FIXED entry.js - Sequential Light Assignment with Debug
 * ================================================================
 * 
 * FIX: Auto-assign lights sequentially to prevent duplicate lights
 * DEBUG: Added console logs to identify the issue
 */

(function ($, window) {
    'use strict';

    window.AuspiciousLightEntryPage = {
        params: {},
        devoteeSearchTimeout: null,
        selectedDevotee: null,
        selectedLight: null,
        selectedLights: [],
        paymentModes: [],

        // Family data properties
        familyData: null,
        selectedFamilyMembers: [],
        assignedLights: [],

        // Initialize page
        init: function (params) {
            const self = this;
            self.params = params || {};
            self.selectedLights = [];
            self.render();
            self.loadPaymentModes();
            self.loadTowerCategories();
            self.attachEventHandlers();
            self.initializeDatePickers();
        },

        // Cleanup function
        cleanup: function () {
            if (this.devoteeSearchTimeout) {
                clearTimeout(this.devoteeSearchTimeout);
                this.devoteeSearchTimeout = null;
            }

            $(document).off('.auspiciousEntry');

            this.selectedDevotee = null;
            this.selectedLight = null;
            this.selectedLights = [];
            this.paymentModes = [];
            this.params = {};
            this.familyData = null;
            this.selectedFamilyMembers = [];
            this.assignedLights = [];
        },

        // Render page HTML
        render: function () {
            const html = `
                <div class="container-fluid p-4">
                    <!-- Header -->
                    <div class="card mb-4" style="background: linear-gradient(135deg, #d946a6 0%, #f59e0b 100%); border: none;">
                        <div class="card-body text-center text-white py-5">
                            <h2 class="mb-2" style="font-weight: 700;">平安灯功德表格</h2>
                            <h3 class="mb-0">Auspicious Light (Pagoda Light) Entry Form</h3>
                        </div>
                    </div>

                    <form id="registrationForm" novalidate>
                        <!-- Personal Information Section -->
                        <div class="card mb-4 shadow-sm">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-person-circle text-primary me-2"></i>
                                    Personal Information / 个人信息
                                </h5>
                            </div>
                            <div class="card-body">
                                <!-- Search by NRIC -->
                                <div class="row mb-4">
                                    <div class="col-12">
                                        <div class="alert alert-info">
                                            <i class="bi bi-info-circle me-2"></i>
                                            <strong>Search by NRIC</strong> to auto-fill devotee details and load family members
                                        </div>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                                            <input type="text" class="form-control form-control-lg" 
                                                   id="devoteeSearch" 
                                                   placeholder="Enter NRIC to search devotee and family members...">
                                            <button type="button" class="btn btn-primary" id="searchFamilyBtn">
                                                <i class="bi bi-people"></i> Search
                                            </button>
                                            <button type="button" class="btn btn-outline-secondary" id="clearDevoteeBtn">
                                                <i class="bi bi-x-lg"></i> Clear
                                            </button>
                                        </div>
                                        <div id="devoteeSearchResults" class="mt-2"></div>
                                    </div>
                                </div>

                                <!-- Family Members Section -->
                                <div id="familyMembersSection" class="mb-4" style="display: none;">
                                    <div class="card border-primary">
                                        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                                            <h6 class="mb-0">
                                                <i class="bi bi-people-fill me-2"></i>
                                                Family Members / 家庭成员
                                            </h6>
                                            <div>
                                                <button type="button" class="btn btn-sm btn-light me-2" id="selectAllFamily">
                                                    <i class="bi bi-check-all"></i> Select All
                                                </button>
                                                <button type="button" class="btn btn-sm btn-outline-light" id="deselectAllFamily">
                                                    <i class="bi bi-x-lg"></i> Deselect All
                                                </button>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            <!-- Family Head Display -->
                                            <div id="familyHeadDisplay" class="mb-3"></div>
                                            
                                            <!-- Family Members List with Checkboxes -->
                                            <div id="familyMembersList"></div>
                                            
                                            <!-- Selected Count -->
                                            <div class="mt-3 p-3 bg-light rounded">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <span>
                                                        <strong>Selected Members:</strong> 
                                                        <span id="selectedMemberCount" class="badge bg-primary fs-6">0</span>
                                                    </span>
                                                    <span>
                                                        <strong>Lights Required:</strong> 
                                                        <span id="lightsRequiredCount" class="badge bg-warning text-dark fs-6">0</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Devotee Details Form -->
                                <div id="devoteeDetailsForm">
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="form-label">姓名 Name (Chinese) <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="nameChinese" name="name_chinese">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">姓名 Name (English) <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="nameEnglish" name="name_english">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">身份证 NRIC No. <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="nric" name="nric">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">电邮 Email</label>
                                            <input type="email" class="form-control" id="email" name="email">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">手机号码 Contact No. <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="contactNo" name="contact_no">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">地址 Address</label>
                                            <input type="text" class="form-control" id="address" name="address">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Light Selection Section -->
                        <div class="card mb-4 shadow-sm">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-lightbulb text-warning me-2"></i>
                                    Light Selection / 灯位选择
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Tower Category <span class="text-danger">*</span></label>
                                        <select class="form-select" id="towerCategory">
                                            <option value="">-- Select Category --</option>
                                        </select>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Light Assignment Method <span class="text-danger">*</span></label>
                                        <select class="form-select" id="assignmentMethod" disabled>
                                            <option value="">-- Select Method --</option>
                                            <option value="auto">Auto-assign Next Available Light</option>
                                            <option value="manual">Manual Selection</option>
                                        </select>
                                        <small class="text-muted">Select a category first</small>
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Light Option / 灯位类型 <span class="text-danger">*</span></label>
                                        <select class="form-select" id="lightOption" name="light_option">
                                            <option value="">-- Select Option --</option>
                                            <option value="new_light">New Light (Individual) / 新灯</option>
                                            <option value="family_light">Family Light / 全家灯</option>
                                        </select>
                                    </div>
                                    
                                    <!-- Auto-Assign for Family Toggle -->
                                    <div class="col-md-4" id="autoAssignFamilyContainer" style="display: none;">
                                        <label class="form-label">Auto-Assign for Family</label>
                                        <div class="form-check form-switch mt-2">
                                            <input class="form-check-input" type="checkbox" id="autoAssignLights" style="width: 50px; height: 25px;">
                                            <label class="form-check-label ms-2" for="autoAssignLights">
                                                <span id="autoAssignLabel">Disabled</span>
                                            </label>
                                        </div>
                                        <small class="text-muted">Auto-assigns lights to all selected family members</small>
                                    </div>
                                </div>

                                <!-- Manual Selection Controls -->
                                <div id="manualSelectionControls" class="mt-3" style="display: none;">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label class="form-label">Tower</label>
                                            <select class="form-select" id="towerSelect">
                                                <option value="">-- Select Tower --</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Block/Column</label>
                                            <select class="form-select" id="blockSelect" disabled>
                                                <option value="">-- Select Block --</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label">Floor</label>
                                            <select class="form-select" id="floorSelect" disabled>
                                                <option value="">-- Select Floor --</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mt-3">
                                        <button type="button" class="btn btn-primary" id="searchLightsBtn" disabled>
                                            <i class="bi bi-search"></i> Search Available Lights
                                        </button>
                                    </div>
                                    
                                    <!-- Validation Message for Light Selection -->
                                    <div id="lightSelectionValidation" class="mt-3" style="display: none;">
                                        <div class="alert alert-warning mb-0">
                                            <i class="bi bi-exclamation-triangle me-2"></i>
                                            <span id="lightValidationMessage"></span>
                                        </div>
                                    </div>
                                    
                                    <div id="availableLightsContainer" class="mt-3"></div>
                                </div>

                                <!-- Selected Light Display (for single) -->
                                <div id="selectedLightDisplay" class="mt-4" style="display: none;">
                                    <div class="alert alert-success">
                                        <h6 class="alert-heading"><i class="bi bi-check-circle me-2"></i>Selected Light</h6>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <strong>Light Number:</strong><br>
                                                <span id="displayLightNumber" class="fs-4 text-primary">-</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Light Code:</strong><br>
                                                <span id="displayLightCode" class="text-monospace">-</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Location:</strong><br>
                                                <span id="displayLocation">-</span>
                                            </div>
                                            <div class="col-md-3">
                                                <strong>Status:</strong><br>
                                                <span class="badge bg-success">Available</span>
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-sm btn-outline-danger mt-2" id="clearLightBtn">
                                            <i class="bi bi-x-circle"></i> Change Light
                                        </button>
                                    </div>
                                </div>

                                <!-- Selected Lights Display (for multiple/family) -->
                                <div id="selectedLightsDisplay" class="mt-4" style="display: none;">
                                    <div class="alert alert-success">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="alert-heading mb-0">
                                                <i class="bi bi-check-circle me-2"></i>
                                                Selected Lights: <span id="selectedLightsCount" class="badge bg-primary">0</span>
                                                / <span id="maxLightsAllowed" class="badge bg-secondary">0</span> allowed
                                            </h6>
                                            <button type="button" class="btn btn-sm btn-outline-danger" id="clearAllLightsBtn">
                                                <i class="bi bi-x-circle"></i> Clear All
                                            </button>
                                        </div>
                                        <div id="selectedLightsList" class="row g-2"></div>
                                    </div>
                                </div>

                                <!-- Assigned Lights Display (for auto-assign) -->
                                <div id="assignedLightsDisplay" class="mt-4" style="display: none;">
                                    <div class="alert alert-info">
                                        <h6 class="alert-heading"><i class="bi bi-lightbulb-fill me-2"></i>Assigned Lights for Family Members</h6>
                                        <div id="assignedLightsList"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Registration Details Section -->
                        <div class="card mb-4 shadow-sm">
                            <div class="card-header bg-light">
                                <h5 class="mb-0">
                                    <i class="bi bi-calendar-check text-success me-2"></i>
                                    Registration Details / 登记详情
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-4">
                                        <label class="form-label">Offer Date / 供灯日期 <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="offerDate" name="offer_date">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Expiry Date / 到期日期 <span class="text-danger">*</span></label>
                                        <input type="date" class="form-control" id="expiryDate" name="expiry_date">
                                    </div>
                                    <div class="col-md-4">
                                        <label class="form-label">Duration (Days)</label>
                                        <input type="text" class="form-control" id="durationDisplay" readonly>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Merit Amount / 功德金 (RM) <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="meritAmount" name="merit_amount" 
                                               step="0.01" min="0.01">
                                        <small class="text-muted" id="meritAmountHint"></small>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Payment Mode <span class="text-danger">*</span></label>
                                        <select class="form-select" id="paymentMode" name="payment_mode_id">
                                            <option value="">-- Select Payment Mode --</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Payment Reference / 支付参考</label>
                                        <input type="text" class="form-control" id="paymentReference" name="payment_reference" 
                                               placeholder="e.g., Cheque No., Transaction ID">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Receipt Number</label>
                                        <input type="text" class="form-control" id="receiptNumber" name="receipt_number" readonly>
                                        <small class="text-muted">Auto-generated on save</small>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label">Remarks / 备注</label>
                                        <textarea class="form-control" id="remarks" name="remarks" rows="3" 
                                                  placeholder="Any additional notes..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Form Actions -->
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <button type="button" class="btn btn-outline-secondary btn-lg" id="resetFormBtn">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset Form
                                    </button>
                                    <div>
                                        <span id="registrationSummary" class="me-3"></span>
                                        <button type="submit" class="btn btn-success btn-lg px-5" id="submitBtn">
                                            <i class="bi bi-check-circle"></i> Submit Registration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            `;

            $('#page-container').html(html);
            $('#offerDate').val(moment().format('YYYY-MM-DD'));
            $('#expiryDate').val(moment().add(1, 'year').format('YYYY-MM-DD'));
        },

        // Load payment modes
        loadPaymentModes: function () {
            const self = this;

            TempleAPI.get('/masters/payment-modes/active')
                .done(function (response) {
                    if (response.success && response.data) {
                        self.paymentModes = response.data;
                        self.populatePaymentModes();
                    }
                })
                .fail(function () {
                    console.warn('Failed to load payment modes');
                });
        },

        populatePaymentModes: function () {
            const $select = $('#paymentMode');
            $select.empty().append('<option value="">-- Select Payment Mode --</option>');

            this.paymentModes.forEach(function (mode) {
                $select.append(`<option value="${mode.id}">${mode.name}</option>`);
            });
        },

        // Load tower categories
        loadTowerCategories: function () {
            const self = this;

            PagodaAPI.towerCategories.getActive()
                .done(function (response) {
                    if (response.success && response.data) {
                        const categories = response.data;
                        const $select = $('#towerCategory');
                        $select.empty().append('<option value="">-- Select Category --</option>');

                        categories.forEach(function (category) {
                            $select.append(`<option value="${category.id}">${category.full_name}</option>`);
                        });
                    }
                })
                .fail(function () {
                    console.warn('Failed to load tower categories');
                    TempleUtils.showWarning('Could not load tower categories. Please refresh the page.');
                });
        },

        initializeDatePickers: function () {
            $(document).on('change.auspiciousEntry', '#offerDate, #expiryDate', function () {
                const offerDate = $('#offerDate').val();
                const expiryDate = $('#expiryDate').val();

                if (offerDate && expiryDate) {
                    const start = moment(offerDate);
                    const end = moment(expiryDate);
                    const duration = end.diff(start, 'days');

                    if (duration > 0) {
                        $('#durationDisplay').val(duration + ' days');
                    } else {
                        $('#durationDisplay').val('Invalid duration');
                        TempleUtils.showWarning('Expiry date must be after offer date');
                    }
                }
            });
        },

        // Attach event handlers
        attachEventHandlers: function () {
            const self = this;

            // Search Family Button
            $(document).on('click.auspiciousEntry', '#searchFamilyBtn', function () {
                const nric = $('#devoteeSearch').val().trim();
                if (nric.length >= 3) {
                    self.searchFamilyByNric(nric);
                } else {
                    TempleUtils.showWarning('Please enter at least 3 characters');
                }
            });

            // Enter key triggers search
            $(document).on('keypress.auspiciousEntry', '#devoteeSearch', function (e) {
                if (e.which === 13) {
                    e.preventDefault();
                    $('#searchFamilyBtn').click();
                }
            });

            // Clear devotee search
            $(document).on('click.auspiciousEntry', '#clearDevoteeBtn', function () {
                self.clearDevoteeSearch();
            });

            // Family member checkbox change
            $(document).on('change.auspiciousEntry', '.family-member-checkbox', function () {
                self.updateSelectedFamilyMembers();
            });

            // Select All Family
            $(document).on('click.auspiciousEntry', '#selectAllFamily', function () {
                $('.family-member-checkbox').prop('checked', true);
                self.updateSelectedFamilyMembers();
            });

            // Deselect All Family
            $(document).on('click.auspiciousEntry', '#deselectAllFamily', function () {
                $('.family-member-checkbox').prop('checked', false);
                self.updateSelectedFamilyMembers();
            });

            // Auto-assign toggle change
            $(document).on('change.auspiciousEntry', '#autoAssignLights', function () {
                const isEnabled = $(this).is(':checked');
                $('#autoAssignLabel').text(isEnabled ? 'Enabled' : 'Disabled');

                if (isEnabled && self.selectedFamilyMembers.length > 0) {
                    self.autoAssignLightsForFamily();
                } else {
                    self.clearAssignedLights();
                }
            });

            // Tower category change
            $(document).on('change.auspiciousEntry', '#towerCategory', function () {
                const categoryId = $(this).val();

                if (categoryId) {
                    // Enable assignment method dropdown when category is selected
                    $('#assignmentMethod').prop('disabled', false);
                    $('#assignmentMethod').next('small').text('Select how to assign lights');
                } else {
                    // Disable and reset assignment method when no category selected
                    $('#assignmentMethod').prop('disabled', true).val('');
                    $('#assignmentMethod').next('small').text('Select a category first');
                    $('#manualSelectionControls').hide();
                    $('#autoAssignFamilyContainer').hide();
                }
            });

            // Assignment method change
            $(document).on('change.auspiciousEntry', '#assignmentMethod', function () {
                const method = $(this).val();

                if (method === 'auto') {
                    $('#manualSelectionControls').hide();

                    if (self.selectedFamilyMembers.length > 0) {
                        $('#autoAssignFamilyContainer').show();
                        self.checkAutoEnableAutoAssign();
                    } else {
                        self.autoAssignLight();
                    }
                } else if (method === 'manual') {
                    $('#manualSelectionControls').show();
                    $('#autoAssignFamilyContainer').hide();
                    $('#selectedLightDisplay').hide();
                    $('#assignedLightsDisplay').hide();
                    self.loadTowers();
                    self.updateLightSelectionUI();
                }
            });

            // Light Option change
            $(document).on('change.auspiciousEntry', '#lightOption', function () {
                self.checkAutoEnableAutoAssign();
            });

            // Tower selection
            $(document).on('change.auspiciousEntry', '#towerSelect', function () {
                const towerId = $(this).val();
                if (towerId) {
                    self.loadBlocks(towerId);
                } else {
                    $('#blockSelect').prop('disabled', true).empty().append('<option value="">-- Select Block --</option>');
                    $('#floorSelect').prop('disabled', true).empty().append('<option value="">-- Select Floor --</option>');
                    $('#searchLightsBtn').prop('disabled', true);
                }
            });

            // Block selection
            $(document).on('change.auspiciousEntry', '#blockSelect', function () {
                const blockId = $(this).val();
                if (blockId) {
                    self.loadFloors(blockId);
                } else {
                    $('#floorSelect').prop('disabled', true).empty().append('<option value="">-- Select Floor --</option>');
                    $('#searchLightsBtn').prop('disabled', true);
                }
            });

            // Floor selection
            $(document).on('change.auspiciousEntry', '#floorSelect', function () {
                const floor = $(this).val();
                $('#searchLightsBtn').prop('disabled', !floor);
            });

            // Search lights
            $(document).on('click.auspiciousEntry', '#searchLightsBtn', function () {
                self.searchAvailableLights();
            });

            // Clear selected light (single)
            $(document).on('click.auspiciousEntry', '#clearLightBtn', function () {
                self.selectedLight = null;
                $('#selectedLightDisplay').hide();
            });

            // Clear all selected lights (multiple)
            $(document).on('click.auspiciousEntry', '#clearAllLightsBtn', function () {
                self.selectedLights = [];
                self.updateSelectedLightsDisplay();
                $('.light-card').removeClass('selected border-success bg-success bg-opacity-10');
            });

            // Remove individual light from selection
            $(document).on('click.auspiciousEntry', '.remove-selected-light', function () {
                const lightId = $(this).data('id');
                self.removeLightFromSelection(lightId);
            });

            // Reset form
            $(document).on('click.auspiciousEntry', '#resetFormBtn', function () {
                self.resetForm();
            });

            // Form submission
            $(document).on('submit.auspiciousEntry', '#registrationForm', function (e) {
                e.preventDefault();
                self.submitRegistration();
            });

            // Merit amount change
            $(document).on('input.auspiciousEntry', '#meritAmount', function () {
                self.updateMeritAmountHint();
            });
        },

        // Check if should auto-enable Auto-Assign for Family
        checkAutoEnableAutoAssign: function () {
            const self = this;
            const assignmentMethod = $('#assignmentMethod').val();
            const lightOption = $('#lightOption').val();
            const hasFamilyMembers = self.selectedFamilyMembers.length > 0;

            if (assignmentMethod === 'auto' && lightOption === 'family_light' && hasFamilyMembers) {
                $('#autoAssignFamilyContainer').show();

                if (!$('#autoAssignLights').is(':checked')) {
                    $('#autoAssignLights').prop('checked', true);
                    $('#autoAssignLabel').text('Enabled');
                    self.autoAssignLightsForFamily();
                    TempleUtils.showSuccess('Auto-Assign for Family has been enabled automatically');
                }
            }
        },

        // Auto-fill devotee form
        autoFillDevoteeForm: function (devotee) {
            if (!devotee) return;

            $('#nameChinese').val(devotee.name_chinese || '');
            $('#nameEnglish').val(devotee.name_english || devotee.name || '');
            $('#nric').val(devotee.nric || '');
            $('#email').val(devotee.email || '');
            $('#contactNo').val(devotee.contact_no || '');
            $('#address').val(devotee.address || '');

            this.selectedDevotee = devotee;
        },

        // Custom validation
        validateForm: function () {
            const self = this;
            const errors = [];
            const isFamilyMode = self.selectedFamilyMembers.length > 0;

            if (isFamilyMode) {
                if (self.selectedFamilyMembers.length === 0) {
                    errors.push('Please select at least one family member');
                }
            } else {
                if (!$('#nameEnglish').val().trim()) {
                    errors.push('Name (English) is required');
                    $('#nameEnglish').addClass('is-invalid');
                }
                if (!$('#nric').val().trim()) {
                    errors.push('NRIC is required');
                    $('#nric').addClass('is-invalid');
                }
                if (!$('#contactNo').val().trim()) {
                    errors.push('Contact No. is required');
                    $('#contactNo').addClass('is-invalid');
                }
            }

            if (!$('#towerCategory').val()) {
                errors.push('Tower Category is required');
                $('#towerCategory').addClass('is-invalid');
            }

            if (!$('#assignmentMethod').val()) {
                errors.push('Light Assignment Method is required');
                $('#assignmentMethod').addClass('is-invalid');
            }

            if (!$('#lightOption').val()) {
                errors.push('Light Option is required');
                $('#lightOption').addClass('is-invalid');
            }

            if (!$('#offerDate').val()) {
                errors.push('Offer Date is required');
                $('#offerDate').addClass('is-invalid');
            }

            if (!$('#expiryDate').val()) {
                errors.push('Expiry Date is required');
                $('#expiryDate').addClass('is-invalid');
            }

            if (!$('#meritAmount').val() || parseFloat($('#meritAmount').val()) <= 0) {
                errors.push('Merit Amount is required');
                $('#meritAmount').addClass('is-invalid');
            }

            if (!$('#paymentMode').val()) {
                errors.push('Payment Mode is required');
                $('#paymentMode').addClass('is-invalid');
            }

            return errors;
        },

        clearValidationErrors: function () {
            $('.is-invalid').removeClass('is-invalid');
        },

        getMaxAllowedLights: function () {
            if (this.selectedFamilyMembers.length > 0) {
                return this.selectedFamilyMembers.length;
            }
            return 1;
        },

        canSelectMoreLights: function () {
            const maxAllowed = this.getMaxAllowedLights();
            return this.selectedLights.length < maxAllowed;
        },

        updateLightSelectionUI: function () {
            const maxAllowed = this.getMaxAllowedLights();
            const currentCount = this.selectedLights.length;

            $('#maxLightsAllowed').text(maxAllowed);
            $('#selectedLightsCount').text(currentCount);

            if (currentCount >= maxAllowed && maxAllowed > 0) {
                $('#lightSelectionValidation').show();
                $('#lightValidationMessage').html(
                    `You can only select <strong>${maxAllowed}</strong> light(s) for <strong>${maxAllowed}</strong> family member(s). ` +
                    `<br>Deselect a light or add more family members to select more lights.`
                );
            } else {
                $('#lightSelectionValidation').hide();
            }

            if (maxAllowed > 1) {
                $('#selectedLightsDisplay').show();
                $('#selectedLightDisplay').hide();
            } else {
                $('#selectedLightsDisplay').hide();
            }
        },

        updateSelectedLightsDisplay: function () {
            const self = this;
            const $list = $('#selectedLightsList');

            if (self.selectedLights.length === 0) {
                $list.html('<div class="col-12 text-muted text-center py-3">No lights selected yet</div>');
            } else {
                let html = '';
                self.selectedLights.forEach(function (light) {
                    html += `
                        <div class="col-md-3 col-sm-4 col-6">
                            <div class="card bg-light">
                                <div class="card-body p-2 text-center">
                                    <div class="fw-bold text-primary">${light.light_number}</div>
                                    <small class="text-muted">${light.light_code}</small>
                                    <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-2 remove-selected-light" 
                                            data-id="${light.id}" title="Remove">
                                        <i class="bi bi-x-circle"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                $list.html(html);
            }

            self.updateLightSelectionUI();
            self.updateMeritAmountHint();
        },

        removeLightFromSelection: function (lightId) {
            const self = this;

            self.selectedLights = self.selectedLights.filter(l => l.id !== lightId);
            $(`.light-card[data-light-id="${lightId}"]`).removeClass('selected border-success bg-success bg-opacity-10');
            $(`.light-card[data-light-id="${lightId}"]`).find('.bi-check-circle-fill').parent().remove();

            self.updateSelectedLightsDisplay();
        },

        addLightToSelection: function (light) {
            const self = this;

            if (self.selectedLights.find(l => l.id === light.id)) {
                TempleUtils.showWarning('This light is already selected');
                return false;
            }

            if (!self.canSelectMoreLights()) {
                const maxAllowed = self.getMaxAllowedLights();
                TempleUtils.showWarning(
                    `Maximum ${maxAllowed} light(s) allowed for ${maxAllowed} family member(s). ` +
                    `Please deselect a light first or add more family members.`
                );
                return false;
            }

            self.selectedLights.push(light);
            self.updateSelectedLightsDisplay();
            return true;
        },

        updateMeritAmountHint: function () {
            const count = this.selectedFamilyMembers.length > 0
                ? this.selectedFamilyMembers.length
                : (this.selectedLights.length > 0 ? this.selectedLights.length : 1);
            const baseAmount = parseFloat($('#meritAmount').val()) || 0;

            if (count > 1 && baseAmount > 0) {
                $('#meritAmountHint').text(`Total: RM ${(baseAmount * count).toFixed(2)} for ${count} light(s)`);
            } else {
                $('#meritAmountHint').text('');
            }
        },

        // Search Family by NRIC
        searchFamilyByNric: function (nric) {
            const self = this;

            TempleUtils.showLoading('Searching for devotee and family members...');

            PagodaAPI.devotees.getFamilyByNric(nric)
                .done(function (response) {
                    if (response.success && response.data) {
                        const data = response.data;

                        if (!data.found) {
                            $('#devoteeSearchResults').html(`
                                <div class="alert alert-info mb-0">
                                    <i class="bi bi-info-circle me-2"></i>
                                    No existing devotee found with NRIC: <strong>${nric}</strong>. 
                                    Please enter devotee details manually below.
                                </div>
                            `);
                            $('#familyMembersSection').hide();
                            $('#devoteeDetailsForm').show();
                            $('#nric').val(nric);
                            self.familyData = null;
                            self.selectedFamilyMembers = [];
                            self.selectedLights = [];
                            self.updateLightSelectionUI();
                            return;
                        }

                        self.familyData = data;

                        // Auto-fill devotee form
                        const searchedDevotee = data.devotee || data.family_head;
                        if (searchedDevotee) {
                            self.autoFillDevoteeForm(searchedDevotee);
                            TempleUtils.showSuccess('Devotee details loaded successfully');
                        }

                        if (data.has_family && (data.family_head || data.family_members.length > 0)) {
                            self.displayFamilyMembers(data);
                            $('#devoteeDetailsForm').show();
                        } else {
                            $('#familyMembersSection').hide();
                        }
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to search for family members');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // Display Family Members
        displayFamilyMembers: function (data) {
            const self = this;

            $('#familyMembersSection').show();

            // Display Family Head
            let headHtml = '';
            if (data.family_head) {
                const head = data.family_head;
                const headJson = JSON.stringify(head).replace(/'/g, "&apos;");
                headHtml = `
                    <div class="card bg-light mb-3">
                        <div class="card-body">
                            <div class="form-check">
                                <input class="form-check-input family-member-checkbox" type="checkbox" 
                                       value="${head.devotee_id}" 
                                       id="family_head_check"
                                       data-member='${headJson}'>
                                <label class="form-check-label w-100" for="family_head_check">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <span class="badge bg-primary me-2">HEAD</span>
                                            <strong>${head.name_english || head.name || ''}</strong>
                                            ${head.name_chinese ? '<span class="text-muted ms-2">' + head.name_chinese + '</span>' : ''}
                                        </div>
                                        <div class="text-end">
                                            <small class="text-muted">NRIC: ${head.nric || 'N/A'}</small><br>
                                            <small class="text-muted">Contact: ${head.contact_no || 'N/A'}</small>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                `;
            }
            $('#familyHeadDisplay').html(headHtml);

            // Display Family Members
            let membersHtml = '';
            if (data.family_members && data.family_members.length > 0) {
                membersHtml = '<div class="row g-2">';
                data.family_members.forEach(function (member, index) {
                    const memberJson = JSON.stringify(member).replace(/'/g, "&apos;");
                    membersHtml += `
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body py-2">
                                    <div class="form-check">
                                        <input class="form-check-input family-member-checkbox" type="checkbox" 
                                               value="${member.devotee_id}" 
                                               id="family_member_${index}"
                                               data-member='${memberJson}'>
                                        <label class="form-check-label w-100" for="family_member_${index}">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>${member.name_english || member.name || ''}</strong>
                                                    ${member.name_chinese ? '<br><small class="text-muted">' + member.name_chinese + '</small>' : ''}
                                                    ${member.relationship ? '<br><span class="badge bg-info">' + member.relationship + '</span>' : ''}
                                                </div>
                                                <div class="text-end">
                                                    <small class="text-muted">${member.nric || 'N/A'}</small>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                membersHtml += '</div>';
            } else {
                membersHtml = '<div class="text-muted text-center py-3">No other family members found</div>';
            }
            $('#familyMembersList').html(membersHtml);

            self.updateSelectedFamilyMembers();

            const totalCount = data.total_family_count || 0;
            $('#devoteeSearchResults').html(`
                <div class="alert alert-success mb-0">
                    <i class="bi bi-check-circle me-2"></i>
                    Found <strong>${totalCount}</strong> family member(s). 
                    ${data.is_head_of_family ? 'The searched NRIC belongs to the <strong>Head of Family</strong>.' : 'The searched NRIC belongs to a <strong>Family Member</strong>.'}
                    <br><small class="text-muted">Select the family members who should receive lights using the checkboxes above.</small>
                </div>
            `);
        },

        // Update Selected Family Members
        updateSelectedFamilyMembers: function () {
            const self = this;
            self.selectedFamilyMembers = [];

            $('.family-member-checkbox:checked').each(function () {
                const memberData = $(this).data('member');
                if (memberData) {
                    self.selectedFamilyMembers.push(memberData);
                }
            });

            const count = self.selectedFamilyMembers.length;
            $('#selectedMemberCount').text(count);
            $('#lightsRequiredCount').text(count);

            // Clear excess lights
            while (self.selectedLights.length > count && count > 0) {
                const removedLight = self.selectedLights.pop();
                $(`.light-card[data-light-id="${removedLight.id}"]`).removeClass('selected border-success bg-success bg-opacity-10');
            }

            self.updateLightSelectionUI();
            self.updateSelectedLightsDisplay();

            if (count > 0) {
                $('#registrationSummary').html(`
                    <span class="badge bg-info fs-6">
                        ${count} member(s) selected for registration
                    </span>
                `);

                if ($('#assignmentMethod').val() === 'auto') {
                    $('#autoAssignFamilyContainer').show();
                }

                self.checkAutoEnableAutoAssign();
            } else {
                $('#registrationSummary').html('');
                $('#autoAssignFamilyContainer').hide();
            }

            self.updateMeritAmountHint();

            if ($('#autoAssignLights').is(':checked')) {
                self.autoAssignLightsForFamily();
            }
        },

        // Auto-assign single light for individual registration
        autoAssignLight: function () {
            const self = this;
            const categoryId = $('#towerCategory').val();

            if (!categoryId) {
                TempleUtils.showWarning('Please select a tower category first');
                return;
            }

            TempleUtils.showLoading('Finding next available light...');

            // Get next available light from the selected category
            PagodaAPI.lights.getNextAvailable({ category_id: categoryId })
                .done(function (response) {
                    console.log('Auto-assign light response:', response);

                    if (response.success && response.data) {
                        self.selectedLight = response.data;
                        self.displaySelectedLight();
                        TempleUtils.showSuccess(`Light ${response.data.light_number} has been auto-assigned`);
                    } else {
                        TempleUtils.showError('No available lights found in the selected category');
                    }
                })
                .fail(function (xhr) {
                    console.error('Failed to auto-assign light:', xhr);
                    TempleUtils.handleAjaxError(xhr, 'Failed to auto-assign light');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        // ★★★ FIXED: Auto-assign lights SEQUENTIALLY using light_number exclusion ★★★
        autoAssignLightsForFamily: function () {
            const self = this;
            const count = self.selectedFamilyMembers.length;

            if (count === 0) {
                self.clearAssignedLights();
                return;
            }

            TempleUtils.showLoading(`Assigning ${count} light(s) for family members...`);
            self.assignedLights = [];

            // Track assigned light numbers to exclude
            let assignedLightNumbers = [];

            // ★ SEQUENTIAL ASSIGNMENT - One at a time
            const assignNextLight = function (index) {
                if (index >= count) {
                    // All done
                    self.displayAssignedLights();
                    TempleUtils.hideLoading();

                    if (self.assignedLights.length < count) {
                        TempleUtils.showWarning(`Only ${self.assignedLights.length} of ${count} lights could be assigned. Not enough available lights.`);
                    } else {
                        TempleUtils.showSuccess(`Successfully assigned ${self.assignedLights.length} unique light(s) for family members`);
                    }
                    return;
                }

                const member = self.selectedFamilyMembers[index];

                // Build exclude_ids from already assigned lights
                const excludeIds = self.assignedLights.map(item => item.light.id).filter(id => id);

                console.log(`[DEBUG] Assigning light ${index + 1}/${count} for: ${member.name_english}`);
                console.log(`[DEBUG] Exclude IDs:`, excludeIds);

                // Call API with exclude_ids
                const params = excludeIds.length > 0 ? { exclude_ids: excludeIds } : {};

                PagodaAPI.lights.getNextAvailable(params)
                    .done(function (response) {
                        console.log(`[DEBUG] API Response for ${member.name_english}:`, response);

                        if (response.success && response.data) {
                            const light = response.data;

                            // Check if this light was already assigned (fallback check)
                            const alreadyAssigned = self.assignedLights.find(
                                item => item.light.light_number === light.light_number
                            );

                            if (alreadyAssigned) {
                                console.warn(`[WARNING] Light ${light.light_number} was already assigned! Skipping...`);
                                // Try next member anyway
                                assignNextLight(index + 1);
                                return;
                            }

                            self.assignedLights.push({
                                member: member,
                                light: light
                            });

                            console.log(`[DEBUG] Assigned light ${light.light_number} (${light.light_code}) to ${member.name_english}`);
                        } else {
                            console.error(`[ERROR] No light available for ${member.name_english}`);
                        }

                        // Continue to next member
                        assignNextLight(index + 1);
                    })
                    .fail(function (xhr) {
                        console.error(`[ERROR] Failed to get light for ${member.name_english}:`, xhr);
                        // Continue to next member even on failure
                        assignNextLight(index + 1);
                    });
            };

            // Start sequential assignment from index 0
            assignNextLight(0);
        },

        // Display assigned lights
        displayAssignedLights: function () {
            const self = this;

            if (self.assignedLights.length === 0) {
                $('#assignedLightsDisplay').hide();
                return;
            }

            let html = '<div class="table-responsive"><table class="table table-sm table-bordered mb-0">';
            html += '<thead class="table-light"><tr><th>Member</th><th>Light Number</th><th>Light Code</th><th>Location</th></tr></thead>';
            html += '<tbody>';

            self.assignedLights.forEach(function (item) {
                const member = item.member;
                const light = item.light;
                html += `
                    <tr>
                        <td>
                            ${member.name_english || member.name || ''}
                            ${member.is_head ? '<span class="badge bg-primary ms-1">HEAD</span>' : ''}
                        </td>
                        <td><strong class="text-primary">${light.light_number}</strong></td>
                        <td><code>${light.light_code}</code></td>
                        <td>Floor ${light.floor_number}, Position ${light.rag_position}</td>
                    </tr>
                `;
            });

            html += '</tbody></table></div>';

            $('#assignedLightsList').html(html);
            $('#assignedLightsDisplay').show();
            $('#selectedLightDisplay').hide();
            $('#selectedLightsDisplay').hide();
        },

        clearAssignedLights: function () {
            this.assignedLights = [];
            $('#assignedLightsDisplay').hide();
            $('#assignedLightsList').html('');
        },

        selectDevotee: function (devotee) {
            this.autoFillDevoteeForm(devotee);

            $('#devoteeSearch').val('');
            $('#devoteeSearchResults').html(`
                <div class="alert alert-success mb-0">
                    <i class="bi bi-check-circle me-2"></i>
                    Devotee selected: <strong>${devotee.name_english || devotee.name}</strong>
                    <br>
                    <small class="text-muted">Contact: ${devotee.contact_no || 'N/A'}</small>
                </div>
            `);

            $('#devoteeDetailsForm').show();
            TempleUtils.showSuccess('Devotee details loaded');
        },

        clearDevoteeSearch: function () {
            this.selectedDevotee = null;
            this.familyData = null;
            this.selectedFamilyMembers = [];
            this.assignedLights = [];
            this.selectedLights = [];

            $('#devoteeSearch').val('');
            $('#devoteeSearchResults').empty();
            $('#familyMembersSection').hide();
            $('#devoteeDetailsForm').show();
            $('#nric').prop('readonly', false);
            $('#nameChinese, #nameEnglish, #nric, #email, #contactNo, #address').val('');
            $('#selectedMemberCount').text('0');
            $('#lightsRequiredCount').text('0');
            $('#registrationSummary').html('');
            $('#autoAssignFamilyContainer').hide();
            $('#assignedLightsDisplay').hide();
            $('#selectedLightsDisplay').hide();
            $('#autoAssignLights').prop('checked', false);
            $('#autoAssignLabel').text('Disabled');
            this.updateLightSelectionUI();
        },

        autoAssignLight: function () {
            const self = this;

            TempleUtils.showLoading('Finding available light...');

            PagodaAPI.lights.getNextAvailable()
                .done(function (response) {
                    if (response.success && response.data) {
                        self.selectedLight = response.data;
                        self.displaySelectedLight();
                    } else {
                        TempleUtils.showError('No available lights found');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to find available light');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        loadTowers: function () {
            PagodaAPI.towers.getAll({ status: 'active' })
                .done(function (response) {
                    if (response.success && response.data) {
                        const towers = Array.isArray(response.data) ? response.data : response.data.data || [];
                        const $select = $('#towerSelect');
                        $select.empty().append('<option value="">-- Select Tower --</option>');

                        towers.forEach(function (tower) {
                            $select.append(`<option value="${tower.id}">${tower.tower_name}</option>`);
                        });
                    }
                });
        },

        loadBlocks: function (towerId) {
            PagodaAPI.blocks.getByTower(towerId)
                .done(function (response) {
                    if (response.success && response.data) {
                        const blocks = Array.isArray(response.data) ? response.data : [];
                        const $select = $('#blockSelect');
                        $select.empty().append('<option value="">-- Select Block --</option>');

                        blocks.forEach(function (block) {
                            $select.append(`<option value="${block.id}">${block.block_name} (${block.block_code})</option>`);
                        });

                        $select.prop('disabled', false);
                    }
                });
        },

        loadFloors: function (blockId) {
            PagodaAPI.blocks.getById(blockId)
                .done(function (response) {
                    if (response.success && response.data) {
                        const block = response.data;
                        const $select = $('#floorSelect');
                        $select.empty().append('<option value="">-- Select Floor --</option>');

                        for (let i = 1; i <= block.total_floors; i++) {
                            $select.append(`<option value="${i}">Floor ${i}</option>`);
                        }

                        $select.prop('disabled', false);
                    }
                });
        },

        searchAvailableLights: function () {
            const self = this;
            const blockId = $('#blockSelect').val();
            const floor = $('#floorSelect').val();

            if (!blockId || !floor) {
                TempleUtils.showWarning('Please select tower, block, and floor');
                return;
            }

            TempleUtils.showLoading('Searching available lights...');

            PagodaAPI.lights.search({
                block_id: blockId,
                floor_number: floor,
                status: 'available',
                per_page: 100
            })
                .done(function (response) {
                    if (response.success && response.data) {
                        const lights = Array.isArray(response.data) ? response.data : response.data.data || [];
                        self.displayAvailableLights(lights);
                    } else {
                        $('#availableLightsContainer').html('<div class="alert alert-warning">No available lights found on this floor</div>');
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Failed to search lights');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                });
        },

        displayAvailableLights: function (lights) {
            const self = this;
            const $container = $('#availableLightsContainer');
            const maxAllowed = self.getMaxAllowedLights();

            if (lights.length === 0) {
                $container.html('<div class="alert alert-warning">No available lights found</div>');
                return;
            }

            let html = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle me-2"></i>
                    Click on lights to select them. 
                    <strong>Maximum ${maxAllowed} light(s)</strong> can be selected for ${maxAllowed} family member(s).
                </div>
            `;
            html += '<div class="row g-2">';

            lights.forEach(function (light) {
                const isSelected = self.selectedLights.find(l => l.id === light.id);
                const selectedClass = isSelected ? 'selected border-success bg-success bg-opacity-10' : '';

                html += `
                    <div class="col-md-2 col-sm-3 col-4">
                        <div class="card light-card ${selectedClass}" 
                             data-light='${JSON.stringify(light)}' 
                             data-light-id="${light.id}"
                             style="cursor: pointer;">
                            <div class="card-body text-center p-2">
                                <div class="fs-5 fw-bold text-primary">${light.light_number}</div>
                                <small class="text-muted">${light.light_code}</small>
                                ${isSelected ? '<div class="mt-1"><i class="bi bi-check-circle-fill text-success"></i></div>' : ''}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            $container.html(html);

            $(document).off('click.lightCard').on('click.lightCard', '.light-card', function () {
                const light = $(this).data('light');
                const isCurrentlySelected = $(this).hasClass('selected');

                if (isCurrentlySelected) {
                    self.removeLightFromSelection(light.id);
                    $(this).removeClass('selected border-success bg-success bg-opacity-10');
                    $(this).find('.bi-check-circle-fill').parent().remove();
                } else {
                    if (self.addLightToSelection(light)) {
                        $(this).addClass('selected border-success bg-success bg-opacity-10');
                        $(this).find('.card-body').append('<div class="mt-1"><i class="bi bi-check-circle-fill text-success"></i></div>');
                    }
                }
            });
        },

        displaySelectedLight: function () {
            if (!this.selectedLight) return;

            const light = this.selectedLight;

            $('#displayLightNumber').text(light.light_number);
            $('#displayLightCode').text(light.light_code);
            $('#displayLocation').text(`Floor ${light.floor_number}, Position ${light.rag_position}`);
            $('#selectedLightDisplay').show();
            $('#assignedLightsDisplay').hide();
            $('#selectedLightsDisplay').hide();
        },

        submitRegistration: function () {
            const self = this;

            self.clearValidationErrors();

            const errors = self.validateForm();

            if (errors.length > 0) {
                TempleUtils.showError(errors.join('<br>'));
                return;
            }

            if (self.selectedFamilyMembers.length > 0) {
                self.submitFamilyRegistration();
            } else {
                self.submitSingleRegistration();
            }
        },

        submitFamilyRegistration: function () {
            const self = this;

            const isAutoAssign = $('#autoAssignLights').is(':checked');

            if (isAutoAssign) {
                if (self.assignedLights.length === 0) {
                    TempleUtils.showError('Please enable auto-assign to assign lights for family members');
                    return;
                }

                if (self.assignedLights.length !== self.selectedFamilyMembers.length) {
                    TempleUtils.showError(`Not all family members have lights assigned. Assigned: ${self.assignedLights.length}, Selected: ${self.selectedFamilyMembers.length}`);
                    return;
                }

                // ★ Check for duplicate lights before submission
                const lightNumbers = self.assignedLights.map(item => item.light.light_number);
                const uniqueLightNumbers = [...new Set(lightNumbers)];

                if (lightNumbers.length !== uniqueLightNumbers.length) {
                    TempleUtils.showError('Duplicate lights detected! Please re-assign lights.');
                    console.error('[ERROR] Duplicate lights:', lightNumbers);
                    return;
                }
            } else {
                if (self.selectedLights.length === 0) {
                    TempleUtils.showError('Please select lights for family members');
                    return;
                }

                if (self.selectedLights.length !== self.selectedFamilyMembers.length) {
                    TempleUtils.showError(
                        `Number of lights (${self.selectedLights.length}) must equal number of family members (${self.selectedFamilyMembers.length}). ` +
                        `Please select exactly ${self.selectedFamilyMembers.length} light(s).`
                    );
                    return;
                }
            }

            const paymentModeId = $('#paymentMode').val();
            const paymentModeName = $('#paymentMode option:selected').text();
            const meritAmount = parseFloat($('#meritAmount').val());

            const lightsToUse = isAutoAssign ? self.assignedLights : self.selectedLights.map((light, index) => ({
                member: self.selectedFamilyMembers[index],
                light: light
            }));

            const totalAmount = meritAmount * lightsToUse.length;

            let confirmHtml = `
                <div class="text-start">
                    <p><strong>Total Members:</strong> ${lightsToUse.length}</p>
                    <p><strong>Amount per Light:</strong> RM ${meritAmount.toFixed(2)}</p>
                    <p><strong>Total Amount:</strong> RM ${totalAmount.toFixed(2)}</p>
                    <p><strong>Payment:</strong> ${paymentModeName}</p>
                    <hr>
                    <table class="table table-sm">
                        <thead><tr><th>Member</th><th>Light</th></tr></thead>
                        <tbody>
            `;

            lightsToUse.forEach(function (item) {
                confirmHtml += `<tr><td>${item.member.name_english || item.member.name}</td><td>${item.light.light_number} (${item.light.light_code})</td></tr>`;
            });

            confirmHtml += '</tbody></table></div>';

            Swal.fire({
                title: 'Confirm Family Registration',
                html: confirmHtml,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Submit All',
                cancelButtonText: 'Cancel',
                width: '600px'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.processFamilyRegistration(lightsToUse);
                }
            });
        },

        processFamilyRegistration: function (lightsToUse) {
            const self = this;

            TempleUtils.showLoading('Processing family registrations...');
            $('#submitBtn').prop('disabled', true);

            const paymentModeId = $('#paymentMode').val();
            const paymentModeName = $('#paymentMode option:selected').text();

            const registrations = lightsToUse.map(function (item) {
                const member = item.member;
                const light = item.light;

                return {
                    devotee: {
                        id: member.devotee_id || null,
                        user_id: member.user_id || null,
                        name_english: member.name_english || member.name,
                        name_chinese: member.name_chinese || null,
                        nric: member.nric || null,
                        contact_no: member.contact_no || null,
                        email: member.email || null
                    },
                    light_slot_id: light.id,
                    light_number: light.light_number,
                    light_code: light.light_code,
                    tower_code: light.tower_code || light.tower?.code || self.extractTowerCodeFromLightCode(light.light_code),
                    block_code: light.block_code || light.block?.code || self.extractBlockCodeFromLightCode(light.light_code),
                    floor_number: light.floor_number,
                    rag_position: light.rag_position,
                    category_id: $('#towerCategory').val(),
                    light_option: $('#lightOption').val(),
                    merit_amount: parseFloat($('#meritAmount').val()),
                    offer_date: $('#offerDate').val(),
                    expiry_date: $('#expiryDate').val(),
                    payment_mode_id: paymentModeId,
                    payment_method: paymentModeName,
                    payment_reference: $('#paymentReference').val() || null,
                    remarks: $('#remarks').val() || null
                };
            });

            let successCount = 0;
            let failCount = 0;

            const processNext = function (index) {
                if (index >= registrations.length) {
                    TempleUtils.hideLoading();
                    $('#submitBtn').prop('disabled', false);

                    Swal.fire({
                        title: successCount === registrations.length ? 'Success!' : 'Completed with Errors',
                        html: `
                            <div class="text-start">
                                <p class="${successCount > 0 ? 'text-success' : ''}">
                                    <i class="bi bi-check-circle me-2"></i>
                                    Successfully registered: ${successCount}
                                </p>
                                ${failCount > 0 ? `<p class="text-danger"><i class="bi bi-x-circle me-2"></i>Failed: ${failCount}</p>` : ''}
                            </div>
                        `,
                        icon: successCount === registrations.length ? 'success' : 'warning',
                        confirmButtonText: 'New Registration',
                        showCancelButton: true,
                        cancelButtonText: 'Close'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.reload();
                        }
                    });

                    return;
                }

                PagodaAPI.registrations.create(registrations[index])
                    .done(function (response) {
                        if (response.success) {
                            successCount++;
                        } else {
                            failCount++;
                        }
                    })
                    .fail(function () {
                        failCount++;
                    })
                    .always(function () {
                        processNext(index + 1);
                    });
            };

            processNext(0);
        },

        submitSingleRegistration: function () {
            const self = this;

            if (!self.selectedLight) {
                TempleUtils.showError('Please select a light');
                return;
            }

            const paymentModeId = $('#paymentMode').val();
            const paymentModeName = $('#paymentMode option:selected').text();

            const registrationData = {
                devotee: self.selectedDevotee ? {
                    id: self.selectedDevotee.id,
                    name_english: self.selectedDevotee.name_english || $('#nameEnglish').val(),
                    name_chinese: self.selectedDevotee.name_chinese || $('#nameChinese').val(),
                    nric: self.selectedDevotee.nric || $('#nric').val(),
                    contact_no: self.selectedDevotee.contact_no || $('#contactNo').val(),
                    email: self.selectedDevotee.email || $('#email').val() || null,
                    address: self.selectedDevotee.address || $('#address').val() || null
                } : {
                    name_chinese: $('#nameChinese').val(),
                    name_english: $('#nameEnglish').val(),
                    nric: $('#nric').val(),
                    email: $('#email').val() || null,
                    contact_no: $('#contactNo').val(),
                    address: $('#address').val() || null
                },
                light_slot_id: self.selectedLight.id,
                light_number: self.selectedLight.light_number,
                light_code: self.selectedLight.light_code,
                tower_code: self.selectedLight.tower_code || self.selectedLight.tower?.code || self.extractTowerCodeFromLightCode(self.selectedLight.light_code),
                block_code: self.selectedLight.block_code || self.selectedLight.block?.code || self.extractBlockCodeFromLightCode(self.selectedLight.light_code),
                floor_number: self.selectedLight.floor_number,
                rag_position: self.selectedLight.rag_position,
                category_id: $('#towerCategory').val(),
                light_option: $('#lightOption').val(),
                merit_amount: parseFloat($('#meritAmount').val()),
                offer_date: $('#offerDate').val(),
                expiry_date: $('#expiryDate').val(),
                payment_mode_id: paymentModeId,
                payment_method: paymentModeName,
                payment_reference: $('#paymentReference').val() || null,
                remarks: $('#remarks').val() || null
            };

            const devoteeDisplay = registrationData.devotee.name_english || registrationData.devotee.name_chinese || 'Unknown';

            Swal.fire({
                title: 'Confirm Registration',
                html: `
                    <div class="text-start">
                        <p><strong>Devotee:</strong> ${devoteeDisplay}</p>
                        <p><strong>Light:</strong> ${registrationData.light_number} (${registrationData.light_code})</p>
                        <p><strong>Amount:</strong> RM ${registrationData.merit_amount}</p>
                        <p><strong>Payment:</strong> ${registrationData.payment_method}</p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, Submit',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    self.processRegistration(registrationData);
                }
            });
        },

        processRegistration: function (data) {
            const self = this;

            TempleUtils.showLoading('Submitting registration...');
            $('#submitBtn').prop('disabled', true);

            PagodaAPI.registrations.create(data)
                .done(function (response) {
                    if (response.success) {
                        Swal.fire({
                            title: 'Success!',
                            html: `
                                <div class="text-start">
                                    <p class="text-success"><i class="bi bi-check-circle me-2"></i>Registration completed successfully!</p>
                                    <hr>
                                    <p><strong>Receipt No:</strong> ${response.data.receipt_number}</p>
                                    <p><strong>Light No:</strong> ${response.data.light_number}</p>
                                </div>
                            `,
                            icon: 'success',
                            confirmButtonText: 'New Registration',
                            showCancelButton: true,
                            cancelButtonText: 'Close'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.reload();
                            }
                        });
                    }
                })
                .fail(function (xhr) {
                    TempleUtils.handleAjaxError(xhr, 'Registration failed');
                })
                .always(function () {
                    TempleUtils.hideLoading();
                    $('#submitBtn').prop('disabled', false);
                });
        },

        extractTowerCodeFromLightCode: function (lightCode) {
            if (lightCode && typeof lightCode === 'string') {
                const parts = lightCode.split('-');
                return parts.length > 0 ? parts[0] : null;
            }
            return null;
        },

        extractBlockCodeFromLightCode: function (lightCode) {
            if (lightCode && typeof lightCode === 'string') {
                const parts = lightCode.split('-');
                return parts.length > 1 ? parts[1] : null;
            }
            return null;
        },

        resetForm: function () {
            const self = this;

            Swal.fire({
                title: 'Reset Form?',
                text: 'All entered data will be lost',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, Reset',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $('#registrationForm')[0].reset();
                    self.selectedDevotee = null;
                    self.selectedLight = null;
                    self.selectedLights = [];
                    self.familyData = null;
                    self.selectedFamilyMembers = [];
                    self.assignedLights = [];

                    self.clearValidationErrors();
                    $('#selectedLightDisplay').hide();
                    $('#selectedLightsDisplay').hide();
                    $('#assignedLightsDisplay').hide();
                    $('#familyMembersSection').hide();
                    $('#devoteeSearchResults').empty();
                    $('#devoteeDetailsForm').show();
                    $('#nric').prop('readonly', false);
                    $('#assignmentMethod').val('');
                    $('#lightOption').val('');
                    $('#autoAssignFamilyContainer').hide();
                    $('#autoAssignLights').prop('checked', false);
                    $('#autoAssignLabel').text('Disabled');
                    $('#selectedMemberCount').text('0');
                    $('#lightsRequiredCount').text('0');
                    $('#registrationSummary').html('');
                    $('#lightSelectionValidation').hide();
                    $('#manualSelectionControls').hide();

                    $('#offerDate').val(moment().format('YYYY-MM-DD'));
                    $('#expiryDate').val(moment().add(1, 'year').format('YYYY-MM-DD'));

                    TempleUtils.showSuccess('Form reset successfully');
                }
            });
        }
    };

})(jQuery, window);

// frontend/js/pages/auspicious-light/entry.js
// Auspicious Light Entry Form with Dynamic Tailwind CSS Loading

// (function ($, window) {
//     'use strict';

//     window.AuspiciousLightEntryPage = {
//         params: {},
//         devoteeSearchTimeout: null,
//         selectedDevotee: null,
//         selectedLight: null,
//         paymentModes: [],
//         tailwindLoaded: false,

//         // Initialize page
//         init: function (params) {
//             const self = this;

//             // Load Tailwind CSS first
//             self.loadTailwindCSS()

//                 .then(function () {
//                     self.params = params || {};
//                     self.render();
//                     self.loadPaymentModes();
//                     self.attachEventHandlers();
//                     self.initializeDatePickers();
//                 })
//                 .catch(function (error) {
//                     console.error('Failed to initialize entry page:', error);
//                     TempleUtils.showError('Failed to initialize entry page');
//                 });
//         },

//         // Load Tailwind CSS dynamically
//         loadTailwindCSS: function () {
//             const self = this;

//             return new Promise(function (resolve, reject) {
//                 // Check if Tailwind is already loaded
//                 if (window.tailwind || self.tailwindLoaded) {
//                     console.log('Tailwind CSS already loaded');
//                     resolve();
//                     return;
//                 }

//                 console.log('Loading Tailwind CSS...');

//                 // Create and inject Tailwind script
//                 const script = document.createElement('script');
//                 script.src = 'https://cdn.tailwindcss.com';
//                 script.onload = function () {
//                     console.log('Tailwind CSS loaded successfully');

//                     // Configure Tailwind
//                     if (window.tailwind) {
//                         window.tailwind.config = {
//                             theme: {
//                                 extend: {
//                                     colors: {
//                                         primary: '#667eea',
//                                         secondary: '#764ba2',
//                                     }
//                                 }
//                             }
//                         };
//                     }

//                     self.tailwindLoaded = true;

//                     // Small delay to ensure Tailwind is fully initialized
//                     setTimeout(resolve, 100);
//                 };
//                 script.onerror = function () {
//                     console.error('Failed to load Tailwind CSS');
//                     reject(new Error('Failed to load Tailwind CSS'));
//                 };

//                 document.head.appendChild(script);
//             });
//         },

//         // Render page HTML with Tailwind classes
//         render: function () {
//             const html = `
//                 <div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 md:p-8">
//                     <!-- Header -->
//                     <div class="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 shadow-2xl animate-gradient">
//                         <div class="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
//                         <div class="relative py-12 px-6 text-center text-white">
//                             <h2 class="text-4xl font-bold mb-2 drop-shadow-lg">平安灯功德表格</h2>
//                             <h3 class="text-2xl font-semibold">Auspicious Light (Pagoda Light) Entry Form</h3>
//                         </div>
//                     </div>

//                     <form id="registrationForm" class="max-w-7xl mx-auto space-y-6">

//                         <!-- Personal Information Section -->
//                         <div class="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
//                             <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
//                                 <h5 class="text-white font-semibold text-lg flex items-center gap-3">
//                                     <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
//                                         <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
//                                     </svg>
//                                     Personal Information / 个人信息
//                                 </h5>
//                             </div>
//                             <div class="p-6 md:p-8">
//                                 <!-- Search Existing Devotee -->
//                                 <div class="mb-8">
//                                     <div class="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
//                                         <div class="flex items-center gap-2 text-blue-700">
//                                             <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                                                 <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
//                                             </svg>
//                                             <span class="text-sm font-medium">Search by NRIC or Contact to auto-fill devotee details</span>
//                                         </div>
//                                     </div>
//                                     <div class="relative flex items-center gap-2 group">
//                                         <div class="absolute left-4 text-purple-500">
//                                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
//                                             </svg>
//                                         </div>
//                                         <input type="text"
//                                                id="devoteeSearch"
//                                                placeholder="Enter NRIC or Contact Number to search existing devotee..."
//                                                class="flex-1 pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                         <button type="button"
//                                                 id="clearDevoteeBtn"
//                                                 class="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-300 flex items-center gap-2">
//                                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
//                                             </svg>
//                                             Clear
//                                         </button>
//                                     </div>
//                                     <div id="devoteeSearchResults" class="mt-4"></div>
//                                 </div>

//                                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
//                                     <!-- Chinese Name -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             姓名 Name (Chinese) <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="text"
//                                                id="nameChinese"
//                                                name="name_chinese"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- English Name -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             姓名 Name (English) <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="text"
//                                                id="nameEnglish"
//                                                name="name_english"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- NRIC -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             身份证 NRIC No. <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="text"
//                                                id="nric"
//                                                name="nric"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                         <p class="text-red-500 text-sm mt-1 hidden invalid-feedback">NRIC already exists</p>
//                                     </div>

//                                     <!-- Email -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             电邮 Email
//                                         </label>
//                                         <input type="email"
//                                                id="email"
//                                                name="email"
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                         <p class="text-red-500 text-sm mt-1 hidden invalid-feedback">Please enter a valid email</p>
//                                     </div>

//                                     <!-- Contact -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             手机号码 Contact No. <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="text"
//                                                id="contactNo"
//                                                name="contact_no"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- Address -->
//                                     <div class="group">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             地址 Address
//                                         </label>
//                                         <input type="text"
//                                                id="address"
//                                                name="address"
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <!-- Light Selection Section -->
//                         <div class="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
//                             <div class="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
//                                 <h5 class="text-white font-semibold text-lg flex items-center gap-3">
//                                     <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
//                                         <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/>
//                                     </svg>
//                                     Light Selection / 灯位选择
//                                 </h5>
//                             </div>
//                             <div class="p-6 md:p-8">
//                                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//                                     <!-- Assignment Method -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Light Assignment Method <span class="text-red-500">*</span>
//                                         </label>
//                                         <select id="assignmentMethod"
//                                                 required
//                                                 class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white cursor-pointer">
//                                             <option value="">-- Select Method --</option>
//                                             <option value="auto" selected>Auto-assign Next Available Light</option>
//                                             <option value="manual">Manual Selection</option>
//                                         </select>
//                                     </div>

//                                     <!-- Light Option -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Light Option / 灯位类型 <span class="text-red-500">*</span>
//                                         </label>
//                                         <select id="lightOption"
//                                                 name="light_option"
//                                                 required
//                                                 class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white cursor-pointer">
//                                             <option value="">-- Select Option --</option>
//                                             <option value="new_light">New Light (Individual) / 新灯</option>
//                                             <option value="family_light">Family Light / 全家灯</option>
//                                         </select>
//                                     </div>
//                                 </div>

//                                 <!-- Manual Selection Controls -->
//                                 <div id="manualSelectionControls" class="hidden">
//                                     <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
//                                         <div>
//                                             <label class="block text-gray-700 font-semibold mb-2">Tower</label>
//                                             <select id="towerSelect" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none bg-gray-50 focus:bg-white cursor-pointer">
//                                                 <option value="">-- Select Tower --</option>
//                                             </select>
//                                         </div>
//                                         <div>
//                                             <label class="block text-gray-700 font-semibold mb-2">Block/Column</label>
//                                             <select id="blockSelect" disabled class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none bg-gray-100 cursor-not-allowed">
//                                                 <option value="">-- Select Block --</option>
//                                             </select>
//                                         </div>
//                                         <div>
//                                             <label class="block text-gray-700 font-semibold mb-2">Floor</label>
//                                             <select id="floorSelect" disabled class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none bg-gray-100 cursor-not-allowed">
//                                                 <option value="">-- Select Floor --</option>
//                                             </select>
//                                         </div>
//                                     </div>
//                                     <button type="button"
//                                             id="searchLightsBtn"
//                                             disabled
//                                             class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
//                                         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
//                                         </svg>
//                                         Search Available Lights
//                                     </button>
//                                     <div id="availableLightsContainer" class="mt-4"></div>
//                                 </div>

//                                 <!-- Selected Light Display -->
//                                 <div id="selectedLightDisplay" class="hidden mt-6">
//                                     <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 relative overflow-hidden">
//                                         <div class="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full opacity-20 -mr-16 -mt-16"></div>
//                                         <h6 class="text-green-800 font-bold text-lg mb-4 flex items-center gap-2">
//                                             <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
//                                                 <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
//                                             </svg>
//                                             Selected Light
//                                         </h6>
//                                         <div class="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
//                                             <div>
//                                                 <p class="text-gray-600 text-sm mb-1">Light Number</p>
//                                                 <p id="displayLightNumber" class="text-3xl font-bold text-purple-600">-</p>
//                                             </div>
//                                             <div>
//                                                 <p class="text-gray-600 text-sm mb-1">Light Code</p>
//                                                 <p id="displayLightCode" class="text-lg font-mono font-semibold text-gray-800">-</p>
//                                             </div>
//                                             <div>
//                                                 <p class="text-gray-600 text-sm mb-1">Location</p>
//                                                 <p id="displayLocation" class="text-lg font-semibold text-gray-800">-</p>
//                                             </div>
//                                             <div>
//                                                 <p class="text-gray-600 text-sm mb-1">Status</p>
//                                                 <span class="inline-flex px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">Available</span>
//                                             </div>
//                                         </div>
//                                         <button type="button"
//                                                 id="clearLightBtn"
//                                                 class="mt-4 px-4 py-2 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all duration-300 flex items-center gap-2">
//                                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
//                                             </svg>
//                                             Change Light
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <!-- Registration Details Section -->
//                         <div class="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
//                             <div class="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4">
//                                 <h5 class="text-white font-semibold text-lg flex items-center gap-3">
//                                     <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
//                                         <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/>
//                                     </svg>
//                                     Registration Details / 登记详情
//                                 </h5>
//                             </div>
//                             <div class="p-6 md:p-8">
//                                 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                                     <!-- Offer Date -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Offer Date / 供灯日期 <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="date"
//                                                id="offerDate"
//                                                name="offer_date"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- Expiry Date -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Expiry Date / 到期日期 <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="date"
//                                                id="expiryDate"
//                                                name="expiry_date"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- Duration -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Duration (Days)
//                                         </label>
//                                         <input type="text"
//                                                id="durationDisplay"
//                                                readonly
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-not-allowed">
//                                     </div>

//                                     <!-- Merit Amount -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Merit Amount / 功德金 (RM) <span class="text-red-500">*</span>
//                                         </label>
//                                         <input type="number"
//                                                id="meritAmount"
//                                                name="merit_amount"
//                                                step="0.01"
//                                                min="0.01"
//                                                required
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- Payment Mode -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Payment Mode <span class="text-red-500">*</span>
//                                         </label>
//                                         <select id="paymentMode"
//                                                 name="payment_mode_id"
//                                                 required
//                                                 class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white cursor-pointer">
//                                             <option value="">-- Select Payment Mode --</option>
//                                         </select>
//                                     </div>

//                                     <!-- Payment Reference -->
//                                     <div>
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Payment Reference / 支付参考
//                                         </label>
//                                         <input type="text"
//                                                id="paymentReference"
//                                                name="payment_reference"
//                                                placeholder="e.g., Cheque No., Transaction ID"
//                                                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white">
//                                     </div>

//                                     <!-- Receipt Number (full width) -->
//                                     <div class="md:col-span-2 lg:col-span-3">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Receipt Number
//                                         </label>
//                                         <div class="relative">
//                                             <input type="text"
//                                                    id="receiptNumber"
//                                                    name="receipt_number"
//                                                    readonly
//                                                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-700 font-mono font-semibold cursor-not-allowed">
//                                             <span class="absolute top-0 right-0 -mt-2 -mr-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg">
//                                                 Auto-generated
//                                             </span>
//                                         </div>
//                                         <p class="text-gray-500 text-sm mt-1">Auto-generated on save</p>
//                                     </div>

//                                     <!-- Remarks (full width) -->
//                                     <div class="md:col-span-2 lg:col-span-3">
//                                         <label class="block text-gray-700 font-semibold mb-2">
//                                             Remarks / 备注
//                                         </label>
//                                         <textarea id="remarks"
//                                                   name="remarks"
//                                                   rows="3"
//                                                   placeholder="Any additional notes..."
//                                                   class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 outline-none bg-gray-50 focus:bg-white resize-none"></textarea>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <!-- Form Actions -->
//                         <div class="bg-white rounded-2xl shadow-xl p-6">
//                             <div class="flex flex-col md:flex-row justify-between items-center gap-4">
//                                 <button type="button"
//                                         id="resetFormBtn"
//                                         class="w-full md:w-auto px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-lg">
//                                     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
//                                     </svg>
//                                     Reset Form
//                                 </button>
//                                 <button type="submit"
//                                         id="submitBtn"
//                                         class="w-full md:w-auto px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 hover:shadow-2xl">
//                                     <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
//                                     </svg>
//                                     Submit Registration
//                                 </button>
//                             </div>
//                         </div>
//                     </form>
//                 </div>

//                 <style>
//                 @keyframes gradient {
//                     0% { background-position: 0% 50%; }
//                     50% { background-position: 100% 50%; }
//                     100% { background-position: 0% 50%; }
//                 }
//                 .animate-gradient {
//                     background-size: 200% 200%;
//                     animation: gradient 3s ease infinite;
//                 }
//                 </style>
//             `;

//             $('#page-container').html(html);

//             // Set default dates
//             $('#offerDate').val(moment().format('YYYY-MM-DD'));
//             $('#expiryDate').val(moment().add(1, 'year').format('YYYY-MM-DD'));
//         },

//         // Load payment modes
//         loadPaymentModes: function () {
//             const self = this;

//             TempleAPI.get('/payment-modes/active')
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         self.paymentModes = response.data;
//                         self.populatePaymentModes();
//                     }
//                 })
//                 .fail(function () {
//                     console.warn('Failed to load payment modes');
//                 });
//         },

//         // Populate payment modes dropdown
//         populatePaymentModes: function () {
//             const $select = $('#paymentMode');
//             $select.empty().append('<option value="">-- Select Payment Mode --</option>');

//             this.paymentModes.forEach(function (mode) {
//                 $select.append(`<option value="${mode.id}">${mode.mode_name}</option>`);
//             });
//         },

//         // Initialize date pickers
//         initializeDatePickers: function () {
//             const self = this;

//             // Calculate duration when dates change
//             $('#offerDate, #expiryDate').on('change', function () {
//                 const offerDate = $('#offerDate').val();
//                 const expiryDate = $('#expiryDate').val();

//                 if (offerDate && expiryDate) {
//                     const start = moment(offerDate);
//                     const end = moment(expiryDate);
//                     const duration = end.diff(start, 'days');

//                     if (duration > 0) {
//                         $('#durationDisplay').val(duration + ' days');
//                     } else {
//                         $('#durationDisplay').val('Invalid duration');
//                         TempleUtils.showWarning('Expiry date must be after offer date');
//                     }
//                 }
//             });
//         },

//         // Attach event handlers
//         attachEventHandlers: function () {
//             const self = this;

//             // Devotee search
//             $('#devoteeSearch').on('input', function () {
//                 clearTimeout(self.devoteeSearchTimeout);
//                 const query = $(this).val().trim();

//                 if (query.length >= 3) {
//                     self.devoteeSearchTimeout = setTimeout(function () {
//                         self.searchDevotee(query);
//                     }, 500);
//                 } else {
//                     $('#devoteeSearchResults').empty();
//                 }
//             });

//             // Clear devotee search
//             $('#clearDevoteeBtn').on('click', function () {
//                 self.clearDevoteeSearch();
//             });

//             // Assignment method change
//             $('#assignmentMethod').on('change', function () {
//                 const method = $(this).val();

//                 if (method === 'auto') {
//                     $('#manualSelectionControls').hide();
//                     self.autoAssignLight();
//                 } else if (method === 'manual') {
//                     $('#manualSelectionControls').removeClass('hidden');
//                     $('#selectedLightDisplay').addClass('hidden');
//                     self.loadTowers();
//                 }
//             });

//             // Tower selection
//             $('#towerSelect').on('change', function () {
//                 const towerId = $(this).val();
//                 if (towerId) {
//                     self.loadBlocks(towerId);
//                 } else {
//                     $('#blockSelect').prop('disabled', true).empty().append('<option value="">-- Select Block --</option>');
//                     $('#floorSelect').prop('disabled', true).empty().append('<option value="">-- Select Floor --</option>');
//                     $('#searchLightsBtn').prop('disabled', true);
//                 }
//             });

//             // Block selection
//             $('#blockSelect').on('change', function () {
//                 const blockId = $(this).val();
//                 if (blockId) {
//                     self.loadFloors(blockId);
//                 } else {
//                     $('#floorSelect').prop('disabled', true).empty().append('<option value="">-- Select Floor --</option>');
//                     $('#searchLightsBtn').prop('disabled', true);
//                 }
//             });

//             // Floor selection
//             $('#floorSelect').on('change', function () {
//                 const floor = $(this).val();
//                 $('#searchLightsBtn').prop('disabled', !floor);
//             });

//             // Search lights
//             $('#searchLightsBtn').on('click', function () {
//                 self.searchAvailableLights();
//             });

//             // Clear selected light
//             $('#clearLightBtn').on('click', function () {
//                 self.selectedLight = null;
//                 $('#selectedLightDisplay').addClass('hidden');
//             });

//             // Reset form
//             $('#resetFormBtn').on('click', function () {
//                 self.resetForm();
//             });

//             // Form submission
//             $('#registrationForm').on('submit', function (e) {
//                 e.preventDefault();
//                 self.submitRegistration();
//             });

//             // Trigger auto-assign on page load
//             if ($('#assignmentMethod').val() === 'auto') {
//                 self.autoAssignLight();
//             }
//         },

//         // Search devotee by NRIC or contact
//         searchDevotee: function (query) {
//             const self = this;
//             const $results = $('#devoteeSearchResults');

//             $results.html(`
//                 <div class="flex items-center justify-center py-4">
//                     <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
//                     <span class="ml-3 text-gray-600">Searching...</span>
//                 </div>
//             `);

//             PagodaAPI.devotees.search({ query: query })
//                 .done(function (response) {
//                     if (response.success && response.data && response.data.length > 0) {
//                         self.displayDevoteeResults(response.data);
//                     } else {
//                         $results.html(`
//                             <div class="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4">
//                                 <div class="flex items-center gap-2 text-blue-800">
//                                     <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"/>
//                                     </svg>
//                                     <span class="text-sm font-medium">No existing devotee found. Please enter new devotee details.</span>
//                                 </div>
//                             </div>
//                         `);
//                     }
//                 })
//                 .fail(function () {
//                     $results.html(`
//                         <div class="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
//                             <div class="flex items-center gap-2 text-red-800">
//                                 <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                                     <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
//                                 </svg>
//                                 <span class="text-sm font-medium">Search failed. Please try again.</span>
//                             </div>
//                         </div>
//                     `);
//                 });
//         },

//         // Display devotee search results
//         displayDevoteeResults: function (devotees) {
//             const self = this;
//             const $results = $('#devoteeSearchResults');

//             let html = '<div class="space-y-2">';

//             devotees.forEach(function (devotee) {
//                 html += `
//                     <div class="devotee-item-tailwind group cursor-pointer bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-gray-100 hover:border-purple-500 p-4 transition-all duration-300 transform hover:-translate-y-1"
//                          data-devotee='${JSON.stringify(devotee)}'>
//                         <div class="flex items-center justify-between">
//                             <div class="flex-1">
//                                 <div class="font-bold text-gray-800 text-lg">
//                                     ${devotee.name_english || ''}
//                                     ${devotee.name_chinese ? '<span class="text-purple-600">/ ' + devotee.name_chinese + '</span>' : ''}
//                                 </div>
//                                 <div class="text-sm text-gray-500 mt-1 flex items-center gap-3">
//                                     <span class="flex items-center gap-1">
//                                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
//                                         </svg>
//                                         ${devotee.nric || 'N/A'}
//                                     </span>
//                                     <span class="flex items-center gap-1">
//                                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
//                                         </svg>
//                                         ${devotee.contact_no || 'N/A'}
//                                     </span>
//                                 </div>
//                             </div>
//                             <div class="ml-4">
//                                 <span class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold text-sm group-hover:shadow-lg transition-all duration-300">
//                                     Select
//                                 </span>
//                             </div>
//                         </div>
//                     </div>
//                 `;
//             });

//             html += '</div>';
//             $results.html(html);

//             // Handle selection
//             $('.devotee-item-tailwind').on('click', function (e) {
//                 e.preventDefault();
//                 const devotee = $(this).data('devotee');

//                 // Add selection animation
//                 $(this).addClass('ring-4 ring-green-500');

//                 setTimeout(() => {
//                     self.selectDevotee(devotee);
//                 }, 200);
//             });
//         },

//         // Select devotee and populate form
//         selectDevotee: function (devotee) {
//             this.selectedDevotee = devotee;

//             // Populate form fields
//             $('#nameChinese').val(devotee.name_chinese || '');
//             $('#nameEnglish').val(devotee.name_english || '');
//             $('#nric').val(devotee.nric || '').prop('readonly', true);
//             $('#email').val(devotee.email || '');
//             $('#contactNo').val(devotee.contact_no || '');
//             $('#address').val(devotee.address || '');

//             // Clear search
//             $('#devoteeSearch').val('');
//             $('#devoteeSearchResults').html(`
//                 <div class="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
//                     <div class="flex items-center gap-2 text-green-800">
//                         <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                             <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
//                         </svg>
//                         <span class="text-sm font-medium">Devotee selected: <strong>${devotee.name_english}</strong></span>
//                     </div>
//                 </div>
//             `);

//             TempleUtils.showSuccess('Devotee details loaded');
//         },

//         // Clear devotee search
//         clearDevoteeSearch: function () {
//             this.selectedDevotee = null;
//             $('#devoteeSearch').val('');
//             $('#devoteeSearchResults').empty();
//             $('#nric').prop('readonly', false);
//             $('#nameChinese, #nameEnglish, #nric, #email, #contactNo, #address').val('');
//         },

//         // Auto-assign next available light
//         autoAssignLight: function () {
//             const self = this;

//             TempleUtils.showLoading('Finding available light...');

//             PagodaAPI.lights.getNextAvailable()
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         self.selectedLight = response.data;
//                         self.displaySelectedLight();
//                         TempleUtils.showSuccess('Light auto-assigned successfully');
//                     } else {
//                         TempleUtils.showError('No available lights found');
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Failed to find available light');
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                 });
//         },

//         // Load towers for manual selection
//         loadTowers: function () {
//             const self = this;

//             PagodaAPI.towers.getAll({ status: 'active' })
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         const towers = Array.isArray(response.data) ? response.data : response.data.data || [];
//                         const $select = $('#towerSelect');
//                         $select.empty().append('<option value="">-- Select Tower --</option>');

//                         towers.forEach(function (tower) {
//                             $select.append(`<option value="${tower.id}">${tower.tower_name}</option>`);
//                         });
//                     }
//                 });
//         },

//         // Load blocks for selected tower
//         loadBlocks: function (towerId) {
//             const self = this;

//             PagodaAPI.blocks.getByTower(towerId)
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         const blocks = Array.isArray(response.data) ? response.data : [];
//                         const $select = $('#blockSelect');
//                         $select.empty().append('<option value="">-- Select Block --</option>');

//                         blocks.forEach(function (block) {
//                             $select.append(`<option value="${block.id}">${block.block_name} (${block.block_code})</option>`);
//                         });

//                         $select.prop('disabled', false);
//                     }
//                 });
//         },

//         // Load floors for selected block
//         loadFloors: function (blockId) {
//             const self = this;

//             PagodaAPI.blocks.getById(blockId)
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         const block = response.data;
//                         const $select = $('#floorSelect');
//                         $select.empty().append('<option value="">-- Select Floor --</option>');

//                         for (let i = 1; i <= block.total_floors; i++) {
//                             $select.append(`<option value="${i}">Floor ${i}</option>`);
//                         }

//                         $select.prop('disabled', false);
//                     }
//                 });
//         },

//         // Search available lights
//         searchAvailableLights: function () {
//             const self = this;
//             const blockId = $('#blockSelect').val();
//             const floor = $('#floorSelect').val();

//             if (!blockId || !floor) {
//                 TempleUtils.showWarning('Please select tower, block, and floor');
//                 return;
//             }

//             TempleUtils.showLoading('Searching available lights...');

//             PagodaAPI.lights.search({
//                 block_id: blockId,
//                 floor_number: floor,
//                 status: 'available',
//                 per_page: 50
//             })
//                 .done(function (response) {
//                     if (response.success && response.data) {
//                         const lights = Array.isArray(response.data) ? response.data : response.data.data || [];
//                         self.displayAvailableLights(lights);
//                     } else {
//                         $('#availableLightsContainer').html(`
//                             <div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 text-yellow-800">
//                                 <div class="flex items-center gap-2">
//                                     <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                                         <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
//                                     </svg>
//                                     <span class="font-medium">No available lights found on this floor</span>
//                                 </div>
//                             </div>
//                         `);
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Failed to search lights');
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                 });
//         },

//         // Display available lights for selection
//         displayAvailableLights: function (lights) {
//             const self = this;
//             const $container = $('#availableLightsContainer');

//             if (lights.length === 0) {
//                 $container.html(`
//                     <div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 text-yellow-800">
//                         <div class="flex items-center gap-2">
//                             <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
//                                 <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
//                             </svg>
//                             <span class="font-medium">No available lights found</span>
//                         </div>
//                     </div>
//                 `);
//                 return;
//             }

//             let html = `
//                 <div class="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-3 mb-4">
//                     <p class="text-blue-800 text-sm font-medium flex items-center gap-2">
//                         <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
//                             <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
//                             <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"/>
//                         </svg>
//                         Click on a light to select it
//                     </p>
//                 </div>
//                 <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
//             `;

//             lights.forEach(function (light) {
//                 html += `
//                     <div class="light-card-tailwind group cursor-pointer transform transition-all duration-300 hover:scale-110 hover:-translate-y-2"
//                          data-light='${JSON.stringify(light)}'>
//                         <div class="bg-white rounded-xl shadow-md hover:shadow-2xl border-2 border-gray-200 group-hover:border-purple-500 p-4 text-center transition-all duration-300">
//                             <div class="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
//                                 ${light.light_number}
//                             </div>
//                             <div class="text-xs text-gray-500 mt-1 font-mono truncate">
//                                 ${light.light_code}
//                             </div>
//                             <div class="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
//                                 <span class="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
//                                     <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
//                                     </svg>
//                                 </span>
//                             </div>
//                         </div>
//                     </div>
//                 `;
//             });

//             html += '</div>';
//             $container.html(html);

//             // Handle light selection
//             $('.light-card-tailwind').on('click', function () {
//                 const light = $(this).data('light');

//                 // Add selection animation
//                 $(this).addClass('ring-4 ring-purple-500 scale-95');

//                 setTimeout(() => {
//                     self.selectedLight = light;
//                     self.displaySelectedLight();
//                     $container.empty();
//                 }, 300);
//             });
//         },

//         // Display selected light
//         displaySelectedLight: function () {
//             if (!this.selectedLight) return;

//             const light = this.selectedLight;

//             $('#displayLightNumber').text(light.light_number);
//             $('#displayLightCode').text(light.light_code);
//             $('#displayLocation').text(`Floor ${light.floor_number}, Position ${light.rag_position}`);
//             $('#selectedLightDisplay').removeClass('hidden');
//         },

//         // Submit registration
//         submitRegistration: function () {
//             const self = this;

//             // Validate light selection
//             if (!self.selectedLight) {
//                 TempleUtils.showError('Please select a light');
//                 return;
//             }

//             // Validate form
//             const form = document.getElementById('registrationForm');
//             if (!form.checkValidity()) {
//                 form.classList.add('was-validated');
//                 TempleUtils.showWarning('Please fill all required fields');
//                 return;
//             }

//             // Prepare registration data
//             const registrationData = {
//                 // Devotee info (create or use existing)
//                 devotee: self.selectedDevotee ? {
//                     id: self.selectedDevotee.id
//                 } : {
//                     name_chinese: $('#nameChinese').val(),
//                     name_english: $('#nameEnglish').val(),
//                     nric: $('#nric').val(),
//                     email: $('#email').val() || null,
//                     contact_no: $('#contactNo').val(),
//                     address: $('#address').val() || null
//                 },

//                 // Light info
//                 light_slot_id: self.selectedLight.id,
//                 light_number: self.selectedLight.light_number,
//                 light_code: self.selectedLight.light_code,
//                 tower_code: self.selectedLight.block.tower.tower_code,
//                 block_code: self.selectedLight.block.block_code,
//                 floor_number: self.selectedLight.floor_number,
//                 rag_position: self.selectedLight.rag_position,

//                 // Registration details
//                 light_option: $('#lightOption').val(),
//                 merit_amount: parseFloat($('#meritAmount').val()),
//                 offer_date: $('#offerDate').val(),
//                 expiry_date: $('#expiryDate').val(),
//                 payment_mode_id: $('#paymentMode').val(),
//                 payment_reference: $('#paymentReference').val() || null,
//                 remarks: $('#remarks').val() || null
//             };

//             // Confirm submission
//             Swal.fire({
//                 title: 'Confirm Registration',
//                 html: `
//                     <div class="text-start">
//                         <p><strong>Devotee:</strong> ${registrationData.devotee.name_english}</p>
//                         <p><strong>Light:</strong> ${registrationData.light_number} (${registrationData.light_code})</p>
//                         <p><strong>Amount:</strong> RM ${registrationData.merit_amount}</p>
//                         <p><strong>Duration:</strong> ${registrationData.offer_date} to ${registrationData.expiry_date}</p>
//                     </div>
//                 `,
//                 icon: 'question',
//                 showCancelButton: true,
//                 confirmButtonText: 'Yes, Submit',
//                 cancelButtonText: 'Cancel'
//             }).then((result) => {
//                 if (result.isConfirmed) {
//                     self.processRegistration(registrationData);
//                 }
//             });
//         },

//         // Process registration submission
//         processRegistration: function (data) {
//             const self = this;

//             TempleUtils.showLoading('Submitting registration...');
//             $('#submitBtn').prop('disabled', true);

//             PagodaAPI.registrations.create(data)
//                 .done(function (response) {
//                     if (response.success) {
//                         Swal.fire({
//                             title: 'Success!',
//                             html: `
//                                 <div class="text-start">
//                                     <p class="text-success"><i class="bi bi-check-circle me-2"></i>Registration completed successfully!</p>
//                                     <hr>
//                                     <p><strong>Receipt No:</strong> ${response.data.receipt_number}</p>
//                                     <p><strong>Light No:</strong> ${response.data.light_number}</p>
//                                     <p><strong>Devotee:</strong> ${response.data.devotee.name_english}</p>
//                                 </div>
//                             `,
//                             icon: 'success',
//                             confirmButtonText: 'New Registration',
//                             showCancelButton: true,
//                             cancelButtonText: 'View Receipt'
//                         }).then((result) => {
//                             if (result.isConfirmed) {
//                                 self.resetForm();
//                                 window.location.reload();
//                             } else {
//                                 TempleRouter.navigate('auspicious-light/registrations', { id: response.data.id });
//                             }
//                         });
//                     }
//                 })
//                 .fail(function (xhr) {
//                     TempleUtils.handleAjaxError(xhr, 'Registration failed');
//                 })
//                 .always(function () {
//                     TempleUtils.hideLoading();
//                     $('#submitBtn').prop('disabled', false);
//                 });
//         },

//         // Reset form
//         resetForm: function () {
//             const self = this;

//             Swal.fire({
//                 title: 'Reset Form?',
//                 text: 'All entered data will be lost',
//                 icon: 'warning',
//                 showCancelButton: true,
//                 confirmButtonText: 'Yes, Reset',
//                 cancelButtonText: 'Cancel'
//             }).then((result) => {
//                 if (result.isConfirmed) {
//                     $('#registrationForm')[0].reset();
//                     self.selectedDevotee = null;
//                     self.selectedLight = null;
//                     $('#selectedLightDisplay').addClass('hidden');
//                     $('#devoteeSearchResults').empty();
//                     $('#nric').prop('readonly', false);
//                     $('#assignmentMethod').val('auto').trigger('change');

//                     // Reset dates
//                     $('#offerDate').val(moment().format('YYYY-MM-DD'));
//                     $('#expiryDate').val(moment().add(1, 'year').format('YYYY-MM-DD'));

//                     TempleUtils.showSuccess('Form reset successfully');
//                 }
//             });
//         },

//         // Cleanup
//         destroy: function () {
//             clearTimeout(this.devoteeSearchTimeout);
//         }
//     };

// })(jQuery, window);
