// js/pages/fund-budgets/calendar-view.js
// Fund Budget Calendar View Component

(function ($, window) {
    'use strict';

    window.FundBudgetCalendar = {
        calendar: null,
        currentMonth: moment(),
        currentView: 'month', // 'month', 'week', or 'list'
        budgets: [],
        funds: {},
        isInitialized: false,
        containerId: null,
        
        // Initialize calendar view
        init: function (containerId) {
        
            this.containerId = containerId;
            this.loadFunds();
            this.render();
            this.bindEvents();
            this.loadBudgetsForMonth();
            this.isInitialized = true;
        },

        // Load funds for color coding
        loadFunds: function () {
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/accounts/funds',
                type: 'GET',
                headers: TempleAPI.getHeaders(),
                async: false,
                success: (response) => {
                    if (response.success) {
                        // Assign colors to funds
                        const colors = [
                            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
                            '#98D8C8', '#6C5CE7', '#A8E6CF', '#FFD3B6',
                            '#FF8B94', '#B4A7D6', '#87CEEB', '#DDA0DD'
                        ];
                        
                        response.data.forEach((fund, index) => {
                            this.funds[fund.id] = {
                                ...fund,
                                color: colors[index % colors.length]
                            };
                        });
                    }
                },
                error: (xhr) => {
                    console.error('Error loading funds:', xhr);
                }
            });
        },

        // Render calendar
        render: function () {
            const html = `
                <div class="fund-calendar-container">
                    <!-- Calendar Header -->
                    <div class="calendar-header mb-3">
                        <div class="row align-items-center">
                            <div class="col-auto">
                                <div class="btn-group">
                                    <button class="btn btn-outline-primary" id="calPrevMonth">
                                        <i class="bi bi-chevron-left"></i>
                                    </button>
                                    <button class="btn btn-outline-primary" id="calToday">Today</button>
                                    <button class="btn btn-outline-primary" id="calNextMonth">
                                        <i class="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="col">
                                <h4 class="mb-0 text-center" id="calMonthYear"></h4>
                            </div>
                            <div class="col-auto">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-outline-secondary active" id="calViewMonth" data-view="month">
                                        <i class="bi bi-calendar3"></i> Month
                                    </button>
                                    <button class="btn btn-outline-secondary" id="calViewWeek" data-view="week">
                                        <i class="bi bi-calendar-week"></i> Week
                                    </button>
                                    <button class="btn btn-outline-secondary" id="calViewList" data-view="list">
                                        <i class="bi bi-list-ul"></i> List
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Fund Legend -->
                    <div class="calendar-legend mb-3">
                        <div class="d-flex flex-wrap gap-2" id="fundLegend"></div>
                    </div>

                    <!-- Calendar Grid -->
                    <div class="calendar-grid" id="calendarGrid"></div>

                    <!-- Budget Summary Panel -->
                    <div class="calendar-summary mt-4">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h6 class="text-muted">Total Budgets</h6>
                                        <h3 id="totalBudgetsCount">0</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h6 class="text-muted">Active Budgets</h6>
                                        <h3 class="text-success" id="activeBudgetsCount">0</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h6 class="text-muted">Total Amount</h6>
                                        <h3 id="totalBudgetAmount">0</h3>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="card text-center">
                                    <div class="card-body">
                                        <h6 class="text-muted">Utilized</h6>
                                        <h3 id="totalUtilized">0</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Budget Details Modal -->
                <div class="modal fade" id="budgetDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Budget Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" id="budgetDetailsContent"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $(this.containerId).html(html);
            this.renderFundLegend();
        },

        // Bind events
        bindEvents: function () {
            const self = this;

            // Navigation buttons
            $('#calPrevMonth').off('click').on('click', function () {
                self.currentMonth.subtract(1, 'month');
                self.loadBudgetsForMonth();
            });

            $('#calToday').off('click').on('click', function () {
                self.currentMonth = moment();
                self.loadBudgetsForMonth();
            });

            $('#calNextMonth').off('click').on('click', function () {
                self.currentMonth.add(1, 'month');
                self.loadBudgetsForMonth();
            });

            // View switching
            $('[id^="calView"]').off('click').on('click', function () {
                const view = $(this).data('view');
                self.currentView = view;
                
                // Update button states
                $('[id^="calView"]').removeClass('active');
                $(this).addClass('active');
                
                // Render appropriate view
                self.renderView();
            });
        },

        // Render fund legend
        renderFundLegend: function () {
            let html = '';
            Object.values(this.funds).forEach(fund => {
                html += `
                    <div class="fund-legend-item d-flex align-items-center">
                        <div class="legend-color" style="background: ${fund.color}; width: 20px; height: 20px; border-radius: 3px; margin-right: 5px;"></div>
                        <span>${fund.name}</span>
                    </div>
                `;
            });
            $('#fundLegend').html(html);
        },

        // Load budgets for current month
        loadBudgetsForMonth: function () {
            const startDate = this.currentMonth.clone().startOf('month').subtract(7, 'days');
            const endDate = this.currentMonth.clone().endOf('month').add(7, 'days');

            $.ajax({
                url: TempleAPI.getBaseUrl() + '/fund-budgets',
                type: 'GET',
                data: {
                    from_date: startDate.format('YYYY-MM-DD'),
                    to_date: endDate.format('YYYY-MM-DD'),
                    per_page: 1000 // Get all budgets in range for calendar
                },
                headers: TempleAPI.getHeaders(),
                success: (response) => {
                    if (response.success) {
                        this.budgets = response.data.data || [];
                        this.renderView();
                        this.updateSummary();
                    }
                },
                error: (error) => {
                    console.error('Error loading budgets:', error);
                    TempleCore.showToast('Error loading budgets', 'error');
                }
            });
        },

        // Render appropriate view
        renderView: function () {
            switch (this.currentView) {
                case 'month':
                    this.renderMonthView();
                    break;
                case 'week':
                    this.renderWeekView();
                    break;
                case 'list':
                    this.renderListView();
                    break;
            }
        },

        // Render month view
        renderMonthView: function () {
            const firstDay = this.currentMonth.clone().startOf('month');
            const lastDay = this.currentMonth.clone().endOf('month');
            const startDate = firstDay.clone().startOf('week');
            const endDate = lastDay.clone().endOf('week');

            // Update month/year display
            $('#calMonthYear').text(this.currentMonth.format('MMMM YYYY'));

            let html = '<div class="calendar-month">';
            
            // Weekday headers
            html += '<div class="calendar-weekdays">';
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            weekdays.forEach(day => {
                html += `<div class="calendar-day-header">${day}</div>`;
            });
            html += '</div>';

            // Calendar days
            html += '<div class="calendar-days">';
            const currentDate = startDate.clone();
            
            while (currentDate <= endDate) {
                const isCurrentMonth = currentDate.month() === this.currentMonth.month();
                const isToday = currentDate.isSame(moment(), 'day');
                
                const dayClasses = ['calendar-day'];
                if (!isCurrentMonth) dayClasses.push('other-month');
                if (isToday) dayClasses.push('today');

                html += `<div class="${dayClasses.join(' ')}" data-date="${currentDate.format('YYYY-MM-DD')}">`;
                html += `<div class="calendar-day-number">${currentDate.date()}</div>`;

                // Get budgets for this day
                const dayBudgets = this.getBudgetsForDate(currentDate);
                const maxVisible = 3;
                
                dayBudgets.slice(0, maxVisible).forEach(budget => {
                    const fund = this.funds[budget.fund_id];
                    const color = fund ? fund.color : '#999';
                    const utilizationPct = budget.summary ? budget.summary.utilization_percentage : 0;

                    html += `
                        <div class="calendar-event" 
                             style="background: ${color};" 
                             onclick="FundBudgetCalendar.showBudgetDetails(${budget.id})">
                            <span class="event-name">${budget.budget_name}</span>
                            <span class="event-utilization">${Math.round(utilizationPct)}%</span>
                        </div>
                    `;
                });

                if (dayBudgets.length > maxVisible) {
                    html += `
                        <div class="calendar-event-more" onclick="FundBudgetCalendar.showDayBudgets('${currentDate.format('YYYY-MM-DD')}')">
                            +${dayBudgets.length - maxVisible} more
                        </div>
                    `;
                }

                html += '</div>';
                currentDate.add(1, 'day');
            }

            html += '</div></div>';
            $('#calendarGrid').html(html);
        },

        // Render week view
        renderWeekView: function () {
            const startOfWeek = this.currentMonth.clone().startOf('week');
            const endOfWeek = this.currentMonth.clone().endOf('week');

            // Update month/year display
            $('#calMonthYear').text(startOfWeek.format('MMM D') + ' - ' + endOfWeek.format('MMM D, YYYY'));

            let html = '<div class="week-days">';

            const currentDate = startOfWeek.clone();
            for (let i = 0; i < 7; i++) {
                const isToday = currentDate.isSame(moment(), 'day');
                const dayClasses = ['week-day'];
                if (isToday) dayClasses.push('today');

                html += `<div class="${dayClasses.join(' ')}">`;
                html += `
                    <div class="week-day-header">
                        <strong>${currentDate.format('ddd')}</strong><br>
                        <span class="text-muted">${currentDate.format('MMM D')}</span>
                    </div>
                `;

                // Get budgets for this day
                const dayBudgets = this.getBudgetsForDate(currentDate);
                
                if (dayBudgets.length === 0) {
                    html += '<div class="no-events"><small class="text-muted">No budgets</small></div>';
                } else {
                    dayBudgets.forEach(budget => {
                        const fund = this.funds[budget.fund_id];
                        const color = fund ? fund.color : '#999';

                        html += `
                            <div class="week-event" 
                                 style="background: ${color};" 
                                 onclick="FundBudgetCalendar.showBudgetDetails(${budget.id})">
                                <div class="event-title">${budget.budget_name}</div>
                                <div class="event-time">${fund ? fund.name : 'N/A'}</div>
                                <div class="event-status">
                                    ${budget.status} - ${FundBudgetsPage.formatCurrency(budget.budget_amount)}
                                </div>
                            </div>
                        `;
                    });
                }

                html += '</div>';
                currentDate.add(1, 'day');
            }

            html += '</div>';
            $('#calendarGrid').html(html);
        },

        // Render list view
        renderListView: function () {
            const startDate = this.currentMonth.clone().startOf('month');
            const endDate = this.currentMonth.clone().endOf('month');

            // Update month/year display
            $('#calMonthYear').text(this.currentMonth.format('MMMM YYYY'));

            // Group budgets by status
            const groupedBudgets = {
                'APPROVED': [],
                'SUBMITTED': [],
                'DRAFT': [],
                'REJECTED': [],
                'CLOSED': []
            };

            this.budgets.forEach(budget => {
                const status = budget.status || 'DRAFT';
                if (groupedBudgets[status]) {
                    groupedBudgets[status].push(budget);
                }
            });

            let html = '<div class="budget-list-view">';

            // Create tabs for each status
            html += '<ul class="nav nav-tabs nav-tabs-custom mb-3" role="tablist">';
            Object.keys(groupedBudgets).forEach((status, index) => {
                const count = groupedBudgets[status].length;
                const active = index === 0 ? 'active' : '';
                const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();
                
                html += `
                    <li class="nav-item">
                        <a class="nav-link ${active}" data-bs-toggle="tab" href="#status-${status}">
                            ${statusLabel} (${count})
                        </a>
                    </li>
                `;
            });
            html += '</ul>';

            // Tab content
            html += '<div class="tab-content">';
            Object.keys(groupedBudgets).forEach((status, index) => {
                const active = index === 0 ? 'show active' : '';
                html += `<div class="tab-pane fade ${active}" id="status-${status}">`;

                const budgets = groupedBudgets[status];
                if (budgets.length === 0) {
                    html += '<p class="text-muted text-center py-4">No budgets with this status</p>';
                } else {
                    html += '<div class="table-responsive"><table class="table table-hover">';
                    html += `
                        <thead>
                            <tr>
                                <th>Budget Name</th>
                                <th>Fund</th>
                                <th>Period</th>
                                <th class="text-end">Amount</th>
                                <th class="text-end">Utilized</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                    `;

                    budgets.forEach(budget => {
                        const fund = this.funds[budget.fund_id];
                        const summary = budget.summary || {};
                        const utilized = parseFloat(summary.utilized_amount || 0);
                        const utilizationPct = parseFloat(summary.utilization_percentage || 0);
                  
                        html += `
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="me-2" style="width: 4px; height: 30px; background: ${fund ? fund.color : '#999'}; border-radius: 2px;"></div>
                                        <strong>${budget.budget_name}</strong>
                                    </div>
                                </td>
                                <td>${fund ? fund.name : 'N/A'}</td>
                                <td>
                                    <small>${moment(budget.from_date).format('MMM D')} - ${moment(budget.to_date).format('MMM D, YYYY')}</small>
                                </td>
                                <td class="text-end">${FundBudgetsPage.formatCurrency(budget.budget_amount)}</td>
                                <td class="text-end">
                                    ${FundBudgetsPage.formatCurrency(utilized)}
                                    <br><small class="text-muted">${utilizationPct.toFixed(1)}%</small>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary" onclick="FundBudgetCalendar.showBudgetDetails(${budget.id})">
                                        <i class="bi bi-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    html += '</tbody></table></div>';
                }

                html += '</div>';
            });
            html += '</div>';

            html += '</div>';
            $('#calendarGrid').html(html);
        },

        // Get budgets for a specific date
        getBudgetsForDate: function (date) {
            const dateStr = date.format('YYYY-MM-DD');
            return this.budgets.filter(budget => {
                return dateStr >= budget.from_date && dateStr <= budget.to_date;
            });
        },

        // Show budget details
        showBudgetDetails: function (budgetId) {
            $.ajax({
                url: TempleAPI.getBaseUrl() + '/fund-budgets/' + budgetId,
                type: 'GET',
                headers: TempleAPI.getHeaders(),
                success: (response) => {
                    if (response.success) {
                        this.renderBudgetDetails(response.data.budget);
                        const modal = new bootstrap.Modal(document.getElementById('budgetDetailsModal'));
                        modal.show();
                    }
                },
                error: (xhr) => {
                    TempleCore.showToast('Error loading budget details', 'error');
                }
            });
        },

        // Render budget details in modal
        renderBudgetDetails: function (budget) {
            const fund = this.funds[budget.fund_id];
            const summary = budget.summary || {};

            let html = `
                <div class="budget-details">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Budget Name:</strong> ${budget.budget_name}
                        </div>
                        <div class="col-md-6">
                            <strong>Fund:</strong> ${fund ? fund.name : 'N/A'}
                        </div>
                    </div>
                    
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <strong>Period:</strong> ${moment(budget.from_date).format('MMM D, YYYY')} - ${moment(budget.to_date).format('MMM D, YYYY')}
                        </div>
                        <div class="col-md-6">
                            <strong>Status:</strong> <span class="badge bg-${this.getStatusColor(budget.status)}">${budget.status}</span>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6 class="text-muted">Budget Amount</h6>
                                    <h4>${FundBudgetsPage.formatCurrency(budget.budget_amount)}</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6 class="text-muted">Utilized</h6>
                                    <h4>${FundBudgetsPage.formatCurrency(summary.utilized_amount || 0)}</h4>
                                    <small class="text-muted">${(summary.utilization_percentage || 0).toFixed(1)}%</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body text-center">
                                    <h6 class="text-muted">Remaining</h6>
                                    <h4>${FundBudgetsPage.formatCurrency(summary.remaining_amount || 0)}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${budget.notes ? `
                        <div class="mb-3">
                            <strong>Notes:</strong>
                            <p class="text-muted">${budget.notes}</p>
                        </div>
                    ` : ''}

                    ${budget.budget_items && budget.budget_items.length > 0 ? `
                        <div class="mb-3">
                            <strong>Budget Items:</strong>
                            <div class="table-responsive mt-2">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Ledger</th>
                                            <th class="text-end">Budgeted</th>
                                            <th class="text-end">Utilized</th>
                                            <th class="text-end">Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${budget.budget_items.map(item => `
                                            <tr>
                                                <td>${item.ledger ? item.ledger.name : 'N/A'}</td>
                                                <td class="text-end">${FundBudgetsPage.formatCurrency(item.budgeted_amount)}</td>
                                                <td class="text-end">${FundBudgetsPage.formatCurrency(item.utilized_amount || 0)}</td>
                                                <td class="text-end">${FundBudgetsPage.formatCurrency((item.budgeted_amount - (item.utilized_amount || 0)))}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            $('#budgetDetailsContent').html(html);
        },

        // Get status color
        getStatusColor: function (status) {
            switch (status) {
                case 'DRAFT': return 'secondary';
                case 'SUBMITTED': return 'info';
                case 'APPROVED': return 'success';
                case 'REJECTED': return 'danger';
                case 'CLOSED': return 'dark';
                default: return 'secondary';
            }
        },

        // Show all budgets for a specific day
        showDayBudgets: function (date) {
            const budgets = this.getBudgetsForDate(moment(date));
            let html = `<h5>Budgets for ${moment(date).format('MMMM D, YYYY')}</h5>`;
            html += '<div class="list-group mt-3">';
            
            budgets.forEach(budget => {
                const fund = this.funds[budget.fund_id];
                const color = fund ? fund.color : '#999';
                
                html += `
                    <a href="#" class="list-group-item list-group-item-action" 
                       onclick="FundBudgetCalendar.showBudgetDetails(${budget.id}); return false;">
                        <div class="d-flex align-items-center">
                            <div class="me-3" style="width: 4px; height: 40px; background: ${color}; border-radius: 2px;"></div>
                            <div class="flex-grow-1">
                                <h6 class="mb-1">${budget.budget_name}</h6>
                                <small class="text-muted">${fund ? fund.name : 'N/A'} - ${FundBudgetsPage.formatCurrency(budget.budget_amount)}</small>
                            </div>
                            <span class="badge bg-${this.getStatusColor(budget.status)}">${budget.status}</span>
                        </div>
                    </a>
                `;
            });
            
            html += '</div>';
            $('#budgetDetailsContent').html(html);
            
            const modal = new bootstrap.Modal(document.getElementById('budgetDetailsModal'));
            modal.show();
        },

        // Update summary statistics
        updateSummary: function () {
            const currencySymbol = FundBudgetsPage.getCurrencySymbol();
            
            let totalBudgets = this.budgets.length;
            let activeBudgets = 0;
            let totalAmount = 0;
            let totalUtilized = 0;

            this.budgets.forEach(budget => {
                if (budget.status === 'APPROVED') {
                    activeBudgets++;
                }
                totalAmount += parseFloat(budget.budget_amount || 0);
                totalUtilized += parseFloat(budget.summary?.utilized_amount || 0);
            });

            $('#totalBudgetsCount').text(totalBudgets);
            $('#activeBudgetsCount').text(activeBudgets);
            $('#totalBudgetAmount').text(`${currencySymbol} ${totalAmount.toFixed(2)}`);
            $('#totalUtilized').text(`${currencySymbol} ${totalUtilized.toFixed(2)}`);
        }
    };

    // CSS Styles for Calendar
    const calendarStyles = `
        <style>
            .fund-calendar-container {
                padding: 20px;
            }

            .calendar-month {
                border: 1px solid #dee2e6;
                border-radius: 8px;
                background: white;
            }

            .calendar-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
            }

            .calendar-day-header {
                padding: 10px;
                text-align: center;
                font-weight: bold;
                color: #495057;
            }

            .calendar-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
            }

            .calendar-day {
                min-height: 100px;
                border-right: 1px solid #dee2e6;
                border-bottom: 1px solid #dee2e6;
                padding: 5px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .calendar-day:hover {
                background: #f8f9fa;
            }

            .calendar-day.other-month {
                background: #fcfcfc;
                color: #adb5bd;
            }

            .calendar-day.today {
                background: #e7f3ff;
            }

            .calendar-day-number {
                font-weight: bold;
                margin-bottom: 5px;
            }

            .calendar-event {
                font-size: 11px;
                padding: 2px 4px;
                margin-bottom: 2px;
                border-radius: 3px;
                color: white;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .calendar-event:hover {
                transform: translateX(2px);
            }

            .event-name {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
            }

            .event-utilization {
                font-size: 10px;
                padding: 1px 3px;
                border-radius: 2px;
                background: rgba(255,255,255,0.3);
            }

            .calendar-event-more {
                font-size: 11px;
                color: #6c757d;
                text-align: center;
                margin-top: 2px;
                cursor: pointer;
            }

            .calendar-event-more:hover {
                text-decoration: underline;
            }

            .fund-legend-item {
                padding: 5px 10px;
                border: 1px solid #dee2e6;
                border-radius: 20px;
                font-size: 14px;
            }

            /* Week View Styles */
            .week-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 10px;
                margin-top: 20px;
            }

            .week-day {
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 10px;
                min-height: 300px;
                background: white;
            }

            .week-day.today {
                background: #e7f3ff;
            }

            .week-day-header {
                text-align: center;
                padding-bottom: 10px;
                border-bottom: 1px solid #dee2e6;
                margin-bottom: 10px;
            }

            .week-event {
                padding: 8px;
                margin-bottom: 5px;
                border-radius: 5px;
                color: white;
                cursor: pointer;
            }

            .week-event:hover {
                opacity: 0.8;
            }

            .event-time {
                font-size: 11px;
                opacity: 0.9;
            }

            .event-title {
                font-weight: bold;
                margin: 2px 0;
            }

            .event-status {
                font-size: 11px;
                opacity: 0.9;
            }

            .no-events {
                text-align: center;
                padding: 20px;
            }

            /* List View Styles */
            .budget-list-view {
                background: white;
                border-radius: 8px;
                padding: 15px;
            }

            /* Custom Tab Styles */
            .nav-tabs-custom {
                border-bottom: 2px solid #dee2e6;
            }

            .nav-tabs-custom .nav-link {
                border: none;
                border-bottom: 3px solid transparent;
                color: #6c757d;
                padding: 1rem 1.5rem;
                font-weight: 500;
            }

            .nav-tabs-custom .nav-link:hover {
                border-bottom-color: #adb5bd;
                color: #495057;
            }

            .nav-tabs-custom .nav-link.active {
                border-bottom-color: #0d6efd;
                color: #0d6efd;
                background: none;
            }
        </style>
    `;

    // Add styles to page
    if (!$('#fundCalendarStyles').length) {
        $('head').append(`<div id="fundCalendarStyles">${calendarStyles}</div>`);
    }

})(jQuery, window);