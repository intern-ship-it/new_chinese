<table>
    <thead>
        <tr>
            <th colspan="2" style="text-align: center; font-size: 16px;">{{ $temple->temple_name ?? 'Temple Management System' }}</th>
        </tr>
        <tr>
            <th colspan="2" style="text-align: center; font-size: 14px;">Income Statement</th>
        </tr>
        <tr>
            <th colspan="2" style="text-align: center;">Period: {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}</th>
        </tr>
        @if($fund)
        <tr>
            <th colspan="2" style="text-align: center;">Fund: {{ $fund->name }}</th>
        </tr>
        @endif
        <tr>
            <th></th>
            <th></th>
        </tr>
        <tr>
            <th style="width: 400px;">Account Name</th>
            <th style="width: 150px; text-align: right;">Amount ({{ $temple->currency ?? 'MYR' }})</th>
        </tr>
    </thead>
    <tbody>
        {{-- Revenue Section --}}
        <tr>
            <td style="font-weight: bold; background-color: #d4edda;">Revenue</td>
            <td></td>
        </tr>
        @if(isset($data['revenue']['items']) && count($data['revenue']['items']) > 0)
            @foreach($data['revenue']['items'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                <td style="text-align: right;">{{ number_format($item['balance'], 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Revenue</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['revenue']['total'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Direct Cost Section --}}
        @if(isset($data['direct_cost']['total']) && $data['direct_cost']['total'] > 0)
        <tr>
            <td style="font-weight: bold; background-color: #fff3cd;">Direct Cost</td>
            <td></td>
        </tr>
        @if(isset($data['direct_cost']['items']) && count($data['direct_cost']['items']) > 0)
            @foreach($data['direct_cost']['items'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                <td style="text-align: right;">{{ number_format($item['balance'], 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Direct Cost</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['direct_cost']['total'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Gross Surplus --}}
        <tr style="background-color: #e2e3e5;">
            <td style="font-weight: bold;">Gross Surplus/Deficit</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['gross_surplus'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Other Income Section --}}
        @if(isset($data['other_income']['total']) && $data['other_income']['total'] > 0)
        <tr>
            <td style="font-weight: bold; background-color: #d1ecf1;">Incomes</td>
            <td></td>
        </tr>
        @if(isset($data['other_income']['items']) && count($data['other_income']['items']) > 0)
            @foreach($data['other_income']['items'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                <td style="text-align: right;">{{ number_format($item['balance'], 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Incomes</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['other_income']['total'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Expenses Section --}}
        <tr>
            <td style="font-weight: bold; background-color: #f8d7da;">Expenses</td>
            <td></td>
        </tr>
        @if(isset($data['expenses']['items']) && count($data['expenses']['items']) > 0)
            @foreach($data['expenses']['items'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                <td style="text-align: right;">{{ number_format($item['balance'], 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Expenses</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['expenses']['total'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Surplus Before Tax --}}
        <tr style="background-color: #e2e3e5;">
            <td style="font-weight: bold;">Surplus/Deficit Before Taxation</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['surplus_before_tax'] ?? 0, 2) }}</td>
        </tr>
        
        {{-- Taxation Section --}}
        @if(isset($data['taxation']['total']) && $data['taxation']['total'] > 0)
        <tr>
            <td style="font-weight: bold; background-color: #f8f9fa;">Taxation</td>
            <td></td>
        </tr>
        @if(isset($data['taxation']['items']) && count($data['taxation']['items']) > 0)
            @foreach($data['taxation']['items'] as $item)
            <tr>
                <td style="padding-left: 20px;">({{ $item['code'] }}) {{ $item['name'] }}</td>
                <td style="text-align: right;">{{ number_format($item['balance'], 2) }}</td>
            </tr>
            @endforeach
        @endif
        <tr>
            <td style="text-align: right; font-weight: bold;">Total Taxation</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['taxation']['total'] ?? 0, 2) }}</td>
        </tr>
        @endif
        
        {{-- Surplus After Tax --}}
        <tr style="background-color: {{ ($data['surplus_after_tax'] ?? 0) >= 0 ? '#d4edda' : '#f8d7da' }};">
            <td style="font-weight: bold;">Surplus/Deficit After Taxation</td>
            <td style="text-align: right; font-weight: bold;">{{ number_format($data['surplus_after_tax'] ?? 0, 2) }}</td>
        </tr>
        
        <tr>
            <td></td>
            <td></td>
        </tr>
        
        {{-- Final Total --}}
        <tr style="background-color: #343a40; color: white;">
            <td style="font-weight: bold; text-align: center;">Total Profit Amount</td>
            <td style="text-align: right; font-weight: bold;">{{ $temple->currency ?? 'MYR' }} {{ number_format($data['net_profit'] ?? 0, 2) }}</td>
        </tr>
    </tbody>
</table>