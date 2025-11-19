<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cash Flow Report</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
        }
        .header p {
            margin: 5px 0;
            font-size: 12px;
            color: #666;
        }
        .summary-box {
            background-color: #f8f9fa;
            border: 2px solid #333;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 30px;
        }
        .summary-grid {
            display: table;
            width: 100%;
        }
        .summary-item {
            display: table-cell;
            text-align: center;
            padding: 10px;
            border-right: 1px solid #ddd;
        }
        .summary-item:last-child {
            border-right: none;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        .positive {
            color: #28a745;
        }
        .negative {
            color: #dc3545;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-header {
            background-color: #f0f0f0;
            padding: 10px;
            margin-bottom: 15px;
            border-left: 4px solid #333;
        }
        .section-header h3 {
            margin: 0;
            font-size: 14px;
        }
        .inflow-header {
            border-left-color: #28a745;
            background-color: #e7f5e7;
        }
        .outflow-header {
            border-left-color: #dc3545;
            background-color: #fde7e7;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 10px;
        }
        td {
            font-size: 10px;
        }
        .text-right {
            text-align: right !important;
        }
        .text-center {
            text-align: center !important;
        }
        .amount {
            text-align: right;
            font-family: 'Courier New', monospace;
        }
        .category-row {
            background-color: #f9f9f9;
            font-weight: bold;
        }
        .total-row {
            background-color: #e8f4f8;
            font-weight: bold;
        }
        .grand-total-row {
            background-color: #333;
            color: white;
            font-weight: bold;
        }
        .two-column {
            width: 48%;
            float: left;
            margin-right: 2%;
        }
        .two-column:last-child {
            margin-right: 0;
            float: right;
        }
        .clear {
            clear: both;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CASH FLOW STATEMENT</h1>
        <p><strong>Period:</strong> {{ date('d M Y', strtotime($data['from_date'])) }} to {{ date('d M Y', strtotime($data['to_date'])) }}</p>
        @if(isset($data['active_year']))
        <p><strong>Accounting Year:</strong> {{ $data['active_year']['from'] }} to {{ $data['active_year']['to'] }}</p>
        @endif
    </div>

    <!-- Summary Box -->
    <div class="summary-box">
        <table style="width: 100%; border: none;">
            <tr>
                <td class="text-center" style="border: none; padding: 10px;">
                    <div class="summary-label">Opening Cash</div>
                    <div class="summary-value">{{ number_format($data['summary']['opening_cash'], 2) }}</div>
                </td>
                <td class="text-center" style="border: none; padding: 10px;">
                    <div class="summary-label">Total Inflows</div>
                    <div class="summary-value positive">{{ number_format($data['summary']['total_inflows'], 2) }}</div>
                </td>
                <td class="text-center" style="border: none; padding: 10px;">
                    <div class="summary-label">Total Outflows</div>
                    <div class="summary-value negative">{{ number_format($data['summary']['total_outflows'], 2) }}</div>
                </td>
                <td class="text-center" style="border: none; padding: 10px;">
                    <div class="summary-label">Net Cash Flow</div>
                    <div class="summary-value {{ $data['summary']['net_cash_flow'] >= 0 ? 'positive' : 'negative' }}">
                        {{ number_format($data['summary']['net_cash_flow'], 2) }}
                    </div>
                </td>
                <td class="text-center" style="border: none; padding: 10px;">
                    <div class="summary-label">Closing Cash</div>
                    <div class="summary-value">{{ number_format($data['summary']['closing_cash'], 2) }}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Cash Flows by Category -->
    <div class="two-column">
        <div class="section">
            <div class="section-header inflow-header">
                <h3>CASH INFLOWS</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th width="60%">Category</th>
                        <th width="25%" class="text-right">Amount</th>
                        <th width="15%" class="text-right">%</th>
                    </tr>
                </thead>
                <tbody>
                    @php $totalInflows = $data['summary']['total_inflows']; @endphp
                    @foreach($data['cash_flows']['inflows'] as $key => $category)
                        @if($category['amount'] > 0)
                        <tr>
                            <td>{{ $category['name'] }}</td>
                            <td class="amount">{{ number_format($category['amount'], 2) }}</td>
                            <td class="text-right">
                                {{ $totalInflows > 0 ? number_format(($category['amount'] / $totalInflows) * 100, 1) : '0.0' }}%
                            </td>
                        </tr>
                        @endif
                    @endforeach
                    <tr class="total-row">
                        <td><strong>Total Inflows</strong></td>
                        <td class="amount"><strong>{{ number_format($totalInflows, 2) }}</strong></td>
                        <td class="text-right"><strong>100.0%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="two-column">
        <div class="section">
            <div class="section-header outflow-header">
                <h3>CASH OUTFLOWS</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th width="60%">Category</th>
                        <th width="25%" class="text-right">Amount</th>
                        <th width="15%" class="text-right">%</th>
                    </tr>
                </thead>
                <tbody>
                    @php $totalOutflows = $data['summary']['total_outflows']; @endphp
                    @foreach($data['cash_flows']['outflows'] as $key => $category)
                        @if($category['amount'] > 0)
                        <tr>
                            <td>{{ $category['name'] }}</td>
                            <td class="amount">{{ number_format($category['amount'], 2) }}</td>
                            <td class="text-right">
                                {{ $totalOutflows > 0 ? number_format(($category['amount'] / $totalOutflows) * 100, 1) : '0.0' }}%
                            </td>
                        </tr>
                        @endif
                    @endforeach
                    <tr class="total-row">
                        <td><strong>Total Outflows</strong></td>
                        <td class="amount"><strong>{{ number_format($totalOutflows, 2) }}</strong></td>
                        <td class="text-right"><strong>100.0%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="clear"></div>

    <!-- Detailed Transactions (if needed) -->
    <div class="page-break"></div>
    
    <div class="section">
        <div class="section-header">
            <h3>DETAILED TRANSACTIONS</h3>
        </div>
        
        <!-- Inflow Details -->
        <h4 style="color: #28a745;">Cash Inflows - Details</h4>
        @foreach($data['cash_flows']['inflows'] as $key => $category)
            @if(count($category['transactions']) > 0)
            <p style="margin-top: 15px;"><strong>{{ $category['name'] }}</strong></p>
            <table>
                <thead>
                    <tr>
                        <th width="12%">Date</th>
                        <th width="15%">Entry Code</th>
                        <th width="25%">Ledger</th>
                        <th width="33%">Narration</th>
                        <th width="15%" class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($category['transactions'] as $transaction)
                    <tr>
                        <td>{{ date('d-m-Y', strtotime($transaction['date'])) }}</td>
                        <td>{{ $transaction['code'] }}</td>
                        <td>{{ $transaction['ledger'] }}</td>
                        <td>{{ $transaction['narration'] ?? '-' }}</td>
                        <td class="amount">{{ number_format($transaction['amount'], 2) }}</td>
                    </tr>
                    @endforeach
                    <tr class="category-row">
                        <td colspan="4"><strong>Subtotal: {{ $category['name'] }}</strong></td>
                        <td class="amount"><strong>{{ number_format($category['amount'], 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
            @endif
        @endforeach
        
        <!-- Outflow Details -->
        <h4 style="color: #dc3545; margin-top: 20px;">Cash Outflows - Details</h4>
        @foreach($data['cash_flows']['outflows'] as $key => $category)
            @if(count($category['transactions']) > 0)
            <p style="margin-top: 15px;"><strong>{{ $category['name'] }}</strong></p>
            <table>
                <thead>
                    <tr>
                        <th width="12%">Date</th>
                        <th width="15%">Entry Code</th>
                        <th width="25%">Ledger</th>
                        <th width="33%">Narration</th>
                        <th width="15%" class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($category['transactions'] as $transaction)
                    <tr>
                        <td>{{ date('d-m-Y', strtotime($transaction['date'])) }}</td>
                        <td>{{ $transaction['code'] }}</td>
                        <td>{{ $transaction['ledger'] }}</td>
                        <td>{{ $transaction['narration'] ?? '-' }}</td>
                        <td class="amount">{{ number_format($transaction['amount'], 2) }}</td>
                    </tr>
                    @endforeach
                    <tr class="category-row">
                        <td colspan="4"><strong>Subtotal: {{ $category['name'] }}</strong></td>
                        <td class="amount"><strong>{{ number_format($category['amount'], 2) }}</strong></td>
                    </tr>
                </tbody>
            </table>
            @endif
        @endforeach
    </div>

    <div class="footer">
        <p>Generated on: {{ date('d M Y h:i A') }}</p>
        <p>Cash Flow Report - Temple Management System</p>
    </div>
</body>
</html>