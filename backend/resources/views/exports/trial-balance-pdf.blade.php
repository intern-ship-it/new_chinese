{{-- resources/views/exports/trial-balance-pdf.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Trial Balance Report</title>
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
            line-height: 1.3;
        }
        
        .header {
            text-align: center;
            margin-bottom: 15px;
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
        
        .period-info {
            text-align: center;
            margin-bottom: 10px;
            font-size: 10pt;
            color: #555;
        }
        
        .balance-status {
            background-color: {{ $data['is_balanced'] ? '#d4edda' : '#f8d7da' }};
            color: {{ $data['is_balanced'] ? '#155724' : '#721c24' }};
            padding: 8px;
            margin-bottom: 15px;
            border-radius: 4px;
            text-align: center;
            font-weight: bold;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
        }
        
        th {
            background-color: #34495e;
            color: white;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #2c3e50;
        }
        
        th.text-right,
        td.text-right {
            text-align: right;
        }
        
        th.text-center {
            text-align: center;
        }
        
        td {
            padding: 4px;
            border: 1px solid #ddd;
        }
        
        .group-level-0 {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        
        .group-level-1 {
            background-color: #85c1e9;
            font-weight: bold;
        }
        
        .group-level-2 {
            background-color: #d6eaf8;
        }
        
        .ledger-row {
            background-color: white;
        }
        
        .ledger-row:hover {
            background-color: #f5f5f5;
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
        
        .grand-total-row {
            background-color: #f39c12;
            color: white;
            font-weight: bold;
            font-size: 10pt;
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
            margin: 10mm;
            size: landscape;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>TRIAL BALANCE REPORT</h1>
        <h2>{{ $data['temple_name'] ?? 'Temple Management System' }}</h2>
    </div>
    
    <div class="period-info">
        <strong>Period:</strong> 
        {{ date('d/m/Y', strtotime($data['from_date'])) }} to 
        {{ date('d/m/Y', strtotime($data['to_date'])) }}
    </div>
    
    <div class="balance-status">
        Trial Balance is {{ $data['is_balanced'] ? 'BALANCED' : 'NOT BALANCED' }}
        @if(!$data['is_balanced'])
            - Difference: {{ number_format(abs($data['grand_totals']['closing_debit'] - $data['grand_totals']['closing_credit']), 2) }}
        @endif
    </div>
    
    <table>
        <thead>
            <tr>
                <th rowspan="2" width="10%">Code</th>
                <th rowspan="2" width="42%">Particulars</th>
                <th colspan="2" class="text-center">Opening Balance</th>
                <th colspan="2" class="text-center">Closing Balance</th>
            </tr>
            <tr>
                <th width="12%" class="text-right">Debit</th>
                <th width="12%" class="text-right">Credit</th>
                <th width="12%" class="text-right">Debit</th>
                <th width="12%" class="text-right">Credit</th>
            </tr>
        </thead>
        <tbody>
            @if(isset($data['trial_balance']) && count($data['trial_balance']) > 0)
                @foreach($data['trial_balance'] as $group)
                    @include('exports.partials.trial-balance-group', ['group' => $group, 'level' => 0])
                @endforeach
            @endif
            
            {{-- Grand Total Row --}}
            <tr class="grand-total-row">
                <td colspan="2"><strong>GRAND TOTAL</strong></td>
                <td class="text-right">
                    <strong>{{ number_format($data['grand_totals']['opening_debit'], 2) }}</strong>
                </td>
                <td class="text-right">
                    <strong>{{ number_format($data['grand_totals']['opening_credit'], 2) }}</strong>
                </td>
                <td class="text-right">
                    <strong>{{ number_format($data['grand_totals']['closing_debit'], 2) }}</strong>
                </td>
                <td class="text-right">
                    <strong>{{ number_format($data['grand_totals']['closing_credit'], 2) }}</strong>
                </td>
            </tr>
        </tbody>
    </table>
    
    <div class="footer">
        <div class="timestamp">
            Generated on: {{ date('d/m/Y h:i A') }}
        </div>
    </div>
</body>
</html>