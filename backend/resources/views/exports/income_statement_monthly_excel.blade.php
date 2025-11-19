<table>
    <thead>
        <tr>
            <th colspan="{{ count($data['months']) + 2 }}" style="text-align: center; font-size: 16px;">{{ $temple->temple_name ?? 'Temple Management System' }}</th>
        </tr>
        <tr>
            <th colspan="{{ count($data['months']) + 2 }}" style="text-align: center; font-size: 14px;">Monthly Income Statement</th>
        </tr>
        <tr>
            <th colspan="{{ count($data['months']) + 2 }}" style="text-align: center;">Period: {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}</th>
        </tr>
        @if($fund)
        <tr>
            <th colspan="{{ count($data['months']) + 2 }}" style="text-align: center;">Fund: {{ $fund->name }}</th>
        </tr>
        @endif
        <tr>
            <th></th>
            @foreach($data['months'] as $month)
            <th></th>
            @endforeach
            <th></th>
        </tr>
        <tr>
            <th style="width: 300px;">Account Name</th>
            @foreach($data['months'] as $month)
            <th style="text-align: center; width: 120px;">{{ $month['label'] }}</th>
            @endforeach
            <th style="text-align: center; width: 120px;">Total</th>
        </tr>
    </thead>
    <tbody>
        {{-- Revenue Section --}}
        <tr>
            <td style="font-weight: bold; background-color: #d4edda;">Revenue</td>
            @foreach($data['months'] as $month)
            <td></td>
            @endforeach
            <td></td>
        </tr>
        @if(isset($data['item_wise_data']['revenue']) && count($data['item_wise_data']['revenue']) > 0)
            @foreach($data['item_wise_data']['revenue'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                @foreach($data['months'] as $month)
                <td style="text-align: right;">{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                @endforeach
                <td style="text-align: right; font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Revenue</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['revenue'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['revenue'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Direct Cost Section --}}
        @if(isset($data['item_wise_data']['direct_cost']) && count($data['item_wise_data']['direct_cost']) > 0)
        <tr>
            <td style="font-weight: bold; background-color: #fff3cd;">Direct Cost</td>
            @foreach($data['months'] as $month)
            <td></td>
            @endforeach
            <td></td>
        </tr>
        @foreach($data['item_wise_data']['direct_cost'] as $item)
        <tr>
            <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right;">{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
        </tr>
        @endforeach
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Direct Cost</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['direct_cost'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['direct_cost'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Gross Surplus --}}
        <tr style="background-color: #e2e3e5;">
            <td style="font-weight: bold;">Gross Surplus/Deficit</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['gross_surplus'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['gross_surplus'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Other Income Section --}}
        @if(isset($data['item_wise_data']['other_income']) && count($data['item_wise_data']['other_income']) > 0)
        <tr>
            <td style="font-weight: bold; background-color: #d1ecf1;">Incomes</td>
            @foreach($data['months'] as $month)
            <td></td>
            @endforeach
            <td></td>
        </tr>
        @foreach($data['item_wise_data']['other_income'] as $item)
        <tr>
            <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right;">{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
        </tr>
        @endforeach
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Incomes</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['other_income'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['other_income'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Expenses Section --}}
        <tr>
            <td style="font-weight: bold; background-color: #f8d7da;">Expenses</td>
            @foreach($data['months'] as $month)
            <td></td>
            @endforeach
            <td></td>
        </tr>
        @if(isset($data['item_wise_data']['expenses']) && count($data['item_wise_data']['expenses']) > 0)
            @foreach($data['item_wise_data']['expenses'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                @foreach($data['months'] as $month)
                <td style="text-align: right;">{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
                @endforeach
                <td style="text-align: right; font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Expenses</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['expenses'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['expenses'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Surplus Before Tax --}}
        <tr style="background-color: #e2e3e5;">
            <td style="font-weight: bold;">Surplus/Deficit Before Taxation</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['surplus_before_tax'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['surplus_before_tax'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Taxation Section --}}
        @if(isset($data['item_wise_data']['taxation']) && count($data['item_wise_data']['taxation']) > 0)
        <tr>
            <td style="font-weight: bold; background-color: #f8f9fa;">Taxation</td>
            @foreach($data['months'] as $month)
            <td></td>
            @endforeach
            <td></td>
        </tr>
        @foreach($data['item_wise_data']['taxation'] as $item)
        <tr>
            <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right;">{{ number_format($item['monthly_balances'][$month['key']] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($item['total'] ?? 0, 2) }}</td>
        </tr>
        @endforeach
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Taxation</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['taxation'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['taxation'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Total Profit Amount --}}
        <tr style="background-color: {{ ($data['totals']['surplus_after_tax'] ?? 0) >= 0 ? '#d4edda' : '#f8d7da' }};">
            <td style="font-weight: bold;">Total Profit Amount</td>
            @foreach($data['months'] as $month)
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['monthly_summary'][$month['key']]['surplus_after_tax'] ?? 0, 2) }}</td>
            @endforeach
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['totals']['surplus_after_tax'] ?? 0, 2) }}</td>
        </tr>
    </tbody>
</table>