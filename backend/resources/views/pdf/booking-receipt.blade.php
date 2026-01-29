<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Receipt - {{ $booking['booking_number'] }}</title>
    <style>
        @page {
            margin: 30mm 25mm;  /* MAXIMUM margins: top/bottom: 30mm, left/right: 25mm */
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10.5pt;  /* Increased from 10pt */
            line-height: 1.7;  /* Increased from 1.6 */
            color: #333;
            padding: 0 15px;  /* Increased from 10px */
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #8b0000;
            padding: 15px 20px 25px 20px;  /* MUCH more padding */
            margin-bottom: 40px;  /* Increased from 30px */
        }
        
        .temple-logo {
            max-height: 60px;  /* Slightly larger logo */
            margin-bottom: 20px;  /* Increased from 15px */
        }
        
        .temple-name {
            font-size: 15pt;  /* Increased from 14pt */
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 10px;  /* Increased from 8px */
            line-height: 1.5;
            padding: 0 20px;  /* Increased from 15px */
        }
        
        .temple-name-secondary {
            font-size: 13pt;  /* Increased from 12pt */
            color: #8b0000;
            margin-bottom: 15px;  /* Increased from 12px */
            padding: 0 20px;  /* Increased from 15px */
        }
        
        .temple-contact {
            font-size: 9pt;  /* Increased from 8.5pt */
            color: #666;
            line-height: 2.2;  /* Increased from 2 */
            padding: 8px 25px 0;  /* More padding */
        }
        
        .receipt-title {
            font-size: 16pt;  /* Increased from 15pt */
            font-weight: bold;
            text-align: center;
            margin: 40px 0;  /* Increased from 30px */
            padding: 18px 0;  /* Increased from 15px */
            color: #8b0000;
            text-transform: uppercase;
            letter-spacing: 3px;  /* Increased from 2px */
            border-top: 2px solid #eee;
            border-bottom: 2px solid #eee;
        }
        
        .section {
            margin-bottom: 40px;  /* Increased from 30px */
            page-break-inside: avoid;
        }
        
        .section-header {
            background-color: #8b0000;
            color: white;
            padding: 15px 22px;  /* Increased from 12px 18px */
            font-weight: bold;
            font-size: 11.5pt;  /* Increased from 11pt */
            margin-bottom: 20px;  /* Increased from 15px */
        }
        
        .info-grid {
            display: table;
            width: 100%;
            border: 1px solid #ddd;
            margin-bottom: 8px;
        }
        
        .info-row {
            display: table-row;
        }
        
        .info-cell {
            display: table-cell;
            padding: 15px 22px;  /* Increased from 12px 18px */
            border-bottom: 1px solid #eee;
            font-size: 10pt;  /* Increased from 9.5pt */
        }
        
        .info-label {
            font-weight: bold;
            color: #555;
            width: 35%;  /* Increased from 32% */
            background-color: #f5f5f5;
        }
        
        .info-value {
            color: #333;
            width: 65%;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;  /* Increased from 9.5pt */
            border: 1px solid #ddd;
        }
        
        .items-table thead {
            background-color: #8b0000;
            color: white;
        }
        
        .items-table th {
            padding: 16px 15px;  /* Increased from 14px 12px */
            text-align: left;
            font-weight: bold;
            border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        .items-table th:last-child {
            border-right: none;
        }
        
        .items-table td {
            padding: 16px 15px;  /* Increased from 14px 12px */
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #eee;
            vertical-align: top;
            line-height: 1.6;
        }
        
        .items-table td:last-child {
            border-right: none;
        }
        
        .items-table tbody tr:nth-child(even) {
            background-color: #fafafa;
        }
        
        .addon-row {
            background-color: #fff9e6 !important;
        }
        
        .addon-indicator {
            color: #ff9800;
            font-weight: bold;
            margin-right: 6px;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .amount-summary {
            width: 60%;  /* Increased from 58% */
            margin-left: auto;
            margin-top: 40px;  /* Increased from 30px */
            margin-right: 0;
            border: 2px solid #8b0000;
        }
        
        .amount-row {
            display: table;
            width: 100%;
        }
        
        .amount-row > div {
            display: table-cell;
            padding: 15px 22px;  /* Increased from 12px 18px */
        }
        
        .amount-label {
            font-weight: bold;
            text-align: right;
            width: 50%;
            background-color: #f5f5f5;
            font-size: 10.5pt;
        }
        
        .amount-value {
            text-align: right;
            font-weight: bold;
            width: 50%;
            font-size: 10.5pt;
        }
        
        .total-row {
            background-color: #8b0000;
            color: white;
        }
        
        .total-row .amount-label,
        .total-row .amount-value {
            background-color: transparent;
            color: white;
            font-size: 13pt;  /* Increased from 12pt */
            padding: 20px;  /* Increased from 18px */
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 14px;  /* Increased from 5px 12px */
            border-radius: 4px;
            font-size: 9pt;  /* Increased from 8.5pt */
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-confirmed {
            background-color: #28a745;
            color: white;
        }
        
        .status-pending {
            background-color: #ffc107;
            color: #333;
        }
        
        .status-completed {
            background-color: #17a2b8;
            color: white;
        }
        
        .status-cancelled {
            background-color: #dc3545;
            color: white;
        }
        
        .payment-full, .payment-paid {
            background-color: #28a745;
            color: white;
        }
        
        .payment-partial {
            background-color: #ff9800;
            color: white;
        }
        
        .payment-pending {
            background-color: #6c757d;
            color: white;
        }
        
        .item-secondary {
            font-size: 9pt;  /* Increased from 8.5pt */
            color: #666;
            margin-top: 4px;
            line-height: 1.5;
        }
        
        .item-code {
            font-size: 8pt;  /* Increased from 7.5pt */
            color: #999;
            font-style: italic;
            margin-top: 3px;
        }
        
        .deity-info {
            font-size: 9pt;  /* Increased from 8.5pt */
            color: #666;
            font-style: italic;
            margin-top: 5px;
            line-height: 1.5;
        }
        
        .special-note {
            background-color: #fff9e6;
            border-left: 5px solid #ff9800;  /* Thicker border */
            padding: 22px;  /* Increased from 18px */
            margin: 30px 0;  /* Increased from 25px */
            font-size: 10pt;  /* Increased from 9.5pt */
            line-height: 1.8;
        }
        
        .footer {
            margin-top: 50px;  /* Increased from 40px */
            padding-top: 30px;  /* Increased from 25px */
            border-top: 2px solid #ddd;
            text-align: center;
            font-size: 9pt;  /* Increased from 8.5pt */
            color: #666;
            line-height: 2.2;
        }
        
        .footer-note {
            margin-top: 18px;  /* Increased from 15px */
            font-style: italic;
        }
        
        .balance-due {
            color: #dc3545;
        }
        
        .amount-paid {
            color: #28a745;
        }
        
        .discount-amount {
            color: #28a745;
        }
        
        /* QR Code Section */
        .qr-section {
            text-align: center;
            padding: 25px;
            background-color: #f9f9f9;
            border: 2px dashed #8b0000;
            margin: 30px 0;
        }
        
        .qr-code-image {
            max-width: 180px;
            max-height: 180px;
            margin: 15px auto;
        }
        
        .qr-instruction {
            font-size: 9pt;
            color: #666;
            margin-top: 10px;
        }
        
        /* Seat Assignment Section */
        .seat-section {
            background-color: #fff9e6;
            border-left: 5px solid #ff9800;
            padding: 20px;
            margin: 25px 0;
        }
        
        .seat-header {
            font-size: 12pt;
            font-weight: bold;
            color: #8b0000;
            margin-bottom: 15px;
        }
        
        .seat-details {
            font-size: 11pt;
            line-height: 1.8;
        }
        
        .seat-location {
            font-size: 13pt;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
        }
        
        .last-updated {
            font-size: 8.5pt;
            color: #666;
            font-style: italic;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px dashed #ddd;
        }
        
        .relocated-badge {
            display: inline-block;
            background-color: #ff9800;
            color: white;
            padding: 4px 10px;
            border-radius: 3px;
            font-size: 8pt;
            font-weight: bold;
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <!-- Header Section -->
    <div class="header">
  
        
        <div class="temple-name">{{ $temple['temple_name'] }}</div>
        
        @if(!empty($temple['temple_name_chinese']))
            <div class="temple-name-secondary">{{ $temple['temple_name_chinese'] }}</div>
        @endif
        
        <div class="temple-contact">
            @if(!empty($temple['address']))
                {{ $temple['address'] }}<br>
            @endif
            @if(!empty($temple['phone']))
                Tel: {{ $temple['phone'] }}
            @endif
            @if(!empty($temple['email']))
                | Email: {{ $temple['email'] }}
            @endif
            @if(!empty($temple['website']))
                | {{ $temple['website'] }}
            @endif
        </div>
    </div>

    <!-- Receipt Title -->
    <div class="receipt-title">Booking Receipt</div>

    <!-- Booking Information Section -->
    <div class="section">
        <div class="section-header">Booking Information</div>
        <div class="info-grid">
            <div class="info-row">
                <div class="info-cell info-label">Receipt Number:</div>
                <div class="info-cell info-value"><strong style="font-size: 11.5pt;">{{ $booking['booking_number'] }}</strong></div>
            </div>
            <div class="info-row">
                <div class="info-cell info-label">Booking Date:</div>
                <div class="info-cell info-value">{{ \Carbon\Carbon::parse($booking['booking_date'])->format('d F Y') }}</div>
            </div>
            <div class="info-row">
                <div class="info-cell info-label">Booking Type:</div>
                <div class="info-cell info-value">{{ $booking['booking_type_display'] }}</div>
            </div>
            <div class="info-row">
                <div class="info-cell info-label">Booking Status:</div>
                <div class="info-cell info-value">
                    <span class="status-badge status-{{ strtolower($booking['booking_status']) }}">
                        {{ $booking['booking_status_display'] }}
                    </span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-cell info-label">Payment Status:</div>
                <div class="info-cell info-value">
                    <span class="status-badge payment-{{ strtolower($booking['payment_status']) }}">
                        {{ $booking['payment_status_display'] }}
                    </span>
                </div>
            </div>
            <div class="info-row">
                <div class="info-cell info-label">Created:</div>
                <div class="info-cell info-value">{{ \Carbon\Carbon::parse($booking['created_at'])->format('d F Y, h:i A') }}</div>
            </div>
        </div>
    </div>

    <!-- Devotee Information -->
    @if(!empty($booking['devotee']))
    <div class="section">
        <div class="section-header">Customer Information</div>
        <div class="info-grid">
            @if(!empty($booking['devotee']['name']))
            <div class="info-row">
                <div class="info-cell info-label">Name:</div>
                <div class="info-cell info-value">
                    <strong>{{ $booking['devotee']['name'] }}</strong>
                    @if(!empty($booking['devotee']['name_chinese']))
                        <span style="color: #666; margin-left: 12px;">{{ $booking['devotee']['name_chinese'] }}</span>
                    @endif
                </div>
            </div>
            @endif
            
            @if(!empty($booking['devotee']['nric']))
            <div class="info-row">
                <div class="info-cell info-label">NRIC / ID:</div>
                <div class="info-cell info-value">{{ $booking['devotee']['nric'] }}</div>
            </div>
            @endif
            
            @if(!empty($booking['devotee']['phone']))
            <div class="info-row">
                <div class="info-cell info-label">Contact Number:</div>
                <div class="info-cell info-value">{{ $booking['devotee']['phone'] }}</div>
            </div>
            @endif
            
            @if(!empty($booking['devotee']['email']))
            <div class="info-row">
                <div class="info-cell info-label">Email:</div>
                <div class="info-cell info-value">{{ $booking['devotee']['email'] }}</div>
            </div>
            @endif
        </div>
    </div>
    @endif

    <!-- Seat Assignment Section (for Special Occasions) -->
    @if(!empty($booking['seat_assignment']))
    <div class="seat-section">
        <div class="seat-header">
            📍 Seat Assignment
            @if(!empty($booking['seat_assignment']['relocated']))
                <span class="relocated-badge">RELOCATED</span>
            @endif
        </div>
        <div class="seat-details">
            @if(!empty($booking['seat_assignment']['table_number']))
                <strong>Table:</strong> {{ $booking['seat_assignment']['table_number'] }}<br>
            @endif
            @if(!empty($booking['seat_assignment']['row_number']) && !empty($booking['seat_assignment']['column_number']))
                <strong>Position:</strong> Row {{ $booking['seat_assignment']['row_number'] }}, Column {{ $booking['seat_assignment']['column_number'] }}<br>
            @endif
            @if(!empty($booking['seat_assignment']['seat_number']))
                <strong>Seat Number:</strong> 
                <span class="seat-location">{{ $booking['seat_assignment']['seat_number'] }}</span>
            @endif
        </div>
        @if(!empty($booking['seat_assignment']['last_updated']))
        <div class="last-updated">
            ⏱️ Last Updated: {{ \Carbon\Carbon::parse($booking['seat_assignment']['last_updated'])->format('d F Y, h:i A') }}
            @if(!empty($booking['seat_assignment']['updated_by']))
                by {{ $booking['seat_assignment']['updated_by'] }}
            @endif
        </div>
        @endif
    </div>
    @endif

    <!-- QR Code Section -->
    @if(!empty($qr_code))
    <div class="qr-section">
        <div style="font-size: 11pt; font-weight: bold; color: #8b0000; margin-bottom: 10px;">
            📱 Scan to Verify Booking
        </div>
        <img src="{{ $qr_code }}" alt="Booking QR Code" class="qr-code-image" />
        <div class="qr-instruction">
            Scan this QR code to view current booking details and seat assignment.<br>
            The QR code always shows the latest information, even after relocations.
        </div>
    </div>
    @endif

    <!-- Booking Items Section -->
    <div class="section">
        <div class="section-header">Booking Items ({{ $booking['item_count'] }} item{{ $booking['item_count'] > 1 ? 's' : '' }})</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 38%;">Item Description</th>
                    <th style="width: 22%;">Type / Deity</th>
                    <th style="width: 10%;" class="text-center">Quantity</th>
                    <th style="width: 12%;" class="text-right">Unit Price<br>({{ $currency }})</th>
                    <th style="width: 13%;" class="text-right">Total<br>({{ $currency }})</th>
                </tr>
            </thead>
            <tbody>
                @foreach($booking['items'] as $index => $item)
                <tr class="{{ $item['is_addon'] ? 'addon-row' : '' }}">
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>
                        @if($item['is_addon'])
                            <span class="addon-indicator">+</span>
                        @endif
                        <strong>{{ $item['name'] }}</strong>
                        @if(!empty($item['name_secondary']))
                            <div class="item-secondary">{{ $item['name_secondary'] }}</div>
                        @endif
                        @if(!empty($item['short_code']))
                            <div class="item-code">Code: {{ $item['short_code'] }}</div>
                        @endif
                    </td>
                    <td>
                        <div><strong>{{ $item['type'] }}</strong></div>
                        @if(!empty($item['deity']))
                            <div class="deity-info">
                                {{ $item['deity']['name'] }}
                                @if(!empty($item['deity']['name_secondary']))
                                    <br>{{ $item['deity']['name_secondary'] }}
                                @endif
                            </div>
                        @endif
                    </td>
                    <td class="text-center"><strong>{{ number_format($item['quantity']) }}</strong></td>
                    <td class="text-right">{{ number_format($item['unit_price'], 2) }}</td>
                    <td class="text-right"><strong>{{ number_format($item['total_price'], 2) }}</strong></td>
                </tr>
                @endforeach
            </tbody>
        </table>
        
        @if(collect($booking['items'])->where('is_addon', true)->count() > 0)
        <div style="margin-top: 12px; font-size: 9pt; color: #666;">
            <span class="addon-indicator">+</span> Indicates add-on items
        </div>
        @endif
    </div>

    <!-- Payment History -->
    @if(!empty($booking['payments']) && count($booking['payments']) > 0)
    <div class="section">
        <div class="section-header">Payment History ({{ count($booking['payments']) }} payment{{ count($booking['payments']) > 1 ? 's' : '' }})</div>
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th style="width: 22%;">Reference</th>
                    <th style="width: 22%;">Payment Mode</th>
                    <th style="width: 20%;">Date & Time</th>
                    <th style="width: 18%;" class="text-right">Amount ({{ $currency }})</th>
                    <th style="width: 10%;" class="text-center">Status</th>
                </tr>
            </thead>
            <tbody>
                @foreach($booking['payments'] as $index => $payment)
                <tr>
                    <td class="text-center">{{ $index + 1 }}</td>
                    <td>{{ $payment['reference'] ?? '-' }}</td>
                    <td><strong>{{ $payment['payment_mode'] ?? $payment['method'] }}</strong></td>
                    <td>{{ \Carbon\Carbon::parse($payment['date'])->format('d/m/Y h:i A') }}</td>
                    <td class="text-right"><strong>{{ number_format($payment['amount'], 2) }}</strong></td>
                    <td class="text-center">
                        <span class="status-badge payment-{{ strtolower($payment['status']) }}">
                            {{ $payment['status'] }}
                        </span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <!-- Amount Summary -->
    <div class="amount-summary">
        <div class="amount-row">
            <div class="amount-label">Subtotal:</div>
            <div class="amount-value">{{ $currency }} {{ number_format($booking['amounts']['subtotal'], 2) }}</div>
        </div>
        
        @if($booking['amounts']['discount'] > 0)
        <div class="amount-row">
            <div class="amount-label">Discount:</div>
            <div class="amount-value discount-amount">- {{ $currency }} {{ number_format($booking['amounts']['discount'], 2) }}</div>
        </div>
        @endif
        
        @if($booking['amounts']['tax'] > 0)
        <div class="amount-row">
            <div class="amount-label">Tax:</div>
            <div class="amount-value">{{ $currency }} {{ number_format($booking['amounts']['tax'], 2) }}</div>
        </div>
        @endif
        
        <div class="amount-row total-row">
            <div class="amount-label">TOTAL AMOUNT:</div>
            <div class="amount-value">{{ $currency }} {{ number_format($booking['amounts']['total'], 2) }}</div>
        </div>
        
        <div class="amount-row">
            <div class="amount-label">Paid Amount:</div>
            <div class="amount-value amount-paid">{{ $currency }} {{ number_format($booking['amounts']['paid'], 2) }}</div>
        </div>
        
        @if($booking['amounts']['balance'] > 0)
        <div class="amount-row">
            <div class="amount-label">Balance Due:</div>
            <div class="amount-value balance-due">{{ $currency }} {{ number_format($booking['amounts']['balance'], 2) }}</div>
        </div>
        @endif
    </div>

    <!-- Special Instructions -->
    @if(!empty($booking['special_instructions']))
    <div class="special-note">
        <strong>Special Instructions:</strong><br>
        {{ $booking['special_instructions'] }}
    </div>
    @endif

    <!-- Footer -->
    <div class="footer">
        <div>This is a computer-generated receipt and does not require a signature.</div>
        <div style="margin-top: 10px;">Generated on: <strong>{{ $generated_at }}</strong></div>
        @if(!empty($booking['updated_at']) && $booking['updated_at'] != $booking['created_at'])
        <div style="margin-top: 5px; font-size: 8.5pt; color: #999;">
            Receipt last updated: {{ \Carbon\Carbon::parse($booking['updated_at'])->format('d F Y, h:i A') }}
        </div>
        @endif
        <div class="footer-note">
            Thank you for your support!<br>
            &copy; {{ date('Y') }} {{ $temple['temple_name'] }}. All rights reserved.
        </div>
    </div>
</body>
</html>