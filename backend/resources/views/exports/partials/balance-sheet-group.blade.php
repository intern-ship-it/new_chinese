@php
    $indent = str_repeat('  ', $level);
    $indentClass = 'indent-' . min($level, 3);
@endphp

{{-- Add group name if not root level --}}
@if($level > 0)
    <tr class="{{ $level == 1 ? 'sub-group' : 'ledger-row' }}">
        <td class="{{ $indentClass }}">{{ $group['name'] }}</td>
        <td class="text-right {{ $group['previous_balance'] < 0 ? 'negative-value' : '' }}">
            {{ formatAmount($group['previous_balance']) }}
        </td>
        <td class="text-right {{ $group['current_balance'] < 0 ? 'negative-value' : '' }}">
            {{ formatAmount($group['current_balance']) }}
        </td>
    </tr>
@endif

{{-- Add ledgers --}}
@if(!empty($group['ledgers']))
    @foreach($group['ledgers'] as $ledger)
        <tr class="ledger-row">
            <td class="indent-{{ min($level + 1, 3) }}">{{ $ledger['name'] }}</td>
            <td class="text-right {{ $ledger['previous_balance'] < 0 ? 'negative-value' : '' }}">
                {{ formatAmount($ledger['previous_balance']) }}
            </td>
            <td class="text-right {{ $ledger['current_balance'] < 0 ? 'negative-value' : '' }}">
                {{ formatAmount($ledger['current_balance']) }}
            </td>
        </tr>
    @endforeach
@endif

{{-- Add child groups recursively --}}
@if(!empty($group['children']))
    @foreach($group['children'] as $childGroup)
        @include('exports.partials.balance-sheet-group', ['group' => $childGroup, 'level' => $level + 1])
    @endforeach
@endif