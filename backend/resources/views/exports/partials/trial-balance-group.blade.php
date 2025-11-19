{{-- resources/views/exports/partials/trial-balance-group.blade.php --}}
{{-- Group Header Row --}}
<tr class="group-level-{{ $level }}">
    <td><strong>{{ $group['code'] }}</strong></td>
    <td class="indent-{{ $level }}">
        <strong>{{ $group['name'] }}</strong>
    </td>
    <td class="text-right">
        <strong>{{ number_format($group['total_opening_debit'], 2) }}</strong>
    </td>
    <td class="text-right">
        <strong>{{ number_format($group['total_opening_credit'], 2) }}</strong>
    </td>
    <td class="text-right">
        <strong>{{ number_format($group['total_closing_debit'], 2) }}</strong>
    </td>
    <td class="text-right">
        <strong>{{ number_format($group['total_closing_credit'], 2) }}</strong>
    </td>
</tr>

{{-- Ledgers --}}
@if(isset($group['ledgers']) && count($group['ledgers']) > 0)
    @foreach($group['ledgers'] as $ledger)
        <tr class="ledger-row">
            <td>{{ $ledger['code'] }}</td>
            <td class="indent-{{ $level + 1 }}">
                {{ $ledger['name'] }}
            </td>
            <td class="text-right">
                {{ $ledger['opening_debit'] > 0 ? number_format($ledger['opening_debit'], 2) : '-' }}
            </td>
            <td class="text-right">
                {{ $ledger['opening_credit'] > 0 ? number_format($ledger['opening_credit'], 2) : '-' }}
            </td>
            <td class="text-right">
                {{ $ledger['closing_debit'] > 0 ? number_format($ledger['closing_debit'], 2) : '-' }}
            </td>
            <td class="text-right">
                {{ $ledger['closing_credit'] > 0 ? number_format($ledger['closing_credit'], 2) : '-' }}
            </td>
        </tr>
    @endforeach
@endif

{{-- Child Groups --}}
@if(isset($group['children']) && count($group['children']) > 0)
    @foreach($group['children'] as $childGroup)
        @include('exports.partials.trial-balance-group', ['group' => $childGroup, 'level' => $level + 1])
    @endforeach
@endif