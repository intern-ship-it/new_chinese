(function ($, window) {
    'use strict';

    //Array (for multi-selects)

    function csvToArray(csv) {
        if (!csv) return [];
        return csv.split(',').map(s => s.trim()).filter(Boolean);
    }
    function arrayToCsv(arr) {
        return (arr || []).map(s => (s || '').trim()).filter(Boolean).join(',');
    }

    window.StaffPage = {
        currentPage: 1,
        filters: {},
        currentStaffId: null, // Store current staff ID for editing


        init: function () {
            const self = this;

            $.when(
                TempleCore.loadScriptOnce('/js/data/countries.js', function () {
                    return window.CountryData && window.CountryData.countries;
                }),
                TempleAPI.get('/settings/default-values')
            ).done(function (_, defaultResp) {
                // Store defaults globally
                self.defaultValues = defaultResp?.data || {};

                self.renderPage();
                self.loadStatistics();
                self.loadStaffList();
                self.bindEvents();
            }).fail(function (err) {
                console.error('Initialization error:', err);
                self.renderPage();
                self.loadStatistics();
                self.loadStaffList();
                self.bindEvents();
            });
        },


        renderPage: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h2><i class="bi bi-people-fill"></i> Staff Management</h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard')">Dashboard</a></li>
                                    <li class="breadcrumb-item active">Staff</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-6 text-end">
                            <button class="btn btn-primary" id="addStaffBtn">
                                <i class="bi bi-plus-circle"></i> Add Staff
                            </button>
                          
                            <div class="btn-group">
                                <button class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown">
                                    <i class="bi bi-download"></i> Export
                                </button>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" id="exportExcel">Excel</a></li>
                                    <li><a class="dropdown-item" href="#" id="exportPdf">PDF</a></li>
                                </ul>
                            </div>
                            <button class="btn btn-secondary" id="manageDesignationsBtn">
                                <i class="bi bi-diagram-3"></i> Designations
                            </button>
                        </div>
                    </div>

                    <!-- Statistics Cards -->
                    <div class="row mb-4" id="statisticsContainer">
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="stat-icon bg-primary">
                                        <i class="bi bi-people"></i>
                                    </div>
                                    <div class="stat-details">
                                        <h3 class="stat-value" id="totalStaff">0</h3>
                                        <p class="stat-label">Total Staff</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="stat-icon bg-success">
                                        <i class="bi bi-check-circle"></i>
                                    </div>
                                    <div class="stat-details">
                                        <h3 class="stat-value" id="activeStaff">0</h3>
                                        <p class="stat-label">Active Staff</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="stat-icon bg-info">
                                        <i class="bi bi-person-plus"></i>
                                    </div>
                                    <div class="stat-details">
                                        <h3 class="stat-value" id="recentJoinings">0</h3>
                                        <p class="stat-label">Recent Joinings</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card">
                                <div class="card-body">
                                    <div class="stat-icon bg-warning">
                                        <i class="bi bi-clock"></i>
                                    </div>
                                    <div class="stat-details">
                                        <h3 class="stat-value" id="pendingConfirmations">0</h3>
                                        <p class="stat-label">Pending Confirmations</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filters -->
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <input type="text" class="form-control" id="searchInput" placeholder="Search by name, code, email...">
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="statusFilter">
                                        <option value="">All Status</option>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="TERMINATED">Terminated</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="ON_LEAVE">On Leave</option>
                                        <option value="RESIGNED">Resigned</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="departmentFilter">
                                        <option value="">All Departments</option>
                                        <option value="ADMINISTRATION">Administration</option>
                                        <option value="RELIGIOUS">Religious</option>
                                        <option value="FINANCE">Finance</option>
                                        <option value="OPERATIONS">Operations</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="SECURITY">Security</option>
                                        <option value="IT">IT</option>
                                        <option value="HR">HR</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <select class="form-select" id="employeeTypeFilter">
                                        <option value="">All Types</option>
                                        <option value="PERMANENT">Permanent</option>
                                        <option value="CONTRACT">Contract</option>
                                        <option value="PART_TIME">Part Time</option>
                                        <option value="VOLUNTEER">Volunteer</option>
                                        <option value="CONSULTANT">Consultant</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <button class="btn btn-primary" id="applyFilters">
                                        <i class="bi bi-search"></i> Search
                                    </button>
                                    <button class="btn btn-secondary" id="clearFilters">
                                        <i class="bi bi-x-circle"></i> Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Staff List Table -->
                    <div class="card">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Staff Code</th>
                                            <th>Photo</th>
                                            <th>Name</th>
                                            <th>Designation</th>
                                            <th>Department</th>
                                            <th>Contact</th>
                                            <th>Joining Date</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="staffTableBody">
                                        <tr>
                                            <td colspan="9" class="text-center">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <nav id="paginationContainer"></nav>
                        </div>
                    </div>
                </div>

                <!-- Add/Edit Staff Modal -->
                <div class="modal fade" id="staffModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="staffModalTitle">Add New Staff</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="staffForm">
                                    <input type="hidden" id="staffIdField" value="">
                                    
                                    <ul class="nav nav-tabs mb-3" id="staffFormTabs">
                                        <li class="nav-item">
                                            <a class="nav-link active" data-bs-toggle="tab" href="#basicInfo">Basic Information</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#contactInfo">Contact Information</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#employmentInfo">Employment</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#documentsInfo">Documents</a>
                                        </li>
                                        <li class="nav-item">
                                            <a class="nav-link" data-bs-toggle="tab" href="#bankInfo">Bank Details</a>
                                        </li>
                                    </ul>

                                    <div class="tab-content">
                                        <!-- Basic Information Tab -->
                                        <div class="tab-pane fade show active" id="basicInfo">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label class="form-label required">First Name</label>
                                                    <input type="text" class="form-control" name="first_name" required>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Last Name</label>
                                                    <input type="text" class="form-control" name="last_name">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Father's Name</label>
                                                    <input type="text" class="form-control" name="father_name">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Date of Birth</label>
                                                    <input type="date" class="form-control" name="date_of_birth">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label required">Gender</label>
                                                    <select class="form-select" name="gender" required>
                                                        <option value="">Select Gender</option>
                                                        <option value="MALE">Male</option>
                                                        <option value="FEMALE">Female</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Marital Status</label>
                                                    <select class="form-select" name="marital_status">
                                                        <option value="">Select Status</option>
                                                        <option value="SINGLE">Single</option>
                                                        <option value="MARRIED">Married</option>
                                                        <option value="DIVORCED">Divorced</option>
                                                        <option value="WIDOWED">Widowed</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Blood Group</label>
                                                    <select class="form-select" name="blood_group">
                                                        <option value="">Select Blood Group</option>
                                                        <option value="A+">A+</option>
                                                        <option value="A-">A-</option>
                                                        <option value="B+">B+</option>
                                                        <option value="B-">B-</option>
                                                        <option value="O+">O+</option>
                                                        <option value="O-">O-</option>
                                                        <option value="AB+">AB+</option>
                                                        <option value="AB-">AB-</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Nationality</label>
                                                    <select class="form-select" name="nationality" id="nationalitySelect">
                                                        <option value="">Select Nationality</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Religion</label>
                                                    <input type="text" class="form-control" name="religion">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Profile Photo</label>
                                                    <input type="file" class="form-control" name="profile_photo" accept="image/*">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Contact Information Tab -->
                                        <div class="tab-pane fade" id="contactInfo">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label class="form-label required">Phone</label>
                                                    <input type="tel" class="form-control" name="phone" required>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Alternate Phone</label>
                                                    <input type="tel" class="form-control" name="alternate_phone">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label required">Email</label>
                                                    <input type="email" class="form-control" name="email" required>
                                                </div>
                                                <div class="col-12">
                                                    <h6>Current Address</h6>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label required">Address Line 1</label>
                                                    <input type="text" class="form-control" name="current_address_line1" required>
                                                </div>
                                                <div class="col-md-6">
                                                    <label class="form-label">Address Line 2</label>
                                                    <input type="text" class="form-control" name="current_address_line2">
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label required">City</label>
                                                    <input type="text" class="form-control" name="current_address_city" required>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label required">State</label>
                                                    <input type="text" class="form-control" name="current_address_state" required>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label required">Country</label>
                                                    <select class="form-select" name="current_address_country" id="currentCountrySelect" required>
                                                        <option value="">Select Country</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label required">Pincode</label>
                                                    <input type="text" class="form-control" name="current_address_pincode" required>
                                                </div>
                                                <div class="col-12">
                                                    <div class="form-check">
                                                        <input class="form-check-input" type="checkbox" id="sameAddress">
                                                        <label class="form-check-label" for="sameAddress">
                                                            Permanent address same as current address
                                                        </label>
                                                    </div>
                                                </div>
                                                <div class="col-12" id="permanentAddressSection">
                                                    <h6>Permanent Address</h6>
                                                    <div class="row g-3">
                                                        <div class="col-md-6">
                                                            <label class="form-label">Address Line 1</label>
                                                            <input type="text" class="form-control" name="permanent_address_line1">
                                                        </div>
                                                        <div class="col-md-6">
                                                            <label class="form-label">Address Line 2</label>
                                                            <input type="text" class="form-control" name="permanent_address_line2">
                                                        </div>
                                                        <div class="col-md-3">
                                                            <label class="form-label">City</label>
                                                            <input type="text" class="form-control" name="permanent_address_city">
                                                        </div>
                                                        <div class="col-md-3">
                                                            <label class="form-label">State</label>
                                                            <input type="text" class="form-control" name="permanent_address_state">
                                                        </div>
                                                        <div class="col-md-3">
                                                            <label class="form-label">Country</label>
                                                            <select class="form-select" name="permanent_address_country" id="permanentCountrySelect">
                                                            <option value="">Select Country</option>
                                                        </select>
                                                        </div>
                                                        <div class="col-md-3">
                                                            <label class="form-label">Pincode</label>
                                                            <input type="text" class="form-control" name="permanent_address_pincode">
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-12">
                                                    <h6>Emergency Contact</h6>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Contact Name</label>
                                                    <input type="text" class="form-control" name="emergency_contact_name">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Contact Phone</label>
                                                    <input type="tel" class="form-control" name="emergency_contact_phone">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Relation</label>
                                                    <input type="text" class="form-control" name="emergency_contact_relation">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Employment Information Tab -->
                                        <div class="tab-pane fade" id="employmentInfo">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label class="form-label required">Designation</label>
                                                    <select class="form-select" name="designation_id" required>
                                                        <option value="">Select Designation</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label required">Employee Type</label>
                                                    <select class="form-select" name="employee_type" required>
                                                        <option value="">Select Type</option>
                                                        <option value="PERMANENT">Permanent</option>
                                                        <option value="CONTRACT">Contract</option>
                                                        <option value="PART_TIME">Part Time</option>
                                                        <option value="VOLUNTEER">Volunteer</option>
                                                        <option value="CONSULTANT">Consultant</option>
                                                    </select>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label required">Joining Date</label>
                                                    <input type="date" class="form-control" name="joining_date" required>
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Probation Period (Months)</label>
                                                    <input type="number" class="form-control" name="probation_period_months" value="3" min="0">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Work Location</label>
                                                    <input type="text" class="form-control" name="work_location">
                                                </div>
                                         <div class="col-md-4">
    <label class="form-label">Work Shift</label>
    <select class="form-select" name="work_shift" multiple>
        <option value="MORNING">Morning</option>
        <option value="AFTERNOON">Afternoon</option>
        <option value="EVENING">Evening</option>
        <option value="NIGHT">Night</option>
        <option value="GENERAL">General</option>
    </select>
</div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Shift Start Time</label>
                                                    <input type="time" class="form-control" name="shift_start_time">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Shift End Time</label>
                                                    <input type="time" class="form-control" name="shift_end_time">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Week Off Day</label>
                                                    <select class="form-select" name="week_off_day">
                                                        <option value="">Select Day</option>
                                                        <option value="SUNDAY">Sunday</option>
                                                        <option value="MONDAY">Monday</option>
                                                        <option value="TUESDAY">Tuesday</option>
                                                        <option value="WEDNESDAY">Wednesday</option>
                                                        <option value="THURSDAY">Thursday</option>
                                                        <option value="FRIDAY">Friday</option>
                                                        <option value="SATURDAY">Saturday</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Documents Tab -->
                                        <div class="tab-pane fade" id="documentsInfo">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label class="form-label">Identity Number</label>
                                                    <input type="text" class="form-control" name="aadhar_number" maxlength="12">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Tin Number</label>
                                                    <input type="text" class="form-control" name="pan_number" maxlength="10">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Passport Number</label>
                                                    <input type="text" class="form-control" name="passport_number">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Driving License</label>
                                                    <input type="text" class="form-control" name="driving_license">
                                                </div>
                                               
                                                <div class="col-md-4">
                                                    <label class="form-label">Upload Documents</label>
                                                    <input type="file" class="form-control" name="documents[]" multiple>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Bank Details Tab -->
                                        <div class="tab-pane fade" id="bankInfo">
                                            <div class="row g-3">
                                                <div class="col-md-4">
                                                    <label class="form-label">Bank Name</label>
                                                    <input type="text" class="form-control" name="bank_name">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Branch</label>
                                                    <input type="text" class="form-control" name="bank_branch">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Account Number</label>
                                                    <input type="text" class="form-control" name="bank_account_number">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">IFSC Code</label>
                                                    <input type="text" class="form-control" name="bank_ifsc_code">
                                                </div>
                                                <div class="col-md-4">
                                                    <label class="form-label">Account Type</label>
                                                    <select class="form-select" name="bank_account_type">
                                                        <option value="">Select Type</option>
                                                        <option value="SAVINGS">Savings</option>
                                                        <option value="CURRENT">Current</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Password Generation Section (only for new staff) -->
                                    <div class="row mt-4" id="passwordSection">
                                        <div class="col-12">
                                            <h6>Account Credentials</h6>
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="generatePassword" name="generate_password" checked>
                                                <label class="form-check-label" for="generatePassword">
                                                    Generate secure password automatically
                                                </label>
                                            </div>
                                            <div class="mt-2" id="customPasswordSection" style="display:none;">
                                                <label class="form-label">Custom Password</label>
                                                <input type="password" class="form-control" name="custom_password" 
                                                    placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char">
                                            </div>
                                            <div class="form-check mt-2">
                                                <input class="form-check-input" type="checkbox" id="sendCredentials" name="send_credentials" checked>
                                                <label class="form-check-label" for="sendCredentials">
                                                    Send login credentials to staff email
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" id="saveStaffBtn">
                                    <i class="bi bi-save"></i> Save Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Import Modal -->
                <div class="modal fade" id="importModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Import Staff from Excel</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="importForm">
                                    <div class="mb-3">
                                        <label class="form-label">Select Excel File</label>
                                        <input type="file" class="form-control" id="importFile" accept=".xlsx,.xls" required>
                                    </div>
                                    <div class="alert alert-info">
                                        <p><strong>Instructions:</strong></p>
                                        <ul class="mb-0">
                                            <li>Download the template first</li>
                                            <li>Fill in the staff details</li>
                                            <li>Ensure all required fields are filled</li>
                                            <li>Upload the completed file</li>
                                        </ul>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-info" id="downloadTemplate">
                                    <i class="bi bi-download"></i> Download Template
                                </button>
                                <button type="button" class="btn btn-primary" id="uploadImportBtn">
                                    <i class="bi bi-upload"></i> Upload & Import
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
          <!-- Reset Password Modal -->
<div class="modal fade" id="resetPasswordModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Reset Staff Password</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="resetPasswordForm">
                    <input type="hidden" id="resetStaffId" value="">
                    <div class="mb-3">
                        <label class="form-label required">New Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="newPassword" required
                                placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char">
                            <button class="btn btn-outline-secondary" type="button" id="toggleNewPassword" tabindex="-1">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label required">Confirm Password</label>
                        <div class="input-group">
                            <input type="password" class="form-control" id="confirmPassword" required>
                            <button class="btn btn-outline-secondary" type="button" id="toggleConfirmPassword" tabindex="-1">
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                        <div class="invalid-feedback"></div>
                    </div>
                    <div class="alert alert-info">
                        <small><i class="bi bi-info-circle"></i> Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmResetPasswordBtn">
                    <i class="bi bi-key"></i> Reset Password
                </button>
            </div>
        </div>
    </div>
</div>
                <style>
                label.required::after {
    content: " *";
    color: red;
    font-weight: bold;
}
    label.required::after {
    content: " *";
    color: red;
    font-weight: bold;
}

#resetPasswordModal .input-group {
    display: flex;
    width: 100%;
}

#resetPasswordModal .input-group .form-control {
    flex: 1;
    border-right: 0;
}

#resetPasswordModal .input-group .btn {
    border-left: 0;
    z-index: 10;
}

#resetPasswordModal .invalid-feedback {
    display: none;
    width: 100%;
    margin-top: 0.25rem;
    font-size: 0.875em;
    color: #dc3545;
}

#resetPasswordModal .invalid-feedback:not(:empty) {
    display: block;
}
    #resetPasswordModal .input-group .btn {
    border-left: 0;
    border-color: #ced4da; /* matches form-control */
    display: inline-flex;
    align-items: center;
}
    </style>
            `;

            $('#page-container').html(html);
        },

        loadStatistics: function () {
            TempleAPI.get('/staff/statistics')
                .done(function (response) {
                    if (response.success) {
                        $('#totalStaff').text(response.data.total || 0);
                        $('#activeStaff').text(response.data.active || 0);
                        $('#recentJoinings').text(response.data.recent_joinings || 0);
                        $('#pendingConfirmations').text(response.data.upcoming_confirmations || 0);
                    }
                })
                .fail(function () {
                    console.error('Failed to load statistics');
                });
        },

        loadStaffList: function (page = 1) {
            const self = this;
            this.currentPage = page;

            const params = {
                page: page,
                per_page: 10,
                ...this.filters
            };

            TempleAPI.get('/staff', params)
                .done(function (response) {
                    if (response.success) {
                        self.renderStaffTable(response.data);
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Failed to load staff list', 'error');
                });
        },

        renderStaffTable: function (data) {
            const self = this;
            const tbody = $('#staffTableBody');

            if (data.data && data.data.length > 0) {
                let html = '';
                $.each(data.data, function (index, staff) {
                    const statusClass = self.getStatusClass(staff.status);

                    html += `
                        <tr>
                            <td>${staff.staff_code}</td>
                            <td>
                                ${staff.profile_photo
                            ? `<img src="${staff.profile_photo}" class="rounded-circle" width="40" height="40">`
                            : '<i class="bi bi-person-circle" style="font-size: 2rem;"></i>'}
                            </td>
                       <td>${staff.first_name}${staff.last_name ? ' ' + staff.last_name : ''}</td>

                            <td>${staff.designation ? staff.designation.designation_name : '-'}</td>
                            <td>${staff.designation ? staff.designation.department : '-'}</td>
                            <td>
                                <small>${staff.phone}<br>${staff.email}</small>
                            </td>
                            <td>${new Date(staff.joining_date).toLocaleDateString()}</td>
                            <td><span class="badge ${statusClass}">${staff.status}</span></td>
                            <td>
                                <div class="btn-group">
                                 <button class="btn btn-sm btn-primary" onclick="StaffPage.openResetPasswordModal('${staff.id}')" title="Reset Password">
            <i class="bi bi-key"></i>
        </button>
                                    <button class="btn btn-sm btn-info" onclick="StaffPage.viewStaff('${staff.id}')" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="StaffPage.editStaff('${staff.id}')" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="StaffPage.manageStaffStatus('${staff.id}', '${staff.status}')" title="Manage Status">
                                        <i class="bi bi-gear"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tbody.html(html);

                // Render pagination
                this.renderPagination(data);
            } else {
                tbody.html('<tr><td colspan="9" class="text-center">No staff found</td></tr>');
            }
        },

        getStatusClass: function (status) {
            const statusClasses = {
                'ACTIVE': 'bg-success',
                'INACTIVE': 'bg-secondary',
                'TERMINATED': 'bg-danger',
                'SUSPENDED': 'bg-warning',
                'ON_LEAVE': 'bg-info',
                'RESIGNED': 'bg-dark'
            };
            return statusClasses[status] || 'bg-secondary';
        },

        renderPagination: function (data) {
            if (data.last_page <= 1) {
                $('#paginationContainer').html('');
                return;
            }

            let html = '<ul class="pagination">';

            // Previous button
            html += `<li class="page-item ${data.current_page === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${data.current_page - 1}">Previous</a>
                     </li>`;

            // Page numbers
            for (let i = 1; i <= data.last_page; i++) {
                if (i === 1 || i === data.last_page || (i >= data.current_page - 2 && i <= data.current_page + 2)) {
                    html += `<li class="page-item ${i === data.current_page ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${i}">${i}</a>
                             </li>`;
                }
            }

            // Next button
            html += `<li class="page-item ${data.current_page === data.last_page ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${data.current_page + 1}">Next</a>
                     </li>`;

            html += '</ul>';
            $('#paginationContainer').html(html);
        },

        bindEvents: function () {
            const self = this;

            $('#addStaffBtn').on('click', function () {
                self.openStaffModal();
            });

            // Reset Password confirmation
            $('#confirmResetPasswordBtn').on('click', function () {
                self.resetPasswordManual();
            });

            // Real-time password validation
            $('#newPassword, #confirmPassword').on('input', function () {
                self.validatePasswordFields();
            });

            $(document).on('click', '#toggleNewPassword, #toggleConfirmPassword', function (e) {
                e.preventDefault();
                const $group = $(this).closest('.input-group');
                const $input = $group.find('input');
                const $icon = $(this).find('i');

                if ($input.attr('type') === 'password') {
                    $input.attr('type', 'text');
                    $icon.removeClass('bi-eye').addClass('bi-eye-slash');
                } else {
                    $input.attr('type', 'password');
                    $icon.removeClass('bi-eye-slash').addClass('bi-eye');
                }
            });

            // Real-time validation (scoped to modal)
            $('#resetPasswordModal').on('input', '#newPassword, #confirmPassword', function () {
                StaffPage.validatePasswordFields();
            });
            // Manage designations
            $('#manageDesignationsBtn').on('click', function () {
                TempleRouter.navigate('designation');
            });

            // Import button
            $('#importBtn').on('click', function () {
                $('#importModal').modal('show');
            });

            // Export buttons
            $('#exportExcel').on('click', function () {
                self.exportStaff('excel');
            });

            $('#exportPdf').on('click', function () {
                self.exportStaff('pdf');
            });

            // Filter events
            $('#applyFilters').on('click', function () {
                self.applyFilters();
            });

            $('#clearFilters').on('click', function () {
                self.clearFilters();
            });

            // Search on enter
            $('#searchInput').on('keypress', function (e) {
                if (e.which === 13) {
                    self.applyFilters();
                }
            });

            // Pagination clicks
            $(document).on('click', '#paginationContainer a', function (e) {
                e.preventDefault();
                const page = $(this).data('page');
                if (page) {
                    self.loadStaffList(page);
                }
            });

            // Save staff
            $('#saveStaffBtn').on('click', function () {
                self.saveStaff();
            });

            // Password generation toggle
            $('#generatePassword').on('change', function () {
                $('#customPasswordSection').toggle(!this.checked);
            });

            // Same address checkbox
            $('#sameAddress').on('change', function () {
                if (this.checked) {
                    // Copy current address to permanent address
                    $('[name="permanent_address_line1"]').val($('[name="current_address_line1"]').val());
                    $('[name="permanent_address_line2"]').val($('[name="current_address_line2"]').val());
                    $('[name="permanent_address_city"]').val($('[name="current_address_city"]').val());
                    $('[name="permanent_address_state"]').val($('[name="current_address_state"]').val());
                    $('[name="permanent_address_country"]').val($('[name="current_address_country"]').val());
                    $('[name="permanent_address_pincode"]').val($('[name="current_address_pincode"]').val());
                }
            });

            // Import upload
            $('#uploadImportBtn').on('click', function () {
                self.importStaff();
            });

            // Download template
            $('#downloadTemplate').on('click', function () {
                self.downloadTemplate();
            });
        },
        validatePasswordFields: function () {
            const $modal = $('#resetPasswordModal');
            const $newPwd = $modal.find('#newPassword');
            const $cnfPwd = $modal.find('#confirmPassword');

            const newPassword = ($newPwd.val() || '').trim();
            const confirmPassword = ($cnfPwd.val() || '').trim();
            let isValid = true;

            // Clear previous error states
            [$newPwd, $cnfPwd].forEach($f => {
                $f.removeClass('is-invalid');
                $f.closest('.mb-3').find('.invalid-feedback').text('').hide();
            });

            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            // Empty checks (so we don't wrongly flag the user later)
            if (!newPassword) {
                $newPwd.addClass('is-invalid');
                $newPwd.closest('.mb-3').find('.invalid-feedback')
                    .text('New password is required.')
                    .show();
                isValid = false;
            }
            if (!confirmPassword) {
                $cnfPwd.addClass('is-invalid');
                $cnfPwd.closest('.mb-3').find('.invalid-feedback')
                    .text('Confirm password is required.')
                    .show();
                isValid = false;
            }

            // Format check (only if present)
            if (newPassword && !passwordRegex.test(newPassword)) {
                $newPwd.addClass('is-invalid');
                $newPwd.closest('.mb-3').find('.invalid-feedback')
                    .text('Password must be at least 8 chars and include uppercase, lowercase, number, and special character.')
                    .show();
                isValid = false;
            }

            // Match check (only if both present)
            if (newPassword && confirmPassword && newPassword !== confirmPassword) {
                $cnfPwd.addClass('is-invalid');
                $cnfPwd.closest('.mb-3').find('.invalid-feedback')
                    .text('Passwords do not match.')
                    .show();
                isValid = false;
            }

            return isValid;
        },

        openStaffModal: function (staffId = null) {
            // Reset form
            $('#staffForm')[0].reset();
            this.currentStaffId = staffId;
            $('#staffIdField').val(staffId || '');
            $('#staffForm input[type="file"]').val('');

            // Ensure Work Shift is multi & clear selection for new/edit

            const $shift = $('[name="work_shift"]');
            if (!$shift.is('[multiple]')) $shift.attr('multiple', true);
            $shift.val([]).trigger('change');
            $shift.select2({
                placeholder: "Select Work Shift(s)",
                theme: "bootstrap-5",
                width: '100%'
            });
            // Load designations
            this.loadDesignations();

            if (staffId) {
                $('#staffModalTitle').text('Edit Staff');
                $('#passwordSection').hide(); // Hide password section for editing
                this.loadStaffData(staffId);
            } else {
                $('#staffModalTitle').text('Add New Staff');
                $('#passwordSection').show(); // Show password section for new staff
                $('#generatePassword').prop('checked', true);
                $('#sendCredentials').prop('checked', true);
                $('#customPasswordSection').hide();
                // Populate selects for Add mode with sensible defaults
                if (typeof StaffPage.populateGeoAndNationality === 'function') {
                    const defaults = this.defaultValues || {};
                    const country = defaults.default_country || 'Malaysia';
                    const nat = this.getNationalityFromCountry(country);
                    StaffPage.populateGeoAndNationality({
                        currentCountry: country,
                        permanentCountry: country,
                        nationality: nat
                    });
                }

                // Enhance with Select2 if available
                if ($.fn && $.fn.select2) {
                    $('#currentCountrySelect, #permanentCountrySelect, #nationalitySelect').select2({ placeholder: 'Select...', theme: 'bootstrap-5', width: '100%' });
                }

            }

            $('#staffModal').modal('show');
        },
        // --- Country dropdown---
        populateCountrySelect: function ($select, selectedCountry) {
            const defaultCountry = selectedCountry || 'Malaysia';
            $select.empty().append('<option value="">Select Country</option>');

            try {
                if (window.CountryData && typeof window.CountryData.getSortedCountries === 'function') {
                    const countries = window.CountryData.getSortedCountries();
                    countries.forEach(function (c) {
                        const name = c.name || c;
                        if (!name) return;
                        const opt = $('<option></option>').val(name).text(name);
                        if (name === defaultCountry) opt.prop('selected', true);
                        $select.append(opt);
                    });
                    return;
                }
                if (window.CountryData && Array.isArray(window.CountryData.countries)) {
                    window.CountryData.countries.forEach(function (c) {
                        const name = c.name || c;
                        if (!name) return;
                        const opt = $('<option></option>').val(name).text(name);
                        if (name === defaultCountry) opt.prop('selected', true);
                        $select.append(opt);
                    });
                    return;
                }
            } catch (e) { /* no-op */ }

            // Fallback if countries.js not available
            const basicCountries = [
                'India', 'Malaysia', 'Singapore', 'United States', 'United Kingdom',
                'Canada', 'Australia', 'China', 'Japan', 'Germany', 'France'
            ];
            basicCountries.forEach(function (name) {
                const opt = $('<option></option>').val(name).text(name);
                if (name === defaultCountry) opt.prop('selected', true);
                $select.append(opt);
            });
        },

        // --- Nationality dropdown ---
        populateNationalitySelect: function ($select, selectedNationality) {
            const fallback = [
                'Indian', 'Malaysian', 'Singaporean', 'American', 'British',
                'Canadian', 'Australian', 'Chinese', 'Japanese', 'German', 'French'
            ];

            $select.empty().append('<option value="">Select Nationality</option>');

            let added = new Set();

            try {
                if (window.CountryData && Array.isArray(window.CountryData.countries)) {
                    window.CountryData.countries.forEach(function (c) {
                        const natsArr = [];
                        if (c.nationality) natsArr.push(c.nationality);
                        if (c.demonym) natsArr.push(c.demonym);
                        if (Array.isArray(c.nationalities)) natsArr.push.apply(natsArr, c.nationalities);

                        natsArr.forEach(function (nat) {
                            if (nat && !added.has(nat)) {
                                added.add(nat);
                                $select.append($('<option></option>').val(nat).text(nat));
                            }
                        });
                    });
                }
            } catch (e) { /* ignore */ }

            if (added.size === 0) {
                fallback.forEach(function (nat) {
                    $select.append($('<option></option>').val(nat).text(nat));
                });
            }

            const def = selectedNationality || '';
            $select.val(def);
        },

        // --- Convenience to (re)fill all 3 selects together ---
        populateGeoAndNationality: function (opts) {
            const o = Object.assign({
                currentCountry: 'Malaysia',
                permanentCountry: '',
                nationality: 'Malaysia'
            }, opts || {});

            this.populateCountrySelect($('#currentCountrySelect'), o.currentCountry);
            this.populateCountrySelect($('#permanentCountrySelect'), o.permanentCountry);
            this.populateNationalitySelect($('#nationalitySelect'), o.nationality);

            // Optional: sync nationality from current country if blank
            $('#currentCountrySelect').off('change.__syncNat').on('change.__syncNat', function () {
                const natField = $('#nationalitySelect');
                if (!natField.val()) {
                    const countryName = $(this).val();
                    if (window.CountryData && window.CountryData.countries) {
                        const hit = window.CountryData.countries.find(function (c) { return c.name === countryName; });
                        const nat = hit && (hit.nationality || hit.demonym);
                        if (nat) natField.val(nat);
                    }
                }
            });
        },

        loadDesignations: function () {
            TempleAPI.get('/staff/designations', { all: true })
                .done(function (response) {
                    if (response.success) {
                        let options = '<option value="">Select Designation</option>';
                        $.each(response.data, function (index, designation) {
                            options += `<option value="${designation.id}">${designation.designation_name} (${designation.department})</option>`;
                        });
                        $('[name="designation_id"]').html(options);
                    }
                });
        },

        loadStaffData: function (staffId) {
            TempleAPI.get(`/staff/${staffId}`)
                .done(function (response) {
                    if (!response.success) return;
                    const staff = response.data;

                    $.each(staff, function (key, value) {
                        const field = $(`[name="${key}"]`);
                        if (!field.length) return;

                        const type = (field.attr('type') || '').toLowerCase();

                        // Never set value on file inputs
                        if (type === 'file') return;

                        // Checkboxes/radios should set checked state
                        if (type === 'checkbox' || type === 'radio') {
                            field.prop('checked', !!value);
                            return;
                        }

                        field.val(value);
                    });

                    // Addresses...
                    if (staff.current_address) {
                        $('[name="current_address_line1"]').val(staff.current_address.line1 || '');
                        $('[name="current_address_line2"]').val(staff.current_address.line2 || '');
                        $('[name="current_address_city"]').val(staff.current_address.city || '');
                        $('[name="current_address_state"]').val(staff.current_address.state || '');
                        $('[name="current_address_country"]').val(staff.current_address.country || '');
                        $('[name="current_address_pincode"]').val(staff.current_address.pincode || '');
                    }

                    if (staff.permanent_address) {
                        $('[name="permanent_address_line1"]').val(staff.permanent_address.line1 || '');
                        $('[name="permanent_address_line2"]').val(staff.permanent_address.line2 || '');
                        $('[name="permanent_address_city"]').val(staff.permanent_address.city || '');
                        $('[name="permanent_address_state"]').val(staff.permanent_address.state || '');
                        $('[name="permanent_address_country"]').val(staff.permanent_address.country || '');
                        $('[name="permanent_address_pincode"]').val(staff.permanent_address.pincode || '');
                    }

                    if (staff.bank_details) {
                        $('[name="bank_name"]').val(staff.bank_details.bank_name || '');
                        $('[name="bank_branch"]').val(staff.bank_details.branch || '');
                        $('[name="bank_account_number"]').val(staff.bank_details.account_number || '');
                        $('[name="bank_ifsc_code"]').val(staff.bank_details.ifsc_code || '');
                        $('[name="bank_account_type"]').val(staff.bank_details.account_type || '');
                    }


                    // Populate selects (countries & nationality) based on loaded data
                    var currentCountry = (staff.current_address && staff.current_address.country) ? staff.current_address.country : 'Malaysia';
                    var permanentCountry = (staff.permanent_address && staff.permanent_address.country) ? staff.permanent_address.country : '';
                    var nationality = staff.nationality || 'Malaysia';
                    StaffPage.populateGeoAndNationality({
                        currentCountry: currentCountry,
                        permanentCountry: permanentCountry,
                        nationality: nationality
                    });
                    // Re-apply precise values after population
                    $('[name="current_address_country"]').val(currentCountry);
                    $('[name="permanent_address_country"]').val(permanentCountry);
                    $('[name="nationality"]').val(nationality);

                    // Enhance with Select2 if available
                    if ($.fn.select2) {
                        $('#currentCountrySelect, #permanentCountrySelect, #nationalitySelect').select2({ placeholder: 'Select...', theme: 'bootstrap-5', width: '100%' });
                    }
                    if (staff.profile_photo) {
                        const fileGroup = $('[name="profile_photo"]').closest('.col-md-4');
                        if (!fileGroup.find('.existing-photo').length) {
                            fileGroup.append(
                                `<div class="mt-2 existing-photo">
                                   <small class="text-muted d-block">Current photo:</small>
                                   <img src="${staff.profile_photo}" class="rounded" width="80" height="80" />
                                 </div>`
                            );
                        } else {
                            fileGroup.find('.existing-photo img').attr('src', staff.profile_photo);
                        }
                    }

                    // --- set Work Shift multi-select (supports array or CSV from backend) ---
                    const $shift = $('[name="work_shift"]');
                    if ($shift.length) {
                        let shifts = [];
                        if (Array.isArray(staff.work_shifts)) {
                            shifts = staff.work_shifts;
                        } else if (typeof staff.work_shift === 'string') {
                            shifts = csvToArray(staff.work_shift);
                        }
                        $shift.val(shifts).trigger('change');
                    }
                });
        },

        saveStaff: function () {
            const self = this;

            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Prepare FormData
            const formData = new FormData();
            const staffId = this.currentStaffId;

            // ===================================
            // COLLECT FORM DATA
            // ===================================
            $('#staffForm').find('input, select, textarea').each(function () {
                const field = $(this);
                const name = field.attr('name');

                if (!name) return;

                // Skip nested fields handled separately
                if (
                    name.startsWith('current_address_') ||
                    name.startsWith('permanent_address_') ||
                    name.startsWith('bank_')
                ) return;

                // Handle different input types
                if (field.is('select[multiple]')) {
                    const values = field.val() || [];
                    // Save as comma-separated string for backend
                    formData.append(name, values.join(','));
                    // Also send array format for validation
                    if (name === 'work_shift') {
                        values.forEach(v => formData.append('work_shifts[]', v));
                    }
                } else if (field.attr('type') === 'file') {
                    if (field[0].files.length > 0) {
                        if (field.attr('multiple')) {
                            for (let i = 0; i < field[0].files.length; i++) {
                                formData.append(name, field[0].files[i]);
                            }
                        } else {
                            formData.append(name, field[0].files[0]);
                        }
                    }
                } else if (field.attr('type') === 'checkbox') {
                    formData.append(name, field.is(':checked') ? 1 : 0);
                } else {
                    formData.append(name, field.val());
                }
            });

            // ===================================
            // HANDLE ADDRESS FIELDS
            // ===================================
            // Current Address
            const currentAddress = {
                line1: $('[name="current_address_line1"]').val(),
                line2: $('[name="current_address_line2"]').val(),
                city: $('[name="current_address_city"]').val(),
                state: $('[name="current_address_state"]').val(),
                country: $('[name="current_address_country"]').val(),
                pincode: $('[name="current_address_pincode"]').val()
            };

            for (const key in currentAddress) {
                formData.append(`current_address[${key}]`, currentAddress[key] || '');
            }

            // Permanent Address
            const permanentAddress = {
                line1: $('[name="permanent_address_line1"]').val(),
                line2: $('[name="permanent_address_line2"]').val(),
                city: $('[name="permanent_address_city"]').val(),
                state: $('[name="permanent_address_state"]').val(),
                country: $('[name="permanent_address_country"]').val(),
                pincode: $('[name="permanent_address_pincode"]').val()
            };

            for (const key in permanentAddress) {
                formData.append(`permanent_address[${key}]`, permanentAddress[key] || '');
            }

            // ===================================
            // HANDLE BANK DETAILS
            // ===================================
            const bankDetails = {
                bank_name: $('[name="bank_name"]').val(),
                branch: $('[name="bank_branch"]').val(),
                account_number: $('[name="bank_account_number"]').val(),
                ifsc_code: $('[name="bank_ifsc_code"]').val(),
                account_type: $('[name="bank_account_type"]').val()
            };

            for (const key in bankDetails) {
                formData.append(`bank_details[${key}]`, bankDetails[key] || '');
            }

            // ===================================
            // SUBMIT TO API
            // ===================================
            TempleCore.showLoading(true);

            let request;
            if (staffId) {
                formData.append('_method', 'PUT'); // Laravel PUT override
                request = TempleAPI.postFormData(`/staff/${staffId}`, formData);
            } else {
                request = TempleAPI.postFormData('/staff', formData);
            }

            request
                .done(function (response) {
                    if (response.success) {
                        console.log('Staff saved successfully:', response);

                        // Show success message
                        TempleCore.showToast('Staff saved successfully', 'success');

                        // ===================================
                        // DISPLAY CREDENTIALS FOR NEW STAFF
                        // ===================================
                        if (!staffId && response.credentials) {
                            self.showLoginCredentialsModal(response);
                        }

                        // Close modal and refresh
                        $('#staffModal').modal('hide');
                        self.loadStaffList();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to save staff', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr.responseJSON;
                    console.error('Staff save failed:', response);

                    // Clear old errors
                    $('#staffForm').find('.is-invalid').removeClass('is-invalid');
                    $('#staffForm').find('.invalid-feedback').remove();

                    if (response && response.errors) {
                        $.each(response.errors, function (field, messages) {
                            let fieldElement = $(`[name="${field}"]`);

                            // Handle nested fields like current_address.line1
                            if (field.includes('.')) {
                                const parts = field.split('.');
                                fieldElement = $(`[name="${parts[0]}_${parts[1]}"]`);
                            }

                            fieldElement.addClass('is-invalid');
                            fieldElement.after(`<div class="invalid-feedback">${messages[0]}</div>`);
                        });
                        TempleCore.showToast('Please fix validation errors', 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'An error occurred', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        showLoginCredentialsModal: function (response) {
            const credentials = response.credentials;
            const instructions = response.login_instructions;

            // Create a comprehensive modal with all information
        
const modalHtml = `
<div class="modal fade" id="credentialsModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">

            <!-- Header -->
            <div class="modal-header bg-success text-white">
                <h5 class="modal-title">
                    <i class="bi bi-check-circle-fill"></i> Staff Account Created Successfully!
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>

            <!-- Body -->
            <div class="modal-body">

                <!-- Success Message -->
                <div class="alert alert-success">
                    <h6 class="alert-heading">
                        <i class="bi bi-person-check"></i> Staff Member Created
                    </h6>
                    <p class="mb-0">
                        The staff account has been created successfully.
                        ${credentials.sent_to_email
                            ? ' Login credentials have been sent to the staff email address.'
                            : ' Please share these credentials with the staff member.'
                        }
                    </p>
                </div>

                <!-- Credentials Box -->
                <div class="card bg-light mb-3">
                    <div class="card-header">
                        <strong><i class="bi bi-key"></i> Login Credentials</strong>
                    </div>
                    <div class="card-body">

                        <div class="row mb-2">
                            <div class="col-4 text-end"><strong>Username:</strong></div>
                            <div class="col-8">
                                <code class="bg-white p-2 d-inline-block fs-6">
                                    ${credentials.username}
                                </code>
                                <button class="btn btn-sm btn-outline-secondary ms-2"
                                    onclick="navigator.clipboard.writeText('${credentials.username}');
                                    TempleCore.showToast('Username copied!', 'success');">
                                    <i class="bi bi-clipboard"></i> Copy
                                </button>
                            </div>
                        </div>

                        <div class="row mb-2">
                            <div class="col-4 text-end"><strong>Password:</strong></div>
                            <div class="col-8">
                                <code class="bg-white p-2 d-inline-block fs-6">
                                    ${credentials.password}
                                </code>
                                <button class="btn btn-sm btn-outline-secondary ms-2"
                                    onclick="navigator.clipboard.writeText('${credentials.password}');
                                    TempleCore.showToast('Password copied!', 'success');">
                                    <i class="bi bi-clipboard"></i> Copy
                                </button>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-4 text-end"><strong>Status:</strong></div>
                            <div class="col-8">
                                <span class="badge bg-success">Active</span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
`;


            // Remove existing modal if any
            $('#credentialsModal').remove();

            // Add to body and show
            $('body').append(modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('credentialsModal'));
            modal.show();

            // Clean up on hide
            $('#credentialsModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },







        validateForm: function () {
            const requiredFields = $('#staffForm').find('[required]');
            let isValid = true;

            // Remove previous error messages
            $('.is-invalid').removeClass('is-invalid');
            $('.invalid-feedback').remove();

            requiredFields.each(function () {
                if (!$(this).val()) {
                    $(this).addClass('is-invalid');
                    $(this).after('<div class="invalid-feedback">This field is required</div>');
                    isValid = false;
                }
            });

            if (!isValid) {
                TempleCore.showToast('Please fill all required fields', 'warning');
            }

            return isValid;
        },

        showCredentials: function (credentials) {
            const html = `
                <div class="alert alert-success">
                    <h5>Staff Account Created Successfully!</h5>
                    <p>Login credentials have been ${credentials.sent_to_email ? 'sent to staff email' : 'generated'}:</p>
                    <ul>
                        <li><strong>Username:</strong> ${credentials.username}</li>
                        <li><strong>Password:</strong> ${credentials.password}</li>
                    </ul>
                    <p class="mb-0"><small>The staff will be required to change password on first login.</small></p>
                </div>
            `;

            // Use a simple alert or modal to show credentials
            const modalHtml = `
                <div class="modal fade" id="credentialsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Account Created</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${html}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#credentialsModal').modal('show');
            $('#credentialsModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        viewStaff: function (staffId) {
            TempleRouter.navigate('staff/view', { id: staffId });
        },

        editStaff: function (staffId) {
            this.openStaffModal(staffId);
        },

        manageStaffStatus: function (staffId, currentStatus) {
            const self = this;

            const actions = {
                'ACTIVE': ['Suspend', 'Terminate', 'Mark On Leave'],
                'INACTIVE': ['Activate'],
                'SUSPENDED': ['Activate', 'Terminate'],
                'TERMINATED': [],
                'ON_LEAVE': ['Activate'],
                'RESIGNED': []
            };

            const availableActions = actions[currentStatus] || [];

            if (availableActions.length === 0) {
                TempleCore.showToast('No actions available for this status', 'info');
                return;
            }

            // Create action buttons HTML
            let buttonsHtml = '';
            availableActions.forEach(function (action) {
                buttonsHtml += `<button class="btn btn-outline-primary m-1" onclick="StaffPage.performAction('${staffId}', '${action}')">${action}</button>`;
            });

            const modalHtml = `
                <div class="modal fade" id="statusModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Manage Staff Status</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body text-center">
                                ${buttonsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#statusModal').modal('show');
            $('#statusModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        performAction: function (staffId, action) {
            const self = this;
            $('#statusModal').modal('hide');

            let endpoint = '';

            switch (action) {
                case 'Activate':
                    endpoint = `/staff/${staffId}/activate`;
                    break;
                case 'Terminate':
                    this.showTerminateDialog(staffId);
                    return;
                case 'Suspend':
                case 'Mark On Leave':
                    this.updateStatus(staffId, action);
                    return;
            }

            if (endpoint) {
                TempleAPI.post(endpoint, {})
                    .done(function (response) {
                        if (response.success) {
                            TempleCore.showToast(response.message, 'success');
                            self.loadStaffList();
                            self.loadStatistics();
                        }
                    });
            }
        },

        showTerminateDialog: function (staffId) {
            const self = this;

            const modalHtml = `
                <div class="modal fade" id="terminateModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Terminate Staff</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="terminateForm">
                                    <div class="mb-3">
                                        <label class="form-label required">Termination Reason</label>
                                        <textarea class="form-control" name="termination_reason" required></textarea>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label required">Last Working Date</label>
                                        <input type="date" class="form-control" name="last_working_date" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" onclick="StaffPage.confirmTerminate('${staffId}')">Terminate</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);
            $('#terminateModal').modal('show');
            $('#terminateModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        },

        confirmTerminate: function (staffId) {
            const self = this;
            const data = {
                termination_reason: $('[name="termination_reason"]').val(),
                last_working_date: $('[name="last_working_date"]').val()
            };

            if (!data.termination_reason || !data.last_working_date) {
                TempleCore.showToast('Please fill all required fields', 'warning');
                return;
            }

            TempleAPI.post(`/staff/${staffId}/terminate`, data)
                .done(function (response) {
                    if (response.success) {
                        $('#terminateModal').modal('hide');
                        TempleCore.showToast('Staff terminated successfully', 'success');
                        self.loadStaffList();
                        self.loadStatistics();
                    }
                });
        },
        openResetPasswordModal: function (staffId) {
            const $modal = $('#resetPasswordModal');
            const $form = $modal.find('#resetPasswordForm');

            // Reset fields + errors
            $form[0].reset();
            $modal.find('#resetStaffId').val(staffId);
            $modal.find('#newPassword, #confirmPassword')
                .removeClass('is-invalid')
                .attr('type', 'password');
            $form.find('.invalid-feedback').text('').hide();

            // Reset icons
            $modal.find('#toggleNewPassword i, #toggleConfirmPassword i')
                .removeClass('bi-eye-slash')
                .addClass('bi-eye');

            $modal.modal('show');
        },

        updateStatus: function (staffId, action) {
            const self = this;
            const statusMap = {
                'Suspend': 'SUSPENDED',
                'Mark On Leave': 'ON_LEAVE'
            };

            const formData = new FormData();
            formData.append('status', statusMap[action]);
            formData.append('_method', 'PUT'); // spoof PUT

            TempleAPI.postFormData(`/staff/${staffId}`, formData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Status updated successfully', 'success');
                        self.loadStaffList();
                        self.loadStatistics();
                    } else {
                        TempleCore.showToast(response.message || 'Failed to update status', 'error');
                    }
                })
                .fail(function (xhr) {
                    const msg = xhr?.responseJSON?.message || 'Failed to update status';
                    TempleCore.showToast(msg, 'error');
                });
        },

        applyFilters: function () {
            this.filters = {
                search: $('#searchInput').val(),
                status: $('#statusFilter').val(),
                department: $('#departmentFilter').val(),
                employee_type: $('#employeeTypeFilter').val()
            };

            this.loadStaffList(1);
        },

        clearFilters: function () {
            $('#searchInput').val('');
            $('#statusFilter').val('');
            $('#departmentFilter').val('');
            $('#employeeTypeFilter').val('');
            this.filters = {};
            this.loadStaffList(1);
        },

        exportStaff: function (format) {
            const self = this;
            const params = {
                format: format,
                ...this.filters
            };

            TempleCore.showLoading(true);

            // Use AJAX with proper authentication headers
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/staff/export',
                type: 'GET',
                data: params,
                headers: TempleAPI.getHeaders(), // This should include your auth token
                xhrFields: {
                    responseType: 'blob' // Important for file download
                },
                success: function (data, status, xhr) {
                    // Get filename from response headers or create one
                    const disposition = xhr.getResponseHeader('Content-Disposition');
                    let filename = `staff-list-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

                    if (disposition && disposition.indexOf('filename=') !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }

                    // Create blob and download
                    const blob = new Blob([data], {
                        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                    TempleCore.showToast('Export successful', 'success');
                },
                error: function (xhr) {
                    const response = xhr.responseJSON;
                    TempleCore.showToast(response?.message || 'Export failed', 'error');
                },
                complete: function () {
                    TempleCore.showLoading(false);
                }
            });
        },
        getNationalityFromCountry: function (countryName) {
            if (window.CountryData && typeof window.CountryData.getNationalityByCountry === 'function') {
                return window.CountryData.getNationalityByCountry(countryName);
            }
            return countryName;
        },
        resetPasswordManual: function () {
            const $modal = $('#resetPasswordModal');
            const staffId = $modal.find('#resetStaffId').val();
            const newPassword = ($modal.find('#newPassword').val() || '').trim();
            const confirmPassword = ($modal.find('#confirmPassword').val() || '').trim();

            // Validate (this will also show field-level messages)
            if (!this.validatePasswordFields()) {
                TempleCore.showToast('Please fix the validation errors', 'warning');
                return;
            }

            if (!staffId) {
                TempleCore.showToast('Missing staff id for password reset', 'error');
                return;
            }

            TempleCore.showLoading(true);
            TempleAPI.post(`/staff/${staffId}/reset-password-manual`, {
                new_password: newPassword,
                confirm_password: confirmPassword
            })
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast('Password reset successfully', 'success');
                        $modal.modal('hide');
                    } else {
                        TempleCore.showToast(response.message || 'Failed to reset password', 'error');
                    }
                })
                .fail(function (xhr) {
                    const response = xhr?.responseJSON;
                    if (response && response.errors) {
                        // Map backend field names
                        const map = { new_password: '#newPassword', confirm_password: '#confirmPassword' };
                        Object.keys(response.errors).forEach(function (field) {
                            const selector = map[field];
                            if (!selector) return;
                            const $f = $modal.find(selector);
                            $f.addClass('is-invalid');
                            $f.closest('.mb-3').find('.invalid-feedback').text(response.errors[field][0]).show();
                        });
                        TempleCore.showToast('Please fix the validation errors', 'error');
                    } else {
                        TempleCore.showToast(response?.message || 'Error resetting password', 'error');
                    }
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        importStaff: function () {
            const self = this;
            const file = $('#importFile')[0].files[0];

            if (!file) {
                TempleCore.showToast('Please select a file', 'warning');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            TempleCore.showLoading(true);

            TempleAPI.postFormData('/staff/import', formData)
                .done(function (response) {
                    if (response.success) {
                        TempleCore.showToast(`Imported ${response.data.imported} staff successfully`, 'success');

                        if (response.data.errors && response.data.errors.length > 0) {
                            const errorHtml = response.data.errors.join('<br>');
                            TempleCore.showToast('Some errors occurred: ' + errorHtml, 'warning');
                        }

                        $('#importModal').modal('hide');
                        self.loadStaffList();
                        self.loadStatistics();
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Import failed', 'error');
                })
                .always(function () {
                    TempleCore.showLoading(false);
                });
        },

        // Update this function in the staff page JavaScript
        downloadTemplate: function () {
            const self = this;

            // Create a form and submit it to download the template
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = TempleAPI.getBaseUrl() + '/staff/template/download';

            // Add auth token as query parameter
            const token = localStorage.getItem(APP_CONFIG.STORAGE.ACCESS_TOKEN);
            if (token) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'token';
                input.value = token;
                form.appendChild(input);
            }

            // Add temple ID
            const templeId = TempleAPI.getTempleId();
            if (templeId) {
                const templeInput = document.createElement('input');
                templeInput.type = 'hidden';
                templeInput.name = 'temple_id';
                templeInput.value = templeId;
                form.appendChild(templeInput);
            }

            document.body.appendChild(form);

            // Alternative: Use window.open with auth headers
            const url = TempleAPI.getBaseUrl() + '/staff/template/download?token=' + token + '&temple_id=' + templeId;
            window.open(url, '_blank');

            document.body.removeChild(form);
        }
    };

})(jQuery, window);
