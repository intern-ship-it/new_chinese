// js/pages/dharma-assembly/index.js
// Special Occasions Dharma Assembly Listing Page with GSAP + AOS animations

(function($, window) {
    'use strict';
    
    window.DharmaAssemblyPage = {
        dataTable: null,
        
        // Page initialization
        init: function(params) {
            this.loadCSS();
            this.render();
            this.initAnimations();
            this.initDataTable();
            this.bindEvents();
            this.loadStats();
        },
        
        // Load CSS dynamically
        loadCSS: function() {
            if (!document.getElementById('dharma-assembly-css')) {
                const link = document.createElement('link');
                link.id = 'dharma-assembly-css';
                link.rel = 'stylesheet';
                link.href = '/css/dharma-assembly.css';
                document.head.appendChild(link);
            }
        },
        
        // Render page HTML
        render: function() {
            const html = `
                <div class="dharma-assembly-page">
                    <!-- Page Header with Animation -->
                    <div class="occasion-header" data-aos="fade-down" data-aos-duration="1000">
                        <div class="occasion-header-bg"></div>
                        <div class="container-fluid">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <div class="occasion-title-wrapper">
                                        <i class="bi bi-calendar-event-fill occasion-header-icon"></i>
                                        <div>
                                            <h1 class="occasion-title">Dharma Assembly</h1>
                                            <p class="occasion-subtitle">法会 • Special Occasions Management</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end">
                                    <button class="btn btn-outline-light btn-lg" id="btnNewOccasion">
                                        <i class="bi bi-plus-circle"></i> New Registration
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="row g-3 mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="100">
                        <div class="col-md-3">
                            <div class="stat-card stat-card-primary">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-calendar-check-fill"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="totalRegistrations">0</div>
                                        <div class="stat-label">Total Registrations</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-success">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-gift-fill"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="longevityCount">0</div>
                                        <div class="stat-label">Prayer for Longevity</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-info">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-flower1"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="departedCount">0</div>
                                        <div class="stat-label">Prayer to Departed</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <div class="stat-card stat-card-warning">
                                <div class="d-flex align-items-center">
                                    <div class="stat-card-icon">
                                        <i class="bi bi-star-fill"></i>
                                    </div>
                                    <div class="ms-3">
                                        <div class="stat-value" id="meritCount">0</div>
                                        <div class="stat-label">Merit Dedication</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Filter Card -->
                    <div class="card shadow-sm filter-card mb-4" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">
                                        <i class="bi bi-funnel me-2"></i>Assembly Type
                                    </label>
                                    <select class="form-select" id="filterAssemblyType">
                                        <option value="">All Types</option>
                                        <option value="longevity">Prayer for Longevity</option>
                                        <option value="departed">Prayer to The Departed</option>
                                        <option value="merit">Merit Dedication</option>
                                    </select>
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">
                                        <i class="bi bi-calendar-range me-2"></i>Date From
                                    </label>
                                    <input type="date" class="form-control" id="filterDateFrom">
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">
                                        <i class="bi bi-calendar-range me-2"></i>Date To
                                    </label>
                                    <input type="date" class="form-control" id="filterDateTo">
                                </div>
                                
                                <div class="col-md-3">
                                    <label class="form-label fw-semibold">
                                        <i class="bi bi-check-circle me-2"></i>Status
                                    </label>
                                    <select class="form-select" id="filterStatus">
                                        <option value="">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-12 text-end">
                                    <button class="btn btn-secondary" id="btnResetFilters">
                                        <i class="bi bi-arrow-counterclockwise"></i> Reset
                                    </button>
                                    <button class="btn btn-primary" id="btnApplyFilters">
                                        <i class="bi bi-search"></i> Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Table Card -->
                    <div class="card shadow-sm table-card" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table id="occasionsTable" class="table table-hover" style="width:100%">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Name</th>
                                            <th>Assembly Type</th>
                                            <th>Contact No.</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- Data will be loaded via DataTables -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- View Details Modal -->
                <div class="modal fade" id="viewDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-gradient-primary text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-info-circle-fill"></i> Registration Details
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="modalDetailsContent">
                                <!-- Details will be loaded dynamically -->
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('#page-container').html(html);
        },
        
        // Initialize animations
        initAnimations: function() {
            // Initialize AOS
            AOS.init({
                duration: 800,
                easing: 'ease-out',
                once: true
            });
            
            // Animate header background
            gsap.to('.occasion-header-bg', {
                backgroundPosition: '100% 100%',
                duration: 20,
                repeat: -1,
                ease: 'none'
            });
            
            // Animate header icon
            gsap.to('.occasion-header-icon', {
                y: -10,
                duration: 2,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
            
            // Animate stat cards on load
            gsap.from('.stat-card', {
                scale: 0.8,
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'back.out(1.7)',
                delay: 0.3
            });
        },
        
        // Initialize DataTable
        initDataTable: function() {
            const self = this;
            
            this.dataTable = $('#occasionsTable').DataTable({
                responsive: true,
                pageLength: 10,
                order: [[0, 'desc']],
                language: {
                    search: "Search:",
                    lengthMenu: "Show _MENU_ entries",
                    info: "Showing _START_ to _END_ of _TOTAL_ registrations",
                    paginate: {
                        first: "First",
                        last: "Last",
                        next: "Next",
                        previous: "Previous"
                    }
                },
                columns: [
                    { 
                        data: 'date',
                        render: function(data) {
                            return `<span class="text-nowrap">${data}</span>`;
                        }
                    },
                    { 
                        data: 'name',
                        render: function(data) {
                            return `<strong>${data}</strong>`;
                        }
                    },
                    { 
                        data: 'assembly_type',
                        render: function(data) {
                            const badges = {
                                'longevity': '<span class="badge bg-success"><i class="bi bi-gift-fill me-1"></i>Longevity</span>',
                                'departed': '<span class="badge bg-info"><i class="bi bi-flower1 me-1"></i>Departed</span>',
                                'merit': '<span class="badge bg-warning"><i class="bi bi-star-fill me-1"></i>Merit</span>'
                            };
                            return badges[data] || data;
                        }
                    },
                    { 
                        data: 'contact',
                        render: function(data) {
                            return `<span class="text-nowrap">${data}</span>`;
                        }
                    },
                    { 
                        data: 'amount',
                        render: function(data) {
                            return `<strong class="text-primary">RM ${parseFloat(data).toFixed(2)}</strong>`;
                        }
                    },
                    { 
                        data: 'status',
                        render: function(data) {
                            const badges = {
                                'pending': '<span class="badge bg-warning">Pending</span>',
                                'confirmed': '<span class="badge bg-primary">Confirmed</span>',
                                'completed': '<span class="badge bg-success">Completed</span>',
                                'cancelled': '<span class="badge bg-danger">Cancelled</span>'
                            };
                            return badges[data] || data;
                        }
                    },
                    { 
                        data: 'id',
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-info btn-view" data-id="${data}" title="View">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    <button class="btn btn-primary btn-edit" data-id="${data}" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-danger btn-delete" data-id="${data}" title="Delete">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                data: this.getSampleData(),
                drawCallback: function() {
                    // Animate table rows
                    gsap.from('#occasionsTable tbody tr', {
                        opacity: 0,
                        y: 20,
                        duration: 0.3,
                        stagger: 0.05,
                        ease: 'power2.out'
                    });
                }
            });
        },
        
        // Get sample data (replace with actual API call)
        getSampleData: function() {
            return [
                {
                    id: 1,
                    date: '2024-11-15',
                    name: 'Wong Ah Kow 黄亚九',
                    assembly_type: 'longevity',
                    contact: '+60123456789',
                    amount: 30000.00,
                    status: 'confirmed',
                    details: {
                        nric: '800101-01-1234',
                        email: 'wong@example.com',
                        option: 'Chief Patron 法华坛功德主',
                        payment_methods: ['Cash', 'Cheque'],
                        remarks: 'Special request for front row seating'
                    }
                },
                {
                    id: 2,
                    date: '2024-11-14',
                    name: 'Tan Mei Ling 陈美玲',
                    assembly_type: 'departed',
                    contact: '+60187654321',
                    amount: 1000.00,
                    status: 'pending',
                    details: {
                        nric: '850505-05-5678',
                        email: 'tan@example.com',
                        option: '1 Tablet (Individual)',
                        dedicatees: ['Late Father', 'Late Mother'],
                        departed_name: 'Tan Ah Seng, Lim Ah Mooi',
                        payment_methods: ['E-banking'],
                        remarks: ''
                    }
                },
                {
                    id: 3,
                    date: '2024-11-13',
                    name: 'Lee Wei Ming 李伟明',
                    assembly_type: 'merit',
                    contact: '+60162345678',
                    amount: 1000.00,
                    status: 'completed',
                    details: {
                        nric: '900303-03-9012',
                        email: 'lee@example.com',
                        option: 'Perfect Meal 圆满斋',
                        wisdom_light: 'Family',
                        devas_offering: 'Individual',
                        payment_methods: ['Credit Card'],
                        remarks: 'Thank you for the blessings'
                    }
                },
                {
                    id: 4,
                    date: '2024-11-12',
                    name: 'Lim Siew Lan 林秀兰',
                    assembly_type: 'longevity',
                    contact: '+60198765432',
                    amount: 5000.00,
                    status: 'confirmed',
                    details: {
                        nric: '750707-07-3456',
                        email: 'lim@example.com',
                        option: 'Mercy Patron 慈悲功德主',
                        payment_methods: ['DuitNow'],
                        remarks: ''
                    }
                },
                {
                    id: 5,
                    date: '2024-11-11',
                    name: 'Chen Yong Hui 陈永辉',
                    assembly_type: 'departed',
                    contact: '+60123334444',
                    amount: 500.00,
                    status: 'completed',
                    details: {
                        nric: '880909-09-7890',
                        email: 'chen@example.com',
                        option: '1 Tablet (4 Family Members)',
                        dedicatees: ['Late Grandfather', 'Late Grandmother'],
                        departed_name: 'Chen Ah Beng, Goh Ah Hwa',
                        payment_methods: ['Cash'],
                        remarks: 'Prayer for ancestors'
                    }
                }
            ];
        },
        
        // Load stats
        loadStats: function() {
            const data = this.getSampleData();
            
            const stats = {
                total: data.length,
                longevity: data.filter(d => d.assembly_type === 'longevity').length,
                departed: data.filter(d => d.assembly_type === 'departed').length,
                merit: data.filter(d => d.assembly_type === 'merit').length
            };
            
            // Animate stat values
            this.animateValue('totalRegistrations', 0, stats.total, 1000);
            this.animateValue('longevityCount', 0, stats.longevity, 1000);
            this.animateValue('departedCount', 0, stats.departed, 1000);
            this.animateValue('meritCount', 0, stats.merit, 1000);
        },
        
        // Animate number value
        animateValue: function(id, start, end, duration) {
            const obj = document.getElementById(id);
            const range = end - start;
            const increment = end > start ? 1 : -1;
            const stepTime = Math.abs(Math.floor(duration / range));
            let current = start;
            
            const timer = setInterval(function() {
                current += increment;
                obj.textContent = current;
                if (current === end) {
                    clearInterval(timer);
                }
            }, stepTime);
        },
        
        // Bind events
        bindEvents: function() {
            const self = this;
            
            // New registration button
            $('#btnNewOccasion').on('click', function() {
                TempleRouter.navigate('dharma-assembly/create');
            });
            
            // Apply filters
            $('#btnApplyFilters').on('click', function() {
                self.applyFilters();
            });
            
            // Reset filters
            $('#btnResetFilters').on('click', function() {
                self.resetFilters();
            });
            
            // View button
            $(document).on('click', '.btn-view', function() {
                const id = $(this).data('id');
                self.viewDetails(id);
            });
            
            // Edit button
            $(document).on('click', '.btn-edit', function() {
                const id = $(this).data('id');
                self.editRecord(id);
            });
            
            // Delete button
            $(document).on('click', '.btn-delete', function() {
                const id = $(this).data('id');
                self.deleteRecord(id);
            });
            
            // Table row hover animation
            $('#occasionsTable tbody').on('mouseenter', 'tr', function() {
                gsap.to(this, {
                    backgroundColor: 'rgba(255, 0, 255, 0.05)',
                    duration: 0.2
                });
            }).on('mouseleave', 'tr', function() {
                gsap.to(this, {
                    backgroundColor: 'transparent',
                    duration: 0.2
                });
            });
            
            // Filter select animations
            $('.form-select, .form-control').on('focus', function() {
                gsap.to($(this), {
                    scale: 1.02,
                    duration: 0.2,
                    ease: 'power1.out'
                });
            }).on('blur', function() {
                gsap.to($(this), {
                    scale: 1,
                    duration: 0.2
                });
            });
        },
        
        // Apply filters
        applyFilters: function() {
            const assemblyType = $('#filterAssemblyType').val();
            const dateFrom = $('#filterDateFrom').val();
            const dateTo = $('#filterDateTo').val();
            const status = $('#filterStatus').val();
            
            // Build search string
            let searchValue = '';
            
            if (assemblyType) {
                const typeLabels = {
                    'longevity': 'Longevity',
                    'departed': 'Departed',
                    'merit': 'Merit'
                };
                searchValue += typeLabels[assemblyType] + ' ';
            }
            
            if (status) {
                searchValue += status + ' ';
            }
            
            // Apply search
            this.dataTable.search(searchValue).draw();
            
            // Animate filter application
            gsap.fromTo('.table-card', 
                { scale: 0.98, opacity: 0.7 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
            
            TempleCore.showToast('Filters applied', 'info');
        },
        
        // Reset filters
        resetFilters: function() {
            $('#filterAssemblyType').val('');
            $('#filterDateFrom').val('');
            $('#filterDateTo').val('');
            $('#filterStatus').val('');
            
            this.dataTable.search('').draw();
            
            TempleCore.showToast('Filters reset', 'info');
        },
        
        // View details
        viewDetails: function(id) {
            const data = this.getSampleData().find(d => d.id === id);
            
            if (!data) return;
            
            const assemblyTypeLabels = {
                'longevity': 'Prayer for Longevity 延生禄位',
                'departed': 'Prayer to The Departed 往生超荐',
                'merit': 'Merit Dedication 功德主'
            };
            
            let detailsHTML = `
                <div class="row g-3">
                    <div class="col-12">
                        <div class="section-header-gradient">
                            <i class="bi bi-person-badge"></i>
                            <span>Personal Information</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <strong>Name:</strong><br>${data.name}
                    </div>
                    <div class="col-md-6">
                        <strong>NRIC:</strong><br>${data.details.nric}
                    </div>
                    <div class="col-md-6">
                        <strong>Email:</strong><br>${data.details.email}
                    </div>
                    <div class="col-md-6">
                        <strong>Contact:</strong><br>${data.contact}
                    </div>
                    
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-calendar-event"></i>
                            <span>Assembly Details</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <strong>Assembly Type:</strong><br>${assemblyTypeLabels[data.assembly_type]}
                    </div>
                    <div class="col-md-6">
                        <strong>Date:</strong><br>${data.date}
                    </div>
                    <div class="col-md-6">
                        <strong>Option:</strong><br>${data.details.option}
                    </div>
                    <div class="col-md-6">
                        <strong>Amount:</strong><br><span class="text-primary fw-bold">RM ${parseFloat(data.amount).toFixed(2)}</span>
                    </div>
            `;
            
            // Add assembly-specific details
            if (data.assembly_type === 'departed') {
                detailsHTML += `
                    <div class="col-md-6">
                        <strong>Dedicatees:</strong><br>${data.details.dedicatees.join(', ')}
                    </div>
                    <div class="col-md-6">
                        <strong>Departed Name:</strong><br>${data.details.departed_name}
                    </div>
                `;
            } else if (data.assembly_type === 'merit') {
                if (data.details.wisdom_light) {
                    detailsHTML += `
                        <div class="col-md-6">
                            <strong>Wisdom Light:</strong><br>${data.details.wisdom_light}
                        </div>
                    `;
                }
                if (data.details.devas_offering) {
                    detailsHTML += `
                        <div class="col-md-6">
                            <strong>Devas Offering:</strong><br>${data.details.devas_offering}
                        </div>
                    `;
                }
            }
            
            detailsHTML += `
                    <div class="col-12 mt-4">
                        <div class="section-header-gradient">
                            <i class="bi bi-credit-card"></i>
                            <span>Payment Information</span>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <strong>Payment Methods:</strong><br>${data.details.payment_methods.join(', ')}
                    </div>
                    <div class="col-md-6">
                        <strong>Status:</strong><br>
                        ${data.status === 'pending' ? '<span class="badge bg-warning">Pending</span>' : ''}
                        ${data.status === 'confirmed' ? '<span class="badge bg-primary">Confirmed</span>' : ''}
                        ${data.status === 'completed' ? '<span class="badge bg-success">Completed</span>' : ''}
                        ${data.status === 'cancelled' ? '<span class="badge bg-danger">Cancelled</span>' : ''}
                    </div>
            `;
            
            if (data.details.remarks) {
                detailsHTML += `
                    <div class="col-12">
                        <strong>Remarks:</strong><br>${data.details.remarks}
                    </div>
                `;
            }
            
            detailsHTML += '</div>';
            
            $('#modalDetailsContent').html(detailsHTML);
            $('#viewDetailsModal').modal('show');
        },
        
        // Edit record
        editRecord: function(id) {
            TempleCore.showToast('Edit functionality will be implemented', 'info');
            // TempleRouter.navigate('dharma-assembly/edit/' + id);
        },
        
        // Delete record
        deleteRecord: function(id) {
            const self = this;
            
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff00ff',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                customClass: {
                    popup: 'animated-popup'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    // Simulate deletion
                    const row = self.dataTable.row(function(idx, data) {
                        return data.id === id;
                    });
                    
                    // Animate row removal
                    gsap.to(row.node(), {
                        opacity: 0,
                        x: -50,
                        duration: 0.3,
                        onComplete: function() {
                            row.remove().draw();
                            TempleCore.showToast('Registration deleted successfully!', 'success');
                            self.loadStats();
                        }
                    });
                }
            });
        }
    };
    
})(jQuery, window);