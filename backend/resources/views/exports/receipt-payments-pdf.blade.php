<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt & Payments Report</title>
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
        .account-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .account-header {
            background-color: #f0f0f0;
            padding: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #333;
        }
        .account-header h3 {
            margin: 0;
            font-size: 14px;
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
        .total-row {
            background-color: #e8f4f8;
            font-weight: bold;
        }
        .grand-total {
            background-color: #333;
            color: white;
        }
        .summary-table {
            margin-top: 30px;
            border: 2px solid #333;
        }
        .summary-table th {
            background-color: #333;
            color: white;
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
        <h1>RECEIPT & PAYMENTS STATEMENT</h1>
        <p><strong>Period:</strong> {{ date('d M Y', strtotime($data['from_date'])) }} to {{ date('d M Y', strtotime($data['to_date'])) }}</p>
        @if(isset($data['active_year']))
        <p><strong>Accounting Year:</strong> {{ $data['active_year']['from'] }} to {{ $data['active_year']['to'] }}</p>
        @endif
    </div>

    @foreach($data['accounts'] as $account)
    <div class="account-section">
        <div class="account-header">
            <h3>{{ $account['account']['name'] }} ({{ $account['account']['code'] }})</h3>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th width="10%">Date</th>
                    <th width="12%">Entry Code</th>
                    <th width="20%">Party</th>
                    <th width="23%">Narration</th>
                    <th width="8%" class="text-right">Receipts</th>
                    <th width="8%" class="text-right">Payments</th>
                    <th width="8%" class="text-right">Contra In</th>
                    <th width="8%" class="text-right">Contra Out</th>
                    <th width="10%" class="text-right">Balance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="4"><strong>Opening Balance</strong></td>
                    <td colspan="4"></td>
                    <td class="amount"><strong>{{ number_format($account['opening_balance'], 2) }}</strong></td>
                </tr>
                
                @php
                $runningBalance = $account['opening_balance'];
                $allTransactions = [];
                
                // Combine all transactions
                foreach($account['receipts'] as $r) {
                    $allTransactions[] = [
                        'date' => $r->date,
                        'code' => $r->entry_code,
                        'party' => $r->paid_to,
                        'narration' => $r->narration,
                        'type' => 'receipt',
                        'amount' => $r->amount
                    ];
                }
                
                foreach($account['payments'] as $p) {
                    $allTransactions[] = [
                        'date' => $p->date,
                        'code' => $p->entry_code,
                        'party' => $p->paid_to,
                        'narration' => $p->narration,
                        'type' => 'payment',
                        'amount' => $p->amount
                    ];
                }
                
                foreach($account['contra_in'] as $c) {
                    $allTransactions[] = [
                        'date' => $c->date,
                        'code' => $c->entry_code,
                        'party' => 'Transfer In',
                        'narration' => $c->narration,
                        'type' => 'contra_in',
                        'amount' => $c->amount
                    ];
                }
                
                foreach($account['contra_out'] as $c) {
                    $allTransactions[] = [
                        'date' => $c->date,
                        'code' => $c->entry_code,
                        'party' => 'Transfer Out',
                        'narration' => $c->narration,
                        'type' => 'contra_out',
                        'amount' => $c->amount
                    ];
                }
                
                // Sort by date
                usort($allTransactions, function($a, $b) {
                    return strtotime($a['date']) - strtotime($b['date']);
                });
                @endphp
                
                @foreach($allTransactions as $t)
                @php
                    if($t['type'] === 'receipt') $runningBalance += $t['amount'];
                    elseif($t['type'] === 'payment') $runningBalance -= $t['amount'];
                    elseif($t['type'] === 'contra_in') $runningBalance += $t['amount'];
                    elseif($t['type'] === 'contra_out') $runningBalance -= $t['amount'];
                @endphp
                <tr>
                    <td>{{ date('d-m-Y', strtotime($t['date'])) }}</td>
                    <td>{{ $t['code'] }}</td>
                    <td>{{ $t['party'] ?? '-' }}</td>
                    <td>{{ $t['narration'] ?? '-' }}</td>
                    <td class="amount">{{ $t['type'] === 'receipt' ? number_format($t['amount'], 2) : '-' }}</td>
                    <td class="amount">{{ $t['type'] === 'payment' ? number_format($t['amount'], 2) : '-' }}</td>
                    <td class="amount">{{ $t['type'] === 'contra_in' ? number_format($t['amount'], 2) : '-' }}</td>
                    <td class="amount">{{ $t['type'] === 'contra_out' ? number_format($t['amount'], 2) : '-' }}</td>
                    <td class="amount">{{ number_format($runningBalance, 2) }}</td>
                </tr>
                @endforeach
                
                <tr class="total-row">
                    <td colspan="4"><strong>TOTAL</strong></td>
                    <td class="amount"><strong>{{ number_format($account['total_receipts'], 2) }}</strong></td>
                    <td class="amount"><strong>{{ number_format($account['total_payments'], 2) }}</strong></td>
                    <td class="amount"><strong>{{ number_format($account['total_contra_in'], 2) }}</strong></td>
                    <td class="amount"><strong>{{ number_format($account['total_contra_out'], 2) }}</strong></td>
                    <td class="amount"><strong>{{ number_format($account['closing_balance'], 2) }}</strong></td>
                </tr>
            </tbody>
        </table>
    </div>
    @endforeach

    <!-- Summary Table -->
    <table class="summary-table">
        <thead>
            <tr>
                <th colspan="2" class="text-center">GRAND SUMMARY</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td width="70%"><strong>Total Opening Balance</strong></td>
                <td class="amount">{{ number_format($data['grand_totals']['opening_balance'], 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total Receipts</strong></td>
                <td class="amount">{{ number_format($data['grand_totals']['total_receipts'], 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total Payments</strong></td>
                <td class="amount">{{ number_format($data['grand_totals']['total_payments'], 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total Contra In</strong></td>
                <td class="amount">{{ number_format($data['grand_totals']['total_contra_in'], 2) }}</td>
            </tr>
            <tr>
                <td><strong>Total Contra Out</strong></td>
                <td class="amount">{{ number_format($data['grand_totals']['total_contra_out'], 2) }}</td>
            </tr>
            <tr class="grand-total">
                <td><strong>TOTAL CLOSING BALANCE</strong></td>
                <td class="amount"><strong>{{ number_format($data['grand_totals']['closing_balance'], 2) }}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <p>Generated on: {{ date('d M Y h:i A') }}</p>
        <p>Receipt & Payments Report - Temple Management System</p>
    </div>
</body>
</html>