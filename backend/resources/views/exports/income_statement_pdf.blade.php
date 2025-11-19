{{-- resources/views/exports/income_statement_pdf.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Income Statement</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 11px;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
        }
        
        .header h1 {
            margin: 0;
            font-size: 18px;
            color: #212529;
        }
        
        .header h2 {
            margin: 5px 0;
            font-size: 14px;
            color: #495057;
        }
        
        .header p {
            margin: 5px 0;
            color: #6c757d;
            font-size: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        th, td {
            padding: 6px 8px;
            text-align: left;
            border: 1px solid #dee2e6;
        }
        
        th {
            background-color: #e9ecef;
            font-weight: bold;
            font-size: 11px;
        }
        
        .section-header {
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 12px;
        }
        
        .section-revenue { background-color: #d4edda; }
        .section-direct-cost { background-color: #fff3cd; }
        .section-income { background-color: #d1ecf1; }
        .section-expense { background-color: #f8d7da; }
        .section-tax { background-color: #f8f9fa; }
        
        .item-row td:first-child {
            padding-left: 25px;
        }
        
        .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
        }
        
        .total-row td {
            text-align: right;
        }
        
        .total-row td:first-child {
            text-align: right;
            padding-right: 20px;
        }
        
        .summary-row {
            background-color: #e2e3e5;
            font-weight: bold;
        }
        
        .final-total {
            background-color: #343a40;
            color: white;
            font-weight: bold;
            font-size: 13px;
        }
        
        .amount {
            text-align: right;
            width: 20%;
        }
        
        .account-code {
            color: #6c757d;
            font-size: 10px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .footer {
            margin-top: 30px;
            padding: 10px;
            background-color: #343a40;
            color: white;
            text-align: center;
            font-size: 13px;
        }
        
        @if($displayType == 'monthly')
        .monthly-table {
            font-size: 9px;
        }
        
        .monthly-table th {
            font-size: 10px;
            text-align: center;
            background-color: #e9ecef;
            font-weight: bold;
        }
        
        .monthly-table td {
            text-align: right;
            padding: 4px 6px;
        }
        
        .monthly-table td:first-child {
            text-align: left;
            width: 30%;
            min-width: 200px;
        }
        
        .monthly-table .section-header td {
            text-align: left;
            font-weight: bold;
            font-size: 10px;
        }
        
        .monthly-table .item-row td:first-child {
            padding-left: 20px;
        }
        
        .monthly-table .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
        }
        
        .monthly-table .total-row td:first-child {
            text-align: right;
            padding-right: 10px;
        }
        
        .monthly-table .summary-row {
            background-color: #e2e3e5;
            font-weight: bold;
        }
        
        .monthly-table .final-total {
            background-color: #343a40;
            color: white;
            font-weight: bold;
            font-size: 11px;
        }
        @endif
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $temple->temple_name ?? 'Temple Management System' }}</h1>
        <h2>Income Statement {{ $displayType == 'monthly' ? '(Monthly View)' : '' }}</h2>
        <p>Period: {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}</p>
        @if($fund)
        <p>Fund: {{ $fund->name }}</p>
        @endif
    </div>
    
    @if($displayType == 'full')
    {{-- Full View Layout --}}
    <table>
        <thead>
            <tr>
                <th style="width: 75%;">Account Name</th>
                <th class="amount">Amount ({{ $temple->currency ?? 'MYR' }})</th>
            </tr>
        </thead>
        <tbody>
            {{-- Revenue Section --}}
            <tr class="section-header section-revenue">
                <td colspan="2">Revenue</td>
            </tr>
            @if(isset($data['revenue']['items']) && count($data['revenue']['items']) > 0)
                @foreach($data['revenue']['items'] as $item)
                <tr class="item-row">
                    <td>
                        <span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}
                    </td>
                    <td class="amount">{{ number_format($item['balance'], 2) }}</td>
                </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="2" style="text-align: center; color: #6c757d;">No revenue items</td>
                </tr>
            @endif
            <tr class="total-row">
                <td>Total Revenue</td>
                <td class="amount">{{ number_format($data['revenue']['total'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Direct Cost Section --}}
            @if(isset($data['direct_cost']['total']) && $data['direct_cost']['total'] > 0)
            <tr class="section-header section-direct-cost">
                <td colspan="2">Direct Cost</td>
            </tr>
            @if(isset($data['direct_cost']['items']) && count($data['direct_cost']['items']) > 0)
                @foreach($data['direct_cost']['items'] as $item)
                <tr class="item-row">
                    <td>
                        <span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}
                    </td>
                    <td class="amount">{{ number_format($item['balance'], 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Direct Cost</td>
                <td class="amount">{{ number_format($data['direct_cost']['total'] ?? 0, 2) }}</td>
            </tr>
            @endif
            
            {{-- Gross Surplus --}}
            <tr class="summary-row">
                <td>Gross Surplus/Deficit</td>
                <td class="amount">{{ number_format($data['gross_surplus'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Other Income Section --}}
            @if(isset($data['other_income']['total']) && $data['other_income']['total'] > 0)
            <tr class="section-header section-income">
                <td colspan="2">Incomes</td>
            </tr>
            @if(isset($data['other_income']['items']) && count($data['other_income']['items']) > 0)
                @foreach($data['other_income']['items'] as $item)
                <tr class="item-row">
                    <td>
                        <span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}
                    </td>
                    <td class="amount">{{ number_format($item['balance'], 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Incomes</td>
                <td class="amount">{{ number_format($data['other_income']['total'] ?? 0, 2) }}</td>
            </tr>
            @endif
            
            {{-- Expenses Section --}}
            <tr class="section-header section-expense">
                <td colspan="2">Expenses</td>
            </tr>
            @if(isset($data['expenses']['items']) && count($data['expenses']['items']) > 0)
                @foreach($data['expenses']['items'] as $item)
                <tr class="item-row">
                    <td>
                        <span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}
                    </td>
                    <td class="amount">{{ number_format($item['balance'], 2) }}</td>
                </tr>
                @endforeach
            @else
                <tr>
                    <td colspan="2" style="text-align: center; color: #6c757d;">No expense items</td>
                </tr>
            @endif
            <tr class="total-row">
                <td>Total Expenses</td>
                <td class="amount">{{ number_format($data['expenses']['total'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Surplus Before Tax --}}
            <tr class="summary-row">
                <td>Surplus/Deficit Before Taxation</td>
                <td class="amount">{{ number_format($data['surplus_before_tax'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Taxation Section --}}
            @if(isset($data['taxation']['total']) && $data['taxation']['total'] > 0)
            <tr class="section-header section-tax">
                <td colspan="2">Taxation</td>
            </tr>
            @if(isset($data['taxation']['items']) && count($data['taxation']['items']) > 0)
                @foreach($data['taxation']['items'] as $item)
                <tr class="item-row">
                    <td>
                        <span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}
                    </td>
                    <td class="amount">{{ number_format($item['balance'], 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Taxation</td>
                <td class="amount">{{ number_format($data['taxation']['total'] ?? 0, 2) }}</td>
            </tr>
            @endif
            
            {{-- Surplus After Tax --}}
            <tr class="summary-row">
                <td>Surplus/Deficit After Taxation</td>
                <td class="amount">{{ number_format($data['surplus_after_tax'] ?? 0, 2) }}</td>
            </tr>
        </tbody>
    </table>
    
    @else
    {{-- Monthly View Layout --}}
    <table class="monthly-table">
        <thead>
            <tr>
                <th>Account Name</th>
                @foreach($data['months'] as $month)
                <th>{{ $month['label'] }}</th>
                @endforeach
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            {{-- Revenue Section --}}
            <tr class="section-header section-revenue">
                <td colspan="{{ count($data['months']) + 2 }}">Revenue</td>
            </tr>
            @if(isset($data['item_wise_data']['revenue']) && count($data['item_wise_data']['revenue']) > 0)
                @foreach($data['item_wise_data']['revenue'] as $item)
                <tr class="item-row">
                    <td><span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}</td>
                    @foreach($data['months'] as $month)
                    <td>{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                    @endforeach
                    <td style="font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Revenue</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['revenue'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['revenue'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Direct Cost Section --}}
            <tr class="section-header section-direct-cost">
                <td colspan="{{ count($data['months']) + 2 }}">Direct Cost</td>
            </tr>
            @if(isset($data['item_wise_data']['direct_cost']) && count($data['item_wise_data']['direct_cost']) > 0)
                @foreach($data['item_wise_data']['direct_cost'] as $item)
                <tr class="item-row">
                    <td><span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}</td>
                    @foreach($data['months'] as $month)
                    <td>{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                    @endforeach
                    <td style="font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Direct Cost</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['direct_cost'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['direct_cost'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Gross Surplus/Deficit --}}
            <tr class="summary-row">
                <td>Gross Surplus/Deficit</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['gross_surplus'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['gross_surplus'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Incomes Section --}}
            <tr class="section-header section-income">
                <td colspan="{{ count($data['months']) + 2 }}">Incomes</td>
            </tr>
            @if(isset($data['item_wise_data']['other_income']) && count($data['item_wise_data']['other_income']) > 0)
                @foreach($data['item_wise_data']['other_income'] as $item)
                <tr class="item-row">
                    <td><span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}</td>
                    @foreach($data['months'] as $month)
                    <td>{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                    @endforeach
                    <td style="font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Incomes</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['other_income'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['other_income'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Expenses Section --}}
            <tr class="section-header section-expense">
                <td colspan="{{ count($data['months']) + 2 }}">Expenses</td>
            </tr>
            @if(isset($data['item_wise_data']['expenses']) && count($data['item_wise_data']['expenses']) > 0)
                @foreach($data['item_wise_data']['expenses'] as $item)
                <tr class="item-row">
                    <td><span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}</td>
                    @foreach($data['months'] as $month)
                    <td>{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                    @endforeach
                    <td style="font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Expenses</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['expenses'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['expenses'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Surplus/Deficit Before Taxation --}}
            <tr class="summary-row">
                <td>Surplus/Deficit Before Taxation</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['surplus_before_tax'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['surplus_before_tax'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Taxation Section --}}
            <tr class="section-header section-tax">
                <td colspan="{{ count($data['months']) + 2 }}">Taxation</td>
            </tr>
            @if(isset($data['item_wise_data']['taxation']) && count($data['item_wise_data']['taxation']) > 0)
                @foreach($data['item_wise_data']['taxation'] as $item)
                <tr class="item-row">
                    <td><span class="account-code">({{ $item['code'] }})</span> {{ $item['name'] }}</td>
                    @foreach($data['months'] as $month)
                    <td>{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                    @endforeach
                    <td style="font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
                </tr>
                @endforeach
            @endif
            <tr class="total-row">
                <td>Total Taxation</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['taxation'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['taxation'] ?? 0, 2) }}</td>
            </tr>
            
            {{-- Final Total Row - Total Profit Amount --}}
            <tr class="summary-row" style="{{ ($data['totals']['surplus_after_tax'] ?? 0) >= 0 ? 'background-color: #d4edda;' : 'background-color: #f8d7da;' }}">
                <td>Total Profit Amount</td>
                @foreach($data['months'] as $month)
                <td>{{ number_format($data['monthly_summary'][$month['key']]['surplus_after_tax'] ?? 0, 2) }}</td>
                @endforeach
                <td>{{ number_format($data['totals']['surplus_after_tax'] ?? 0, 2) }}</td>
            </tr>
        </tbody>
    </table>
    @endif
    
    <div class="footer">
        <strong>Total Profit Amount is {{ $temple->currency ?? 'MYR' }} {{ number_format($data['net_profit'] ?? $data['totals']['surplus_after_tax'] ?? 0, 2) }}</strong>
    </div>
</body>
</html>