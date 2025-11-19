// js/pages/staff/print.js
(function($, window) {
    'use strict';
    
    window.StaffPrintPage = {
        staffId: null,
        staffData: null,
        templeSettings: null,
        
        init: function(params) {
            this.staffId = params?.id;
            
            if (!this.staffId) {
                TempleCore.showToast('Invalid staff ID', 'error');
                TempleRouter.navigate('staff');
                return;
            }
            
            this.loadAndPrint();
        },
        
        loadAndPrint: function() {
            const self = this;
            TempleCore.showLoading(true);
            
            // Load both staff data and temple settings
            Promise.all([
                this.loadStaffData(),
                this.loadTempleSettings()
            ])
            .then(function() {
                self.openPrintWindow();
                // Navigate back to the view page after opening print window
                TempleRouter.navigate('staff/view', { id: self.staffId });
            })
            .catch(function(error) {
                TempleCore.showToast(error.message || 'Error loading data', 'error');
                TempleRouter.navigate('staff');
            })
            .finally(function() {
                TempleCore.showLoading(false);
            });
        },
        
        loadStaffData: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                TempleAPI.get(`/staff/${this.staffId}`)
                    .done(function(response) {
                        if (response.success) {
                            self.staffData = response.data;
                            resolve();
                        } else {
                            reject(new Error('Failed to load staff data'));
                        }
                    })
                    .fail(function() {
                        reject(new Error('Error loading staff data'));
                    });
            });
        },
        
        loadTempleSettings: function() {
            const self = this;
            return new Promise((resolve, reject) => {
                // Fetch fresh settings from server
                TempleAPI.get('/settings?type=SYSTEM')
                    .done(function(response) {
                        if (response.success && response.data && response.data.values) {
                            self.templeSettings = response.data.values;
                            
                            // Update localStorage for future use
                            localStorage.setItem(APP_CONFIG.STORAGE.TEMPLE, JSON.stringify({
                                name: self.templeSettings.temple_name || '',
                                address: self.templeSettings.temple_address || '',
                                city: self.templeSettings.temple_city || '',
                                state: self.templeSettings.temple_state || '',
                                pincode: self.templeSettings.temple_pincode || '',
                                country: self.templeSettings.temple_country || 'Malaysia',
                                phone: self.templeSettings.temple_phone || '',
                                email: self.templeSettings.temple_email || ''
                            }));
                            
                            resolve();
                        } else {
                            // Fallback to localStorage if API fails
                            self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                            resolve();
                        }
                    })
                    .fail(function() {
                        // Fallback to localStorage if API fails
                        self.templeSettings = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE.TEMPLE) || '{}');
                        resolve();
                    });
            });
        },
        
        openPrintWindow: function() {
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                TempleCore.showToast('Please allow pop-ups for printing', 'warning');
                return;
            }
            
            const html = this.generatePrintHTML();
            
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Auto-focus the print window and trigger print dialog after a short delay
            setTimeout(function() {
                printWindow.focus();
                printWindow.print();
            }, 250);
        },
        
        generatePrintHTML: function() {
            const staff = this.staffData;
            const temple = this.templeSettings;
            
            // Handle logo
            let logoHTML = '';
            if (temple.temple_logo) {
                logoHTML = `<img src="${temple.temple_logo}" style="width:205px;height: 119px;object-fit:contain;padding-top: 14px;" alt="Temple Logo" />`;
            } else {
                logoHTML = `
                    <div style="width:120px;height:100px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">TEMPLE LOGO</span>
                    </div>
                `;
            }
            
            // Handle staff photo
            let photoHTML = '';
            if (staff.profile_photo) {
                photoHTML = `<img src="${staff.profile_photo}" style="width:120px;height:150px;object-fit:cover;border:1px solid #ddd;" alt="Staff Photo" />`;
            } else {
                photoHTML = `
                    <div style="width:120px;height:150px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                        <span style="font-size:12px;color:#666;">NO PHOTO</span>
                    </div>
                `;
            }
            
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Staff Profile - ${staff.staff_code}</title>
                    <style>
                        @media print {
                            #backButton, #printButton {
                                display: none !important;
                            }
                            body {
                                margin: 0;
                                padding: 10px;
                            }
                            .page-break {
                                page-break-before: always;
                            }
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            line-height: 1.4;
                            color: #333;
                        }
                        
                        .btn {
                            display: inline-block;
                            padding: 8px 16px;
                            margin: 0 5px;
                            font-size: 14px;
                            font-weight: 400;
                            text-align: center;
                            white-space: nowrap;
                            vertical-align: middle;
                            cursor: pointer;
                            border: 1px solid transparent;
                            border-radius: 4px;
                            text-decoration: none;
                        }
                        
                        .btn-primary {
                            color: #fff;
                            background-color: #337ab7;
                            border-color: #2e6da4;
                        }
                        
                        .btn-info {
                            color: #fff;
                            background-color: #5bc0de;
                            border-color: #46b8da;
                        }
                        
                        .btn:hover {
                            opacity: 0.9;
                        }
                        
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        
                        .section-title {
                            background: #f5f5f5;
                            padding: 8px;
                            font-weight: bold;
                            font-size: 16px;
                            margin-top: 20px;
                            border-left: 4px solid #337ab7;
                        }
                        
                        .info-table td {
                            padding: 5px 10px;
                            font-size: 14px;
                        }
                        
                        .info-table td:first-child {
                            font-weight: bold;
                            width: 150px;
                            color: #555;
                        }
                        
                        @media screen {
                            body {
                                max-width: 900px;
                                margin: 0 auto;
                            }
                        }
                    </style>
                </head>
                <body>
                    <!-- Control Buttons -->
                    <table width="750" border="0" align="center" id="controlButtons" style="margin-bottom: 20px;">
                        <tr>
                            <td width="550"></td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-primary" id="backButton" onclick="window.close()">Back</button>
                            </td>
                            <td width="100" style="text-align: right;">
                                <button class="btn btn-info" id="printButton" onclick="window.print()">Print</button>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Header -->
                    <table width="750" border="0" align="center">
                        <tr>
                            <td width="120">
                                ${logoHTML}
                            </td>
                            <td width="580" align="left" style="font-size:13px; padding-left: 20px;">
                                <strong style="font-size: 21px; color:#ff00ff;">${temple.temple_name || temple.name || 'Temple Name'}</strong>
                                <br>${temple.temple_address || temple.address || 'Temple Address'}
                                <br>${temple.temple_city || temple.city ? (temple.temple_city || temple.city) + ', ' : ''}${temple.temple_state || temple.state || 'State'} ${temple.temple_pincode || temple.pincode || ''}
                                <br>${temple.temple_country || temple.country || 'Malaysia'}
                                ${temple.temple_phone || temple.phone ? '<br>Tel: ' + (temple.temple_phone || temple.phone) : ''}
                                ${temple.temple_email || temple.email ? '<br>E-mail: ' + (temple.temple_email || temple.email) : ''}
                            </td>
                            <td width="50"></td>
                        </tr>
                    </table>
                    
                    <!-- Title -->
                    <table width="750" style="border-top:2px solid #c2c2c2; margin-top: 20px; padding: 15px 0px;" align="center">
                        <tr>
                            <td style="font-size:28px; text-align:center; font-weight: bold; text-transform: uppercase;">
                                Staff Profile
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Basic Info with Photo -->
                    <table width="750" border="0" align="center" style="margin-top: 20px;">
                        <tr>
                            <td width="130" valign="top">
                                ${photoHTML}
                            </td>
                            <td valign="top" style="padding-left: 20px;">
                                <table class="info-table" width="100%">
                                    <tr>
                                        <td>Staff Code:</td>
                                        <td><strong>${staff.staff_code || '-'}</strong></td>
                                        <td>Status:</td>
                                        <td><strong style="color: ${staff.status === 'ACTIVE' ? 'green' : 'red'}">${staff.status || '-'}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Full Name:</td>
                                        <td colspan="3"><strong style="font-size:16px;">${staff.full_name || `${staff.first_name} ${staff.last_name}`}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Designation:</td>
                                        <td>${staff.designation?.designation_name || '-'}</td>
                                        <td>Department:</td>
                                        <td>${staff.designation?.department || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td>Employee Type:</td>
                                        <td>${this.formatEmployeeType(staff.employee_type)}</td>
                                        <td>Joining Date:</td>
                                        <td>${this.formatDate(staff.joining_date)}</td>
                                    </tr>
                                    <tr>
                                        <td>Work Location:</td>
                                        <td>${staff.work_location || '-'}</td>
                                        <td>Work Shift:</td>
                                        <td>${this.formatShift(staff.work_shift)}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Personal Information -->
                    <div class="section-title">Personal Information</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Father's Name:</td>
                            <td>${staff.father_name || '-'}</td>
                            <td>Mother's Name:</td>
                            <td>${staff.mother_name || '-'}</td>
                        </tr>
                        <tr>
                            <td>Date of Birth:</td>
                            <td>${this.formatDate(staff.date_of_birth)}</td>
                            <td>Age:</td>
                            <td>${staff.age || this.calculateAge(staff.date_of_birth)} years</td>
                        </tr>
                        <tr>
                            <td>Gender:</td>
                            <td>${this.formatGender(staff.gender)}</td>
                            <td>Marital Status:</td>
                            <td>${this.formatMaritalStatus(staff.marital_status)}</td>
                        </tr>
                        <tr>
                            <td>Blood Group:</td>
                            <td>${staff.blood_group || '-'}</td>
                            <td>Nationality:</td>
                            <td>${staff.nationality || '-'}</td>
                        </tr>
                        <tr>
                            <td>Religion:</td>
                            <td colspan="3">${staff.religion || '-'}</td>
                        </tr>
                    </table>
                    
                    <!-- Contact Information -->
                    <div class="section-title">Contact Information</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Phone:</td>
                            <td>${staff.phone || '-'}</td>
                            <td>Alternate Phone:</td>
                            <td>${staff.alternate_phone || '-'}</td>
                        </tr>
                        <tr>
                            <td>Official Email:</td>
                            <td>${staff.email || '-'}</td>
                            <td>Personal Email:</td>
                            <td>${staff.personal_email || '-'}</td>
                        </tr>
                        <tr>
                            <td valign="top">Current Address:</td>
                            <td colspan="3">${this.formatAddress(staff.current_address)}</td>
                        </tr>
                        <tr>
                            <td valign="top">Permanent Address:</td>
                            <td colspan="3">${this.formatAddress(staff.permanent_address)}</td>
                        </tr>
                    </table>
                    
                    <!-- Emergency Contact -->
                    <div class="section-title">Emergency Contact</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Contact Name:</td>
                            <td>${staff.emergency_contact_name || '-'}</td>
                            <td>Phone:</td>
                            <td>${staff.emergency_contact_phone || '-'}</td>
                        </tr>
                        <tr>
                            <td>Relation:</td>
                            <td colspan="3">${staff.emergency_contact_relation || '-'}</td>
                        </tr>
                    </table>
                    
                    <!-- Employment Details -->
                    <div class="section-title">Employment Details</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Confirmation Date:</td>
                            <td>${this.formatDate(staff.confirmation_date)}</td>
                            <td>Probation Period:</td>
                            <td>${staff.probation_period_months || '-'} months</td>
                        </tr>
                        <tr>
                            <td>Shift Timing:</td>
                            <td>${staff.shift_start_time && staff.shift_end_time ? `${staff.shift_start_time} - ${staff.shift_end_time}` : '-'}</td>
                            <td>Week Off Day:</td>
                            <td>${this.formatWeekDay(staff.week_off_day)}</td>
                        </tr>
                        <tr>
                            <td>Years of Service:</td>
                            <td colspan="3">${this.calculateYearsOfService(staff.joining_date)}</td>
                        </tr>
                        ${staff.status === 'TERMINATED' || staff.status === 'RESIGNED' ? `
                        <tr>
                            <td>Termination Reason:</td>
                            <td>${staff.termination_reason || '-'}</td>
                            <td>Last Working Date:</td>
                            <td>${this.formatDate(staff.last_working_date)}</td>
                        </tr>
                        ` : ''}
                    </table>
                    
                    <!-- Documents -->
                    <div class="section-title">Identity Documents</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Identity Number:</td>
                            <td>${this.maskAadhar(staff.aadhar_number)}</td>
                            <td>Tin Number:</td>
                            <td>${this.maskPAN(staff.pan_number)}</td>
                        </tr>
                        <tr>
                            <td>Passport Number:</td>
                            <td>${staff.passport_number || '-'}</td>
                            <td>Driving License:</td>
                            <td>${staff.driving_license || '-'}</td>
                        </tr>
                      
                    </table>
                    
                    <!-- Bank Details -->
                    <div class="section-title">Bank Details</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Bank Name:</td>
                            <td>${staff.bank_details?.bank_name || '-'}</td>
                            <td>Branch:</td>
                            <td>${staff.bank_details?.branch || '-'}</td>
                        </tr>
                        <tr>
                            <td>Account Number:</td>
                            <td>${this.maskAccountNumber(staff.bank_details?.account_number)}</td>
                            <td>IFSC Code:</td>
                            <td>${staff.bank_details?.ifsc_code || '-'}</td>
                        </tr>
                        <tr>
                            <td>Account Type:</td>
                            <td>${staff.bank_details?.account_type || '-'}</td>
                            <td>Payment Mode:</td>
                            <td>${this.formatPaymentMode(staff.salary_payment_mode)}</td>
                        </tr>
                    </table>
                    
                    <!-- Account Information -->
                    <div class="section-title">System Account Information</div>
                    <table width="750" class="info-table" align="center" style="margin-top: 10px;">
                        <tr>
                            <td>Username:</td>
                            <td>${staff.user?.username || 'No account created'}</td>
                            <td>Account Status:</td>
                            <td>${staff.user?.is_active ? 'Active' : 'Inactive'}</td>
                        </tr>
                        <tr>
                            <td>Role:</td>
                            <td>${staff.designation?.role?.display_name || '-'}</td>
                            <td>Last Login:</td>
                            <td>${this.formatDateTime(staff.user?.last_login_at)}</td>
                        </tr>
                    </table>
                    
                    <!-- Signature Section -->
                    <table width="750" align="center" style="margin-top: 60px;">
                        <tr>
                            <td width="250" align="center">
                                <div style="border-top: 1px solid #000; margin-top: 80px; padding-top: 5px;">
                                    <strong>HR Manager</strong><br>
                                    <small>Human Resources Department</small>
                                </div>
                            </td>
                            <td width="250" align="center">
                                <div style="border-top: 1px solid #000; margin-top: 80px; padding-top: 5px;">
                                    <strong>Temple Administrator</strong><br>
                                    <small>Administration Department</small>
                                </div>
                            </td>
                            <td width="250" align="center">
                                <div style="border-top: 1px solid #000; margin-top: 80px; padding-top: 5px;">
                                    <strong>Chief Priest</strong><br>
                                    <small>Temple Authority</small>
                                </div>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Footer -->
                    <table width="750" align="center" style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px;">
                        <tr>
                            <td align="center" style="font-size: 12px; color: #666;">
                                Generated on: ${new Date().toLocaleString('en-IN')}<br>
                                This is a computer-generated document and valid for official use.
                            </td>
                        </tr>
                    </table>
                    
                </body>
                </html>
            `;
            
            return html;
        },
        
        // Helper functions (same as in view.js)
        formatDate: function(date) {
            if (!date) return '-';
            return new Date(date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },
        
        formatDateTime: function(datetime) {
            if (!datetime) return 'Never';
            return new Date(datetime).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        formatEmployeeType: function(type) {
            const types = {
                'PERMANENT': 'Permanent',
                'CONTRACT': 'Contract',
                'PART_TIME': 'Part Time',
                'VOLUNTEER': 'Volunteer',
                'CONSULTANT': 'Consultant'
            };
            return types[type] || type || '-';
        },
        
        formatGender: function(gender) {
            const genders = {
                'MALE': 'Male',
                'FEMALE': 'Female',
                'OTHER': 'Other'
            };
            return genders[gender] || gender || '-';
        },
        
        formatMaritalStatus: function(status) {
            const statuses = {
                'SINGLE': 'Single',
                'MARRIED': 'Married',
                'DIVORCED': 'Divorced',
                'WIDOWED': 'Widowed'
            };
            return statuses[status] || status || '-';
        },
        
        formatShift: function(shift) {
            const shifts = {
                'MORNING': 'Morning Shift',
                'AFTERNOON': 'Afternoon Shift',
                'EVENING': 'Evening Shift',
                'NIGHT': 'Night Shift',
                'GENERAL': 'General Shift'
            };
            return shifts[shift] || shift || '-';
        },
        
        formatWeekDay: function(day) {
            return day ? day.charAt(0) + day.slice(1).toLowerCase() : '-';
        },
        
        formatPaymentMode: function(mode) {
            const modes = {
                'BANK_TRANSFER': 'Bank Transfer',
                'CASH': 'Cash',
                'CHEQUE': 'Cheque'
            };
            return modes[mode] || mode || '-';
        },
        
        formatAddress: function(address) {
            if (!address) return '-';
            
            let addressData = address;
            if (typeof address === 'string') {
                try {
                    addressData = JSON.parse(address);
                } catch (e) {
                    return address;
                }
            }
            
            let formatted = '';
            if (addressData.line1) formatted += addressData.line1;
            if (addressData.line2) formatted += ', ' + addressData.line2;
            if (addressData.city) formatted += ', ' + addressData.city;
            if (addressData.state) formatted += ', ' + addressData.state;
            if (addressData.country) formatted += ', ' + addressData.country;
            if (addressData.pincode) formatted += ' - ' + addressData.pincode;
            
            return formatted || '-';
        },
        
        calculateAge: function(dateOfBirth) {
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
        
        calculateYearsOfService: function(joiningDate) {
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
        
        maskAadhar: function(aadhar) {
            if (!aadhar) return '-';
            return 'XXXX-XXXX-' + aadhar.slice(-4);
        },
        
        maskPAN: function(pan) {
            if (!pan) return '-';
            return pan.slice(0, 3) + '****' + pan.slice(-2);
        },
        
        maskAccountNumber: function(account) {
            if (!account) return '-';
            return '****' + account.slice(-4);
        }
    };
    
})(jQuery, window);