// js/pages/staff/view.js
// Staff View/Details Page

(function ($, window) {
    'use strict';

    window.StaffViewPage = {
        staffId: null,
        staffData: null,

        init: function (params) {
            if (!params || !params.id) {
                TempleCore.showToast('Staff ID not provided', 'error');
                TempleRouter.navigate('staff');
                return;
            }

            this.staffId = params.id;
            this.renderPage();
            this.loadStaffDetails();
            this.bindEvents();
        },

        renderPage: function () {
            const html = `
                <div class="container-fluid">
                    <!-- Page Header -->
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h2><i class="bi bi-person-badge"></i> Staff Details</h2>
                            <nav aria-label="breadcrumb">
                                <ol class="breadcrumb">
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('dashboard')">Dashboard</a></li>
                                    <li class="breadcrumb-item"><a href="#" onclick="TempleRouter.navigate('staff')">Staff</a></li>
                                    <li class="breadcrumb-item active">View Staff</li>
                                </ol>
                            </nav>
                        </div>
                        <div class="col-md-4 text-end" id="actionButtons">
                           
                           
                            <button class="btn btn-secondary" id="printBtn">
                                <i class="bi bi-printer"></i> Print
                            </button>
                            <button class="btn btn-outline-secondary" onclick="TempleRouter.navigate('staff')">
                                <i class="bi bi-arrow-left"></i> Back
                            </button>
                        </div>
                    </div>

                    <!-- Loading State -->
                    <div id="loadingState" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">Loading staff details...</p>
                    </div>

                    <!-- Staff Details Container -->
                    <div id="staffDetailsContainer" style="display:none;">
                        <!-- Profile Header Card -->
                        <div class="card mb-4">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-2 text-center">
                                        <div id="profilePhotoContainer">
                                            <i class="bi bi-person-circle" style="font-size: 8rem; color: #6c757d;"></i>
                                        </div>
                                        <div class="mt-2">
                                            <span id="staffStatusBadge" class="badge"></span>
                                        </div>
                                    </div>
                                    <div class="col-md-5">
                                        <h3 id="staffFullName" class="mb-1">-</h3>
                                        <p class="text-muted mb-2">
                                            <strong>Staff Code:</strong> <span id="staffCode">-</span>
                                        </p>
                                        <p class="mb-1">
                                            <i class="bi bi-briefcase"></i> 
                                            <span id="staffDesignation">-</span>
                                        </p>
                                        <p class="mb-1">
                                            <i class="bi bi-building"></i> 
                                            <span id="staffDepartment">-</span>
                                        </p>
                                        <p class="mb-1">
                                            <i class="bi bi-person-badge"></i> 
                                            <span id="staffEmployeeType">-</span>
                                        </p>
                                        <p class="mb-1">
                                            <i class="bi bi-shield-check"></i> 
                                            Role: <span id="staffRole" class="badge bg-info">-</span>
                                        </p>
                                    </div>
                                    <div class="col-md-5">
                                        <div class="row">
                                            <div class="col-6">
                                                <small class="text-muted">Joining Date</small>
                                                <p class="mb-2" id="joiningDate">-</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Confirmation Date</small>
                                                <p class="mb-2" id="confirmationDate">-</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Work Location</small>
                                                <p class="mb-2" id="workLocation">-</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Work Shift</small>
                                                <p class="mb-2" id="workShift">-</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Years of Service</small>
                                                <p class="mb-2" id="yearsOfService">-</p>
                                            </div>
                                            <div class="col-6">
                                                <small class="text-muted">Reports To</small>
                                                <p class="mb-2" id="reportsTo">-</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tabs for Detailed Information -->
                        <div class="card">
                            <div class="card-header">
                                <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                    <li class="nav-item">
                                        <a class="nav-link active" data-bs-toggle="tab" href="#personalInfo">
                                            <i class="bi bi-person"></i> Personal
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#contactInfo">
                                            <i class="bi bi-telephone"></i> Contact
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#employmentInfo">
                                            <i class="bi bi-briefcase"></i> Employment
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#documentsInfo">
                                            <i class="bi bi-file-earmark-text"></i> Documents
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#bankInfo">
                                            <i class="bi bi-bank"></i> Bank Details
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#accountInfo">
                                            <i class="bi bi-person-lock"></i> Account
                                        </a>
                                    </li>
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#activityLog">
                                            <i class="bi bi-clock-history"></i> Activity Log
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div class="card-body">
                                <div class="tab-content">
                                    <!-- Personal Information Tab -->
                                    <div class="tab-pane fade show active" id="personalInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Full Name:</strong></td>
                                                        <td><span id="personalFullName">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Father's Name:</strong></td>
                                                        <td><span id="fatherName">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Mother's Name:</strong></td>
                                                        <td><span id="motherName">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Date of Birth:</strong></td>
                                                        <td><span id="dateOfBirth">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Age:</strong></td>
                                                        <td><span id="age">-</span> years</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Gender:</strong></td>
                                                        <td><span id="gender">-</span></td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Marital Status:</strong></td>
                                                        <td><span id="maritalStatus">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Blood Group:</strong></td>
                                                        <td><span id="bloodGroup">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Nationality:</strong></td>
                                                        <td><span id="nationality">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Religion:</strong></td>
                                                        <td><span id="religion">-</span></td>
                                                    </tr>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Contact Information Tab -->
                                    <div class="tab-pane fade" id="contactInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Contact Details</h6>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Phone:</strong></td>
                                                        <td><span id="phone">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Alternate Phone:</strong></td>
                                                        <td><span id="alternatePhone">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Official Email:</strong></td>
                                                        <td><span id="email">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Personal Email:</strong></td>
                                                        <td><span id="personalEmail">-</span></td>
                                                    </tr>
                                                </table>
                                                
                                                <h6 class="mt-4 mb-3">Emergency Contact</h6>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Name:</strong></td>
                                                        <td><span id="emergencyName">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Phone:</strong></td>
                                                        <td><span id="emergencyPhone">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Relation:</strong></td>
                                                        <td><span id="emergencyRelation">-</span></td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Current Address</h6>
                                                <address id="currentAddress" class="mb-4">-</address>
                                                
                                                <h6 class="mb-3">Permanent Address</h6>
                                                <address id="permanentAddress">-</address>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Employment Information Tab -->
                                    <div class="tab-pane fade" id="employmentInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Employee Type:</strong></td>
                                                        <td><span id="employeeType">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Designation:</strong></td>
                                                        <td><span id="designation">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Department:</strong></td>
                                                        <td><span id="department">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Joining Date:</strong></td>
                                                        <td><span id="empJoiningDate">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Confirmation Date:</strong></td>
                                                        <td><span id="empConfirmationDate">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Probation Period:</strong></td>
                                                        <td><span id="probationPeriod">-</span> months</td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Work Location:</strong></td>
                                                        <td><span id="empWorkLocation">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Work Shift:</strong></td>
                                                        <td><span id="empWorkShift">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Shift Timing:</strong></td>
                                                        <td><span id="shiftTiming">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Week Off Day:</strong></td>
                                                        <td><span id="weekOffDay">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Current Status:</strong></td>
                                                        <td><span id="currentStatus">-</span></td>
                                                    </tr>
                                                </table>
                                                
                                                <div id="terminationInfo" style="display:none;" class="alert alert-danger mt-3">
                                                    <h6>Termination/Resignation Details</h6>
                                                    <p><strong>Reason:</strong> <span id="terminationReason">-</span></p>
                                                    <p><strong>Last Working Date:</strong> <span id="lastWorkingDate">-</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Documents Tab -->
                                    <div class="tab-pane fade" id="documentsInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Identity Documents</h6>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Identity Number:</strong></td>
                                                        <td><span id="aadharNumber">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Tin Number:</strong></td>
                                                        <td><span id="panNumber">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Passport Number:</strong></td>
                                                        <td><span id="passportNumber">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Driving License:</strong></td>
                                                        <td><span id="drivingLicense">-</span></td>
                                                    </tr>
                                                    
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Uploaded Documents</h6>
                                                <div id="uploadedDocumentsList">
                                                    <p class="text-muted">No documents uploaded</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Bank Details Tab -->
                                    <div class="tab-pane fade" id="bankInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Bank Name:</strong></td>
                                                        <td><span id="bankName">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Branch:</strong></td>
                                                        <td><span id="bankBranch">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Account Number:</strong></td>
                                                        <td><span id="accountNumber">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>IFSC Code:</strong></td>
                                                        <td><span id="ifscCode">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Account Type:</strong></td>
                                                        <td><span id="accountType">-</span></td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="alert alert-info">
                                                    <h6>Salary Information</h6>
                                                    <p class="mb-1"><strong>Basic Salary:</strong> <span id="basicSalary">-</span></p>
                                                    <p class="mb-1"><strong>Payment Mode:</strong> <span id="paymentMode">-</span></p>
                                                    <p class="mb-0 text-muted"><small>Full salary details will be available in Payroll module</small></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Account Information Tab -->
                                    <div class="tab-pane fade" id="accountInfo">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Login Credentials</h6>
                                                <table class="table table-borderless">
                                                    <tr>
                                                        <td width="40%"><strong>Username:</strong></td>
                                                        <td><span id="username">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Account Status:</strong></td>
                                                        <td><span id="accountStatus">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Role:</strong></td>
                                                        <td><span id="userRole">-</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Last Login:</strong></td>
                                                        <td><span id="lastLogin">Never</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Password Changed:</strong></td>
                                                        <td><span id="passwordChanged">-</span></td>
                                                    </tr>
                                                </table>
                                            </div>
                                            <div class="col-md-6">
                                                <h6 class="mb-3">Access Permissions</h6>
                                                <div id="permissionsList" class="badge-container">
                                                    <p class="text-muted">Loading permissions...</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Activity Log Tab -->
                                    <div class="tab-pane fade" id="activityLog">
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Date & Time</th>
                                                        <th>Action</th>
                                                        <th>Details</th>
                                                        <th>Performed By</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="activityLogBody">
                                                    <tr>
                                                        <td colspan="4" class="text-center">Loading activity logs...</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Change Modal -->
                <div class="modal fade" id="statusModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Change Staff Status</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="statusOptions"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('#page-container').html(html);
        },

        loadStaffDetails: function () {
            const self = this;

            TempleAPI.get(`/staff/${this.staffId}`)
                .done(function (response) {
                    if (response.success) {
                        self.staffData = response.data;
                        self.displayStaffDetails();
                        $('#loadingState').hide();
                        $('#staffDetailsContainer').show();
                    } else {
                        TempleCore.showToast('Failed to load staff details', 'error');
                        TempleRouter.navigate('staff');
                    }
                })
                .fail(function () {
                    TempleCore.showToast('Error loading staff details', 'error');
                    TempleRouter.navigate('staff');
                });
        },

        displayStaffDetails: function () {
            const staff = this.staffData;

            // Profile Header
            $('#staffFullName').text(staff.full_name || `${staff.first_name} ${staff.last_name}`);
            $('#staffCode').text(staff.staff_code);
            $('#staffDesignation').text(staff.designation?.designation_name || '-');
            $('#staffDepartment').text(staff.designation?.department || '-');
            $('#staffEmployeeType').text(this.formatEmployeeType(staff.employee_type));
            $('#staffRole').text(staff.designation?.role?.display_name || '-');

            // Profile Photo
            if (staff.profile_photo) {
                $('#profilePhotoContainer').html(`
                    <img src="${staff.profile_photo}" class="img-fluid rounded-circle" 
                         style="width: 150px; height: 150px; object-fit: cover;">
                `);
            }

            // Status Badge
            const statusClass = this.getStatusClass(staff.status);
            $('#staffStatusBadge').addClass(statusClass).text(staff.status);

            // Dates and Info
            $('#joiningDate').text(this.formatDate(staff.joining_date));
            $('#confirmationDate').text(this.formatDate(staff.confirmation_date));
            $('#workLocation').text(staff.work_location || '-');
            $('#workShift').text(this.formatShift(staff.work_shift));
            $('#yearsOfService').text(this.calculateYearsOfService(staff.joining_date));
            $('#reportsTo').text(this.getReportingManager(staff));

            // Personal Information
            $('#personalFullName').text(staff.full_name || `${staff.first_name} ${staff.last_name}`);
            $('#fatherName').text(staff.father_name || '-');
            $('#motherName').text(staff.mother_name || '-');
            $('#dateOfBirth').text(this.formatDate(staff.date_of_birth));
            $('#age').text(staff.age || this.calculateAge(staff.date_of_birth));
            $('#gender').text(this.formatGender(staff.gender));
            $('#maritalStatus').text(this.formatMaritalStatus(staff.marital_status));
            $('#bloodGroup').text(staff.blood_group || '-');
            $('#nationality').text(staff.nationality || '-');
            $('#religion').text(staff.religion || '-');

            // Contact Information
            $('#phone').text(staff.phone || '-');
            $('#alternatePhone').text(staff.alternate_phone || '-');
            $('#email').html(`<a href="mailto:${staff.email}">${staff.email}</a>`);
            $('#personalEmail').html(staff.personal_email ? `<a href="mailto:${staff.personal_email}">${staff.personal_email}</a>` : '-');

            // Emergency Contact
            $('#emergencyName').text(staff.emergency_contact_name || '-');
            $('#emergencyPhone').text(staff.emergency_contact_phone || '-');
            $('#emergencyRelation').text(staff.emergency_contact_relation || '-');

            // Addresses
            this.displayAddress('current', staff.current_address);
            this.displayAddress('permanent', staff.permanent_address);

            // Employment Information
            $('#employeeType').text(this.formatEmployeeType(staff.employee_type));
            $('#designation').text(staff.designation?.designation_name || '-');
            $('#department').text(staff.designation?.department || '-');
            $('#empJoiningDate').text(this.formatDate(staff.joining_date));
            $('#empConfirmationDate').text(this.formatDate(staff.confirmation_date));
            $('#probationPeriod').text(staff.probation_period_months || '-');
            $('#empWorkLocation').text(staff.work_location || '-');
            $('#empWorkShift').text(this.formatShift(staff.work_shift));

            // Shift Timing
            if (staff.shift_start_time && staff.shift_end_time) {
                $('#shiftTiming').text(`${staff.shift_start_time} - ${staff.shift_end_time}`);
            } else {
                $('#shiftTiming').text('-');
            }

            $('#weekOffDay').text(this.formatWeekDay(staff.week_off_day));
            $('#currentStatus').html(`<span class="badge ${statusClass}">${staff.status}</span>`);

            // Termination Info
            if (staff.status === 'TERMINATED' || staff.status === 'RESIGNED') {
                $('#terminationInfo').show();
                $('#terminationReason').text(staff.termination_reason || '-');
                $('#lastWorkingDate').text(this.formatDate(staff.last_working_date));
            }

            // Documents
            $('#aadharNumber').text(this.maskAadhar(staff.aadhar_number));
            $('#panNumber').text(this.maskPAN(staff.pan_number));
            $('#passportNumber').text(staff.passport_number || '-');
            $('#drivingLicense').text(staff.driving_license || '-');
            $('#voterId').text(staff.voter_id || '-');

            // Uploaded Documents
            this.displayUploadedDocuments(staff.documents);

            // Bank Details
            if (staff.bank_details) {
                $('#bankName').text(staff.bank_details.bank_name || '-');
                $('#bankBranch').text(staff.bank_details.branch || '-');
                $('#accountNumber').text(this.maskAccountNumber(staff.bank_details.account_number));
                $('#ifscCode').text(staff.bank_details.ifsc_code || '-');
                $('#accountType').text(staff.bank_details.account_type || '-');
            }

            // Salary Info
            if (staff.basic_salary) {
                $('#basicSalary').text(TempleCore.formatCurrency(staff.basic_salary));
            }
            $('#paymentMode').text(this.formatPaymentMode(staff.salary_payment_mode));

            // Account Information
            if (staff.user) {
                $('#username').text(staff.user.username || '-');

                $('#accountStatus').html(staff.user.is_active
                    ? '<span class="badge bg-success">Active</span>'
                    : '<span class="badge bg-danger">Inactive</span>');
                $('#userRole').text(staff.designation?.role?.display_name || '-');
                $('#lastLogin').text(this.formatDateTime(staff.user.last_login_at));
                $('#passwordChanged').text(this.formatDateTime(staff.user.password_changed_at));

                // Display permissions
                this.displayPermissions(staff.designation?.role);
            } else {
                $('#username').text('No account created');
                $('#accountStatus').html('<span class="badge bg-warning">No Account</span>');
            }

            // Activity Logs
            this.displayActivityLogs(staff.activity_logs);
        },

        displayAddress: function (type, address) {
            const containerId = type === 'current' ? '#currentAddress' : '#permanentAddress';

            if (address) {
                let addressHtml = '';
                if (address.line1) addressHtml += address.line1 + '<br>';
                if (address.line2) addressHtml += address.line2 + '<br>';
                if (address.city) addressHtml += address.city + ', ';
                if (address.state) addressHtml += address.state + '<br>';
                if (address.country) addressHtml += address.country + ' - ';
                if (address.pincode) addressHtml += address.pincode;

                $(containerId).html(addressHtml || '-');
            } else {
                $(containerId).html('-');
            }
        },

        displayUploadedDocuments: function (documents) {
            if (documents && documents.length > 0) {
                let html = '<div class="list-group">';
                documents.forEach(function (doc, index) {
                    const fileName = doc.split('/').pop();
                    html += `
                        <a href="${doc}" target="_blank" class="list-group-item list-group-item-action">
                            <i class="bi bi-file-earmark-pdf"></i> Document ${index + 1}: ${fileName}
                        </a>
                    `;
                });
                html += '</div>';
                $('#uploadedDocumentsList').html(html);
            } else {
                $('#uploadedDocumentsList').html('<p class="text-muted">No documents uploaded</p>');
            }
        },

        displayPermissions: function (role) {
            if (role && role.permissions) {
                let html = '';
                role.permissions.forEach(function (permission) {
                    html += `<span class="badge bg-secondary me-1 mb-1">${permission.display_name || permission.name}</span>`;
                });
                $('#permissionsList').html(html || '<p class="text-muted">No specific permissions assigned</p>');
            } else {
                $('#permissionsList').html('<p class="text-muted">No permissions available</p>');
            }
        },

        displayActivityLogs: function (logs) {
            if (logs && logs.length > 0) {
                let html = '';
                logs.forEach(function (log) {
                    html += `
                        <tr>
                            <td>${new Date(log.created_at).toLocaleString()}</td>
                            <td><span class="badge bg-info">${log.action}</span></td>
                            <td>${log.remarks || '-'}</td>
                            <td>${log.performed_by?.name || 'System'}</td>
                        </tr>
                    `;
                });
                $('#activityLogBody').html(html);
            } else {
                $('#activityLogBody').html('<tr><td colspan="4" class="text-center">No activity logs found</td></tr>');
            }
        },

        bindEvents: function () {
            const self = this;


            // Print button - Navigate to print page
            $('#printBtn').on('click', function () {
                // Navigate to the print page with staff ID
                TempleRouter.navigate('staff/print', { id: self.staffId });
            });

        },



        // Helper Functions
        formatDate: function (date) {
            if (!date) return '-';
            return new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },

        formatDateTime: function (datetime) {
            if (!datetime) return 'Never';
            return new Date(datetime).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatEmployeeType: function (type) {
            const types = {
                'PERMANENT': 'Permanent',
                'CONTRACT': 'Contract',
                'PART_TIME': 'Part Time',
                'VOLUNTEER': 'Volunteer',
                'CONSULTANT': 'Consultant'
            };
            return types[type] || type;
        },

        formatGender: function (gender) {
            const genders = {
                'MALE': 'Male',
                'FEMALE': 'Female',
                'OTHER': 'Other'
            };
            return genders[gender] || gender || '-';
        },

        formatMaritalStatus: function (status) {
            const statuses = {
                'SINGLE': 'Single',
                'MARRIED': 'Married',
                'DIVORCED': 'Divorced',
                'WIDOWED': 'Widowed'
            };
            return statuses[status] || status || '-';
        },

        formatShift: function (shift) {
            const shifts = {
                'MORNING': 'Morning Shift',
                'AFTERNOON': 'Afternoon Shift',
                'EVENING': 'Evening Shift',
                'NIGHT': 'Night Shift',
                'GENERAL': 'General Shift'
            };
            return shifts[shift] || shift || '-';
        },

        formatWeekDay: function (day) {
            return day ? day.charAt(0) + day.slice(1).toLowerCase() : '-';
        },

        formatPaymentMode: function (mode) {
            const modes = {
                'BANK_TRANSFER': 'Bank Transfer',
                'CASH': 'Cash',
                'CHEQUE': 'Cheque'
            };
            return modes[mode] || mode || '-';
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

        calculateAge: function (dateOfBirth) {
            if (!dateOfBirth) return '-';
            const today = new Date();
            const birthDate = new Date(dateOfBirth);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        },

        calculateYearsOfService: function (joiningDate) {
            if (!joiningDate) return '-';
            const today = new Date();
            const joinDate = new Date(joiningDate);
            const years = today.getFullYear() - joinDate.getFullYear();
            const months = today.getMonth() - joinDate.getMonth();

            if (years === 0) {
                if (months === 0) return 'Less than a month';
                return months === 1 ? '1 month' : `${months} months`;
            }

            if (months < 0) {
                return years - 1 === 0 ? `${12 + months} months` : `${years - 1} years`;
            }

            return years === 1 ? '1 year' : `${years} years`;
        },

        getReportingManager: function (staff) {
            // This would need additional logic to fetch reporting manager
            // based on designation hierarchy
            if (staff.designation?.parent_designation) {
                return staff.designation.parent_designation.designation_name;
            }
            return '-';
        },

        maskAadhar: function (aadhar) {
            if (!aadhar) return '-';
            return 'XXXX-XXXX-' + aadhar.slice(-4);
        },

        maskPAN: function (pan) {
            if (!pan) return '-';
            return pan.slice(0, 3) + '****' + pan.slice(-2);
        },

        maskAccountNumber: function (account) {
            if (!account) return '-';
            return '****' + account.slice(-4);
        }
    };

})(jQuery, window);