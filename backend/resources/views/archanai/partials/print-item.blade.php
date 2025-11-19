<div class="item">
    <div class="item-name">{{ $item['item_name'] }}</div>
    
    @if(isset($item['item_name_secondary']) && $item['item_name_secondary'])
        <div class="item-details">{{ $item['item_name_secondary'] }}</div>
    @endif
    
    @if(isset($item['deity_name']) && $item['deity_name'])
        <div class="item-details">Deity: {{ $item['deity_name'] }}</div>
    @endif
    
    @if(isset($item['group_name']) && $item['group_name'])
        <div class="item-details">Group: {{ $item['group_name'] }}</div>
    @endif

    @if(isset($item['token_number']) && $item['token_number'])
        <div class="item-details">Token: {{ $item['token_number'] }}</div>
    @endif
    
    <div class="item-price">
        <span>Qty: {{ $item['quantity'] }}</span>
        <span>{{ $temple->currency }} {{ number_format($item['total_price'], 2) }}</span>
    </div>

    @if(isset($item['rasi']) && count($item['rasi']) > 0)
        <div class="rasi-section">
            <div class="rasi-title">Rasi/Natchathram:</div>
            @foreach($item['rasi'] as $rasi)
                <div class="rasi-entry">
                    • {{ $rasi['devotee_name'] }}
                    @if($rasi['rasi_name']) - {{ $rasi['rasi_name'] }} @endif
                    @if($rasi['natchathram_name']) / {{ $rasi['natchathram_name'] }} @endif
                </div>
            @endforeach
        </div>
    @endif

    @if(isset($item['vehicle']) && $item['vehicle'])
        <div class="vehicle-section">
            <strong>Vehicle:</strong> {{ $item['vehicle']['vehicle_number'] }}
            @if($item['vehicle']['vehicle_model'])
                <div>Model: {{ $item['vehicle']['vehicle_model'] }}</div>
            @endif
        </div>
    @endif
</div>