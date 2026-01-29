<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking History Report</title>
    <style>
        @page {
            margin: 10mm;
            size: A4 landscape;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 8pt;
            line-height: 1.3;
            color: #333;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #d4af37;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        
        .temple-name {
            font-size: 14pt;
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 3px;
        }
        
        .temple-name-chinese {
            font-size: 12pt;
            color: #8b0000;
            margin-bottom: 3px;
        }
        
        .temple-details {
            font-size: 7pt;
            color: #666;
            margin-bottom: 5px;
        }
        
        .report-title {
            font-size: 13pt;
            font-weight: bold;
            color: #d4af37;
            margin-top: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .filters {
            background: #f9f9f9;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 7pt;
        }
        
        .filter-row {
            margin-bottom: 3px;
        }
        
        .filter-label {
            font-weight: bold;
            color: #666;
        }
        
        .summary {
            background: #fff9e6;
            padding: 8px;
            margin-bottom: 10px;
            border: 2px solid #d4af37;
            border-radius: 3px;
        }
        
        .summary-grid {
            display: table;
            width: 100%;
        }
        
        .summary-item {
            display: table-cell;
            width: 25%;
            padding: 4px;
            text-align: center;
        }
        
        .summary-label {
            font-size: 7pt;
            color: #666;
            margin-bottom: 2px;
        }
        
        .summary-value {
            font-size: 10pt;
            font-weight: bold;
            color: #8b0000;
        }
        
        .bookings-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7pt;
            margin-top: 8px;
        }
        
        .bookings-table th {
            background-color: #8b0000;
            color: white;
            padding: 5px 3px;
            text-align: left;
            font-weight: bold;
            border-right: 1px solid #600000;
        }
        
        .bookings-table th:last-child {
            border-right: none;
        }
        
        .bookings-table td {
            padding: 4px 3px;
            border-bottom: 1px solid #ddd;
            vertical-align: middle;
        }
        
        .bookings-table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
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
        
        .status-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 2px;
            font-size: 6pt;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-confirmed {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-completed {
            background-color: #d1ecf1;
            color: #0c5460;
        }
        
        .status-cancelled {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .status-paid, .status-full {
            background-color: #d4edda;
            color: #155724;
        }
        
        .status-partial {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .type-badge {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 2px;
            font-size: 6pt;
            font-weight: bold;
            background-color: #e9ecef;
            color: #495057;
        }
        
        .amount {
            font-weight: 600;
        }
        
        .amount-positive {
            color: #155724;
        }
        
        .amount-negative {
            color: #721c24;
        }
        
        .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #d4af37;
            font-size: 6pt;
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
    </style>
</head>
<body>
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
        </div>
        
        @if(!empty($filters['booking_type']) || !empty($filters['status']) || !empty($filters['payment_status']))
            <div class="filter-row">
                @if(!empty($filters['booking_type']))
                    <span style="margin-right: 15px;">
                        <span class="filter-label">Type:</span> {{ $filters['booking_type'] }}
                    </span>
                @endif
                
                @if(!empty($filters['status']))
                    <span style="margin-right: 15px;">
                        <span class="filter-label">Status:</span> {{ $filters['status'] }}
                    </span>
                @endif
                
                @if(!empty($filters['payment_status']))
                    <span>
                        <span class="filter-label">Payment:</span> {{ $filters['payment_status'] }}
                    </span>
                @endif
            </div>
        @endif
    </div>

    <!-- Summary Statistics -->
    <div class="summary">
        <div class="summary-grid">
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
                <div class="summary-value {{ $summary['total_balance'] > 0 ? 'amount-negative' : 'amount-positive' }}">
                    {{ $currency }} {{ number_format($summary['total_balance'], 2) }}
                </div>
            </div>
        </div>
    </div>

    <!-- Bookings Table -->
    <table class="bookings-table">
        <thead>
            <tr>
                <th style="width: 10%;">Receipt No.</th>
                <th style="width: 7%;">Date</th>
                <th style="width: 9%;">Type</th>
                <th style="width: 14%;">Customer</th>
                <th style="width: 6%;" class="text-right">Items</th>
                <th style="width: 10%;" class="text-right">Amount</th>
                <th style="width: 10%;" class="text-right">Paid</th>
                <th style="width: 10%;" class="text-right">Balance</th>
                <th style="width: 12%;" class="text-center">Status</th>
                <th style="width: 12%;" class="text-center">Payment</th>
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
                <td colspan="10" class="text-center" style="padding: 15px; color: #999;">
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
                <div style="margin-top: 5px; font-style: italic;">
                    This is a computer-generated report.<br>
                    No signature is required.
                </div>
            </div>
        </div>
    </div>
</body>
</html>