<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking History Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', 'Arial', sans-serif;
            font-size: 9px;
            line-height: 1.3;
            color: #333;
            padding: 15px;
        }
        
        .report-container {
            max-width: 100%;
            margin: 0 auto;
        }
        
        /* Header Section */
        .header {
            text-align: center;
            border-bottom: 3px solid #d4af37;
            padding-bottom: 12px;
            margin-bottom: 15px;
        }
        
        .logo-section {
            margin-bottom: 8px;
        }
        
        .logo-section img {
            max-height: 50px;
            width: auto;
        }
        
        .temple-name {
            font-size: 16px;
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 3px;
        }
        
        .temple-name-chinese {
            font-size: 14px;
            color: #8b0000;
            margin-bottom: 3px;
        }
        
        .temple-details {
            font-size: 8px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #d4af37;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Filter Section */
        .filters {
            background: linear-gradient(to bottom, #f9f9f9, #ffffff);
            padding: 8px 10px;
            margin-bottom: 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .filter-row {
            margin-bottom: 3px;
        }
        
        .filter-item {
            display: inline-block;
            margin-right: 20px;
            font-size: 8px;
        }
        
        .filter-label {
            font-weight: bold;
            color: #666;
        }
        
        .filter-value {
            color: #333;
        }
        
        /* Summary Section */
        .summary {
            background: linear-gradient(to bottom, #fff9e6, #fffef9);
            padding: 10px;
            margin-bottom: 12px;
            border: 2px solid #d4af37;
            border-radius: 4px;
        }
        
        .summary-grid {
            display: table;
            width: 100%;
        }
        
        .summary-row {
            display: table-row;
        }
        
        .summary-item {
            display: table-cell;
            width: 25%;
            padding: 4px;
            text-align: center;
        }
        
        .summary-label {
            font-size: 8px;
            color: #666;
            margin-bottom: 3px;
        }
        
        .summary-value {
            font-size: 11px;
            font-weight: bold;
            color: #8b0000;
        }
        
        /* Bookings Table */
        .bookings-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            margin-top: 10px;
        }
        
        .bookings-table th {
            background-color: #8b0000;
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            border-right: 1px solid #600000;
        }
        
        .bookings-table th:last-child {
            border-right: none;
        }
        
        .bookings-table td {
            padding: 5px 4px;
            border-bottom: 1px solid #ddd;
            vertical-align: middle;
        }
        
        .bookings-table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .bookings-table tbody tr:hover {
            background-color: #fff9e6;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-nowrap {
            white-space: nowrap;
        }
        
        /* Status Badges */
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-confirmed { 
            background-color: #d4edda; 
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-pending { 
            background-color: #fff3cd; 
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        .status-completed { 
            background-color: #d1ecf1; 
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .status-cancelled { 
            background-color: #f8d7da; 
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .status-paid, .status-full { 
            background-color: #d4edda; 
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .status-partial { 
            background-color: #fff3cd; 
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        
        /* Booking Type Badge */
        .type-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
            background-color: #e9ecef;
            color: #495057;
            border: 1px solid #dee2e6;
        }
        
        /* Amount Styling */
        .amount {
            font-weight: 600;
            color: #2d3436;
        }
        
        .amount-positive {
            color: #155724;
        }
        
        .amount-negative {
            color: #721c24;
        }
        
        /* Footer */
        .footer {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 2px solid #d4af37;
            font-size: 7px;
            color: #666;
        }
        
        .footer-grid {
            display: table;
            width: 100%;
        }
        
        .footer-left, .footer-right {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        
        .footer-right {
            text-align: right;
        }
        
        .footer-signature {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
            text-align: center;
        }
        
        /* Page Break */
        .page-break {
            page-break-after: always;
        }
        
        /* Print Styles */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Header -->
        <div class="header">
    
            
            <div class="temple-name">{{ $temple['temple_name'] ?? 'Temple Management System' }}</div>
            
            @if(!empty($temple['temple_name_chinese']))
                <div class="temple-name-chinese">{{ $temple['temple_name_chinese'] }}</div>
            @endif
            
            @if(!empty($temple['address']))
                <div class="temple-details">{{ $temple['address'] }}</div>
            @endif
            
            @if(!empty($temple['phone']) || !empty($temple['email']))
                <div class="temple-details">
                    @if(!empty($temple['phone']))
                        Tel: {{ $temple['phone'] }}
                    @endif
                    @if(!empty($temple['email']))
                        | Email: {{ $temple['email'] }}
                    @endif
                </div>
            @endif
            
            <div class="report-title">Booking History Report</div>
        </div>

        <!-- Filters Applied -->
        <div class="filters">
            <div class="filter-row">
                <span class="filter-label">Report Period:</span>
                <span class="filter-value">
                    @if($filters['from_date'])
                        {{ \Carbon\Carbon::parse($filters['from_date'])->format('d/m/Y') }}
                    @else
                        All Time
                    @endif
                    to 
                    @if($filters['to_date'])
                        {{ \Carbon\Carbon::parse($filters['to_date'])->format('d/m/Y') }}
                    @else
                        Present
                    @endif
                </span>
            </div>
            
            @if(!empty($filters['booking_type']) || !empty($filters['status']) || !empty($filters['payment_status']))
                <div class="filter-row">
                    @if(!empty($filters['booking_type']))
                        <span class="filter-item">
                            <span class="filter-label">Type:</span>
                            <span class="filter-value">{{ $filters['booking_type'] }}</span>
                        </span>
                    @endif
                    
                    @if(!empty($filters['status']))
                        <span class="filter-item">
                            <span class="filter-label">Booking Status:</span>
                            <span class="filter-value">{{ $filters['status'] }}</span>
                        </span>
                    @endif
                    
                    @if(!empty($filters['payment_status']))
                        <span class="filter-item">
                            <span class="filter-label">Payment Status:</span>
                            <span class="filter-value">{{ $filters['payment_status'] }}</span>
                        </span>
                    @endif
                </div>
            @endif
        </div>

        <!-- Summary Statistics -->
        <div class="summary">
            <div class="summary-grid">
                <div class="summary-row">
                    <div class="summary-item">
                        <div class="summary-label">Total Bookings</div>
                        <div class="summary-value">{{ number_format($summary['total_bookings']) }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Amount</div>
                        <div class="summary-value">{{ $currency }} {{ number_format($summary['total_amount'], 2) }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Paid</div>
                        <div class="summary-value">{{ $currency }} {{ number_format($summary['total_paid'], 2) }}</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">Total Balance</div>
                        <div class="summary-value 
                            {{ $summary['total_balance'] > 0 ? 'amount-negative' : 'amount-positive' }}">
                            {{ $currency }} {{ number_format($summary['total_balance'], 2) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bookings Table -->
        <table class="bookings-table">
            <thead>
                <tr>
                    <th style="width: 10%;">Receipt No.</th>
                    <th style="width: 8%;">Date</th>
                    <th style="width: 10%;">Type</th>
                    <th style="width: 15%;">Customer</th>
                    <th style="width: 8%;" class="text-right">Items</th>
                    <th style="width: 10%;" class="text-right">Amount</th>
                    <th style="width: 10%;" class="text-right">Paid</th>
                    <th style="width: 10%;" class="text-right">Balance</th>
                    <th style="width: 10%;" class="text-center">Status</th>
                    <th style="width: 9%;" class="text-center">Payment</th>
                </tr>
            </thead>
            <tbody>
                @forelse($bookings as $booking)
                <tr>
                    <td class="text-nowrap">
                        <strong>{{ $booking['booking_number'] }}</strong>
                    </td>
                    <td class="text-nowrap">
                        {{ \Carbon\Carbon::parse($booking['booking_date'])->format('d/m/Y') }}
                    </td>
                    <td>
                        <span class="type-badge">{{ $booking['booking_type_display'] }}</span>
                    </td>
                    <td>
                        {{ $booking['devotee']['name'] ?? 'N/A' }}
                        @if(!empty($booking['devotee']['phone']))
                            <br><small style="color: #666;">{{ $booking['devotee']['phone'] }}</small>
                        @endif
                    </td>
                    <td class="text-right">
                        {{ $booking['item_count'] ?? 0 }}
                    </td>
                    <td class="text-right amount">
                        {{ $currency }} {{ number_format($booking['amounts']['total'], 2) }}
                    </td>
                    <td class="text-right amount amount-positive">
                        {{ $currency }} {{ number_format($booking['amounts']['paid'], 2) }}
                    </td>
                    <td class="text-right amount {{ $booking['amounts']['balance'] > 0 ? 'amount-negative' : '' }}">
                        {{ $currency }} {{ number_format($booking['amounts']['balance'], 2) }}
                    </td>
                    <td class="text-center">
                        <span class="status-badge status-{{ strtolower($booking['booking_status']) }}">
                            {{ $booking['booking_status_display'] }}
                        </span>
                    </td>
                    <td class="text-center">
                        <span class="status-badge status-{{ strtolower($booking['payment_status']) }}">
                            {{ $booking['payment_status_display'] }}
                        </span>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="10" class="text-center" style="padding: 20px; color: #999;">
                        No bookings found for the selected criteria
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-grid">
                <div class="footer-left">
                    <div><strong>Report Generated:</strong> {{ $generated_at }}</div>
                    <div><strong>Generated By:</strong> {{ $user['name'] }} ({{ $user['email'] }})</div>
                    @if(!empty($temple['website']))
                        <div><strong>Website:</strong> {{ $temple['website'] }}</div>
                    @endif
                </div>
                <div class="footer-right">
                    <div><strong>Total Records:</strong> {{ count($bookings) }}</div>
                    <div style="margin-top: 8px; font-style: italic;">
                        This is a computer-generated report.<br>
                        No signature is required.
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>