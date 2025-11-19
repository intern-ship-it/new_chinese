{{-- resources/views/exports/general-ledger-pdf.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>General Ledger Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10pt;
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
            font-size: 18pt;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .header h2 {
            font-size: 14pt;
            color: #34495e;
            font-weight: normal;
        }
        
        .period-info {
            text-align: center;
            margin-bottom: 15px;
            font-size: 11pt;
            color: #555;
        }
        
        .ledger-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        
        .ledger-header {
            background-color: #ecf0f1;
            padding: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #3498db;
        }
        
        .ledger-header h3 {
            font-size: 12pt;
            color: #2c3e50;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        
        th {
            background-color: #34495e;
            color: white;
            padding: 8px 5px;
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
        }
        
        th.text-right,
        td.text-right {
            text-align: right;
        }
        
        th.text-center,
        td.text-center {
            text-align: center;
        }
        
        td {
            padding: 6px 5px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 9pt;
        }
        
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .balance-row {
            font-weight: bold;
            background-color: #ecf0f1 !important;
        }
        
        .opening-balance {
            background-color: #d5e8f7 !important;
        }
        
        .closing-balance {
            background-color: #d4edda !important;
        }
        
        .no-transactions {
            text-align: center;
            padding: 20px;
            color: #7f8c8d;
            font-style: italic;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #bdc3c7;
            font-size: 8pt;
            color: #7f8c8d;
        }
        
        .footer .timestamp {
            text-align: right;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        @page {
            margin: 15mm;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GENERAL LEDGER REPORT</h1>
        <h2>{{ $data['temple_name'] ?? 'Temple Management System' }}</h2>
    </div>
    
    <div class="period-info">
        <strong>Period:</strong> 
        {{ date('d/m/Y', strtotime($data['from_date'])) }} to 
        {{ date('d/m/Y', strtotime($data['to_date'])) }}
    </div>
    
    @if(isset($data['ledger_reports']) && count($data['ledger_reports']) > 0)
        @foreach($data['ledger_reports'] as $index => $report)
            <div class="ledger-section {{ $index > 0 && $index % 2 == 0 ? 'page-break' : '' }}">
                <div class="ledger-header">
                    <h3>{{ $report['ledger']['name'] }} ({{ $report['ledger']['code'] }})</h3>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th width="12%">Date</th>
                            <th width="15%">Entry Code</th>
                            <th width="33%">Narration</th>
                            <th width="13%" class="text-right">Debit</th>
                            <th width="13%" class="text-right">Credit</th>
                            <th width="14%" class="text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{-- Opening Balance --}}
                        <tr class="balance-row opening-balance">
                            <td colspan="3"><strong>Opening Balance</strong></td>
                            <td class="text-right">
                                <strong>{{ number_format($report['opening_balance']['debit'], 2) }}</strong>
                            </td>
                            <td class="text-right">
                                <strong>{{ number_format($report['opening_balance']['credit'], 2) }}</strong>
                            </td>
                            <td class="text-right">
                                <strong>
                                    {{ number_format(abs($report['opening_balance']['debit'] - $report['opening_balance']['credit']), 2) }}
                                    {{ $report['opening_balance']['debit'] >= $report['opening_balance']['credit'] ? 'Dr' : 'Cr' }}
                                </strong>
                            </td>
                        </tr>
                        
                        {{-- Transactions --}}
                        @if(count($report['transactions']) > 0)
                            @foreach($report['transactions'] as $transaction)
                                <tr>
                                    <td>{{ date('d/m/Y', strtotime($transaction['date'])) }}</td>
                                    <td>{{ $transaction['entry_code'] ?? '-' }}</td>
                                    <td>{{ $transaction['narration'] ?? '-' }}</td>
                                    <td class="text-right">
                                        {{ $transaction['debit'] > 0 ? number_format($transaction['debit'], 2) : '-' }}
                                    </td>
                                    <td class="text-right">
                                        {{ $transaction['credit'] > 0 ? number_format($transaction['credit'], 2) : '-' }}
                                    </td>
                                    <td class="text-right">
                                        {{ number_format($transaction['running_balance'], 2) }}
                                        {{ $transaction['balance_type'] }}
                                    </td>
                                </tr>
                            @endforeach
                        @else
                            <tr>
                                <td colspan="6" class="no-transactions">
                                    No transactions in this period
                                </td>
                            </tr>
                        @endif
                        
                        {{-- Closing Balance --}}
                        <tr class="balance-row closing-balance">
                            <td colspan="3"><strong>Closing Balance</strong></td>
                            <td class="text-right">
                                <strong>{{ number_format($report['closing_balance']['debit'], 2) }}</strong>
                            </td>
                            <td class="text-right">
                                <strong>{{ number_format($report['closing_balance']['credit'], 2) }}</strong>
                            </td>
                            <td class="text-right">
                                <strong>
                                    {{ number_format(abs($report['closing_balance']['debit'] - $report['closing_balance']['credit']), 2) }}
                                    {{ $report['closing_balance']['debit'] >= $report['closing_balance']['credit'] ? 'Dr' : 'Cr' }}
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        @endforeach
    @else
        <div class="no-transactions">
            <p>No ledger data available for the selected period.</p>
        </div>
    @endif
    
    <div class="footer">
        <div class="timestamp">
            Generated on: {{ date('d/m/Y h:i A') }}
        </div>
    </div>
</body>
</html>