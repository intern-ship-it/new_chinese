{{-- resources/views/exports/balance-sheet-pdf.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Balance Sheet Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 9pt;
            color: #333;
            line-height: 1.4;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        
        .header h1 {
            font-size: 16pt;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .header h2 {
            font-size: 12pt;
            color: #34495e;
            font-weight: normal;
        }
        
        .date-info {
            text-align: center;
            margin-bottom: 15px;
            font-size: 11pt;
            color: #555;
        }
        
        .balance-sheet-container {
            width: 100%;
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        .section-header {
            background-color: #2c3e50;
            color: white;
            padding: 8px;
            font-weight: bold;
            font-size: 11pt;
            text-align: center;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background-color: #34495e;
            color: white;
            padding: 6px;
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
            border: 1px solid #2c3e50;
        }
        
        th.text-right,
        td.text-right {
            text-align: right;
        }
        
        td {
            padding: 5px;
            border: 1px solid #ddd;
            font-size: 9pt;
        }
        
        .group-header {
            background-color: #ecf0f1;
            font-weight: bold;
        }
        
        .sub-group {
            background-color: #f8f9fa;
        }
        
        .ledger-row {
            background-color: white;
        }
        
        .indent-1 {
            padding-left: 20px;
        }
        
        .indent-2 {
            padding-left: 40px;
        }
        
        .indent-3 {
            padding-left: 60px;
        }
        
        .total-row {
            background-color: #d6eaf8;
            font-weight: bold;
        }
        
        .grand-total-row {
            background-color: #f39c12;
            color: white;
            font-weight: bold;
            font-size: 10pt;
        }
        
        .profit-loss-row {
            background-color: #f9ebea;
            font-style: italic;
        }
        
        .negative-value {
            color: #c0392b;
        }
        
        .balance-status {
            margin-top: 15px;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            border-radius: 4px;
        }
        
        .balanced {
            background-color: #d4edda;
            color: #155724;
        }
        
        .not-balanced {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #bdc3c7;
            font-size: 8pt;
            color: #7f8c8d;
        }
        
        .footer .timestamp {
            text-align: right;
        }
        
        @page {
            margin: 15mm;
        }
    </style>
</head>
<body>
    @php
        // Helper function to format amounts with parentheses for negative values
        function formatAmount($amount, $decimals = 2) {
            if ($amount == 0) {
                return '-';
            }
            
            $absAmount = abs($amount);
            $formatted = number_format($absAmount, $decimals);
            
            return $amount < 0 ? '(' . $formatted . ')' : $formatted;
        }
    @endphp
    
    <div class="header">
        <h1>BALANCE SHEET</h1>
        <h2>{{ $data['temple_name'] ?? 'Temple Management System' }}</h2>
    </div>
    
    <div class="date-info">
        <strong>As on:</strong> {{ date('d F Y', strtotime($data['as_on_date'])) }}
    </div>
    
    <div class="balance-sheet-container">
        {{-- Assets Section --}}
        <div class="section">
            <div class="section-header">ASSETS</div>
            <table>
                <thead>
                    <tr>
                        <th width="60%">Particulars</th>
                        <th width="20%" class="text-right">Previous Year</th>
                        <th width="20%" class="text-right">Current Year</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($data['balance_sheet'] as $group)
                        @if($group['code'] == '1000')
                            @include('exports.partials.balance-sheet-group', ['group' => $group, 'level' => 0])
                        @endif
                    @endforeach
                    <tr class="total-row">
                        <td><strong>TOTAL ASSETS</strong></td>
                        <td class="text-right {{ $data['totals']['assets']['previous'] < 0 ? 'negative-value' : '' }}">
                            <strong>{{ formatAmount($data['totals']['assets']['previous']) }}</strong>
                        </td>
                        <td class="text-right {{ $data['totals']['assets']['current'] < 0 ? 'negative-value' : '' }}">
                            <strong>{{ formatAmount($data['totals']['assets']['current']) }}</strong>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        {{-- Liabilities & Equity Section --}}
        <div class="section">
            <div class="section-header">LIABILITIES & EQUITY</div>
            <table>
                <thead>
                    <tr>
                        <th width="60%">Particulars</th>
                        <th width="20%" class="text-right">Previous Year</th>
                        <th width="20%" class="text-right">Current Year</th>
                    </tr>
                </thead>
                <tbody>
                    {{-- Liabilities --}}
                    @foreach($data['balance_sheet'] as $group)
                        @if($group['code'] == '2000')
                            <tr class="group-header">
                                <td colspan="3">LIABILITIES</td>
                            </tr>
                            @include('exports.partials.balance-sheet-group', ['group' => $group, 'level' => 0])
                            <tr class="total-row">
                                <td>Total Liabilities</td>
                                <td class="text-right {{ $data['totals']['liabilities']['previous'] < 0 ? 'negative-value' : '' }}">
                                    {{ formatAmount($data['totals']['liabilities']['previous']) }}
                                </td>
                                <td class="text-right {{ $data['totals']['liabilities']['current'] < 0 ? 'negative-value' : '' }}">
                                    {{ formatAmount($data['totals']['liabilities']['current']) }}
                                </td>
                            </tr>
                        @endif
                    @endforeach
                    
                    {{-- Equity --}}
                    @foreach($data['balance_sheet'] as $group)
                        @if($group['code'] == '3000')
                            <tr class="group-header">
                                <td colspan="3">EQUITY</td>
                            </tr>
                            @include('exports.partials.balance-sheet-group', ['group' => $group, 'level' => 0])
                            
                            {{-- Current P&L if exists --}}
                            @if(isset($group['profit_loss']))
                                <tr class="profit-loss-row">
                                    <td class="indent-1">
                                        <em>{{ $group['profit_loss']['name'] }}</em>
                                    </td>
                                    <td class="text-right">-</td>
                                    <td class="text-right {{ $group['profit_loss']['current'] < 0 ? 'negative-value' : '' }}">
                                        {{ formatAmount($group['profit_loss']['current']) }}
                                    </td>
                                </tr>
                            @endif
                            
                            <tr class="total-row">
                                <td>Total Equity</td>
                                <td class="text-right {{ $data['totals']['equity']['previous'] < 0 ? 'negative-value' : '' }}">
                                    {{ formatAmount($data['totals']['equity']['previous']) }}
                                </td>
                                <td class="text-right {{ $data['totals']['equity']['current'] < 0 ? 'negative-value' : '' }}">
                                    {{ formatAmount($data['totals']['equity']['current']) }}
                                </td>
                            </tr>
                        @endif
                    @endforeach
                    
                    {{-- Grand Total --}}
                    @php
                        $totalPrevious = $data['totals']['liabilities']['previous'] + $data['totals']['equity']['previous'];
                        $totalCurrent = $data['totals']['liabilities']['current'] + $data['totals']['equity']['current'];
                    @endphp
                    <tr class="grand-total-row">
                        <td><strong>TOTAL LIABILITIES & EQUITY</strong></td>
                        <td class="text-right">
                            <strong>{{ formatAmount($totalPrevious) }}</strong>
                        </td>
                        <td class="text-right">
                            <strong>{{ formatAmount($totalCurrent) }}</strong>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        {{-- Balance Check --}}
        @php
            $totalLiabEquity = $data['totals']['liabilities']['current'] + $data['totals']['equity']['current'];
            $isBalanced = abs($data['totals']['assets']['current'] - $totalLiabEquity) < 0.01;
        @endphp
        
        <div class="balance-status {{ $isBalanced ? 'balanced' : 'not-balanced' }}">
            Balance Sheet is {{ $isBalanced ? 'BALANCED' : 'NOT BALANCED' }}
            @if(!$isBalanced)
                <br>Difference: {{ formatAmount(abs($data['totals']['assets']['current'] - $totalLiabEquity)) }}
            @endif
        </div>
    </div>
    
    <div class="footer">
        <div class="timestamp">
            Generated on: {{ date('d/m/Y h:i A') }}
        </div>
    </div>
</body>
</html>