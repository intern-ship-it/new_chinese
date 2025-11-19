<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Stock Movements Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.3;
            color: #333;
            margin: 0;
            padding: 20px;
        }

        .header-container {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            padding: 15px;
        }

        .header-content {
            display: table;
            width: 100%;
        }

        .logo-section {
            display: table-cell;
            vertical-align: middle;
            width: 150px;
            padding-right: 20px;
        }

        .temple-logo {
            width: 130px;
            height: 130px;
            object-fit: contain;
            display: block;
        }

        .info-section {
            display: table-cell;
            vertical-align: middle;
            padding-left: 20px;
        }

        .temple-name {
            font-size: 22px;
            font-weight: bold;
            color: #ff00ff;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .temple-details {
            font-size: 11px;
            line-height: 1.6;
            color: #333;
        }

        .temple-details div {
            margin-bottom: 2px;
        }

        .report-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #333;
            padding: 10px 0;
            margin: 20px 0;
            letter-spacing: 1px;
        }

        .filters-section {
            background: #f5f5f5;
            padding: 8px;
            margin-bottom: 15px;
            border-left: 3px solid #337ab7;
        }

        .filters-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .filter-item {
            display: inline-block;
            margin-right: 15px;
            margin-bottom: 3px;
        }

        .filter-label {
            font-weight: bold;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .data-table th {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            font-size: 9px;
        }

        .data-table td {
            border: 1px solid #ddd;
            padding: 4px 4px;
            font-size: 9px;
        }

        .data-table tr:nth-child(even) {
            background: #fafafa;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .badge-in {
            background: #28a745;
            color: white;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 8px;
        }

        .badge-out {
            background: #dc3545;
            color: white;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 8px;
        }

        .footer {
            position: fixed;
            bottom: 0;
            width: 100%;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 5px;
            background: white;
        }

        .page-break {
            page-break-after: always;
        }
    </style>
</head>

<body>
    <!-- Header -->
    <div class="header-container">
        <div class="header-content">
            <div class="logo-section">
                @if(!empty($templeSettings['temple_logo']))
                <img src="{{ $templeSettings['temple_logo'] }}" class="temple-logo" alt="Temple Logo">
                @else
                <div style="width:130px;height:130px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#f5f5f5;">
                    <span style="font-size:10px;color:#666;">TEMPLE<br>LOGO</span>
                </div>
                @endif
            </div>
            <div class="info-section">
                <div class="temple-name">{{ $templeSettings['temple_name'] ?? 'Temple Name' }}</div>
                <div class="temple-details">
                    <div>{{ $templeSettings['temple_address'] ?? 'Temple Address' }}</div>
                    <div>
                        @if(!empty($templeSettings['temple_city']))
                        {{ $templeSettings['temple_city'] }},
                        @endif
                        {{ $templeSettings['temple_state'] ?? 'State' }} {{ $templeSettings['temple_pincode'] ?? '' }}
                    </div>
                    <div>{{ $templeSettings['temple_country'] ?? 'Malaysia' }}</div>
                    @if(!empty($templeSettings['temple_phone']))
                    <div><strong>Tel:</strong> {{ $templeSettings['temple_phone'] }}</div>
                    @endif
                    @if(!empty($templeSettings['temple_email']))
                    <div><strong>E-mail:</strong> {{ $templeSettings['temple_email'] }}</div>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <!-- Report Title -->
    <div class="report-title">Stock Movements Report</div>

    <!-- Filters Section (if you want to show applied filters) -->
    @if(!empty($appliedFilters) && count($appliedFilters) > 0)
    <div class="filters-section">
        <div class="filters-title">Applied Filters:</div>
        @if(!empty($appliedFilters['from_date']))
        <div class="filter-item">
            <span class="filter-label">From Date:</span> {{ $appliedFilters['from_date'] }}
        </div>
        @endif
        @if(!empty($appliedFilters['to_date']))
        <div class="filter-item">
            <span class="filter-label">To Date:</span> {{ $appliedFilters['to_date'] }}
        </div>
        @endif
        @if(!empty($appliedFilters['product_name']))
        <div class="filter-item">
            <span class="filter-label">Product:</span> {{ $appliedFilters['product_name'] }}
        </div>
        @endif
        @if(!empty($appliedFilters['warehouse_name']))
        <div class="filter-item">
            <span class="filter-label">Warehouse:</span> {{ $appliedFilters['warehouse_name'] }}
        </div>
        @endif
        @if(!empty($appliedFilters['movement_type']))
        <div class="filter-item">
            <span class="filter-label">Type:</span> {{ $appliedFilters['movement_type'] }}
        </div>
        @endif
    </div>
    @endif

    <!-- Data Table -->
    <table class="data-table">
        <thead>
            <tr>
                <th width="8%">Date/Time</th>
                <th width="8%">Movement #</th>
                <th width="5%">Type</th>
                <th width="12%">Product</th>
                <th width="7%">Product Type</th>
                <th width="10%">Warehouse</th>
                <th width="6%" class="text-right">Quantity</th>
                <th width="6%" class="text-right">Unit Cost</th>
                <th width="7%" class="text-right">Total Cost</th>
                <th width="8%">Batch #</th>
                <th width="8%">Reference</th>
                <th width="10%">Created By</th>
            </tr>
        </thead>
        <tbody>
            @forelse($movements as $movement)
            <tr>
                <td>{{ $movement->created_at->format('d-m-Y H:i') }}</td>
                <td>{{ $movement->movement_number ?? '-' }}</td>
                <td class="text-center">
                    <span class="badge-{{ strtolower($movement->movement_type) }}">
                        {{ $movement->movement_type }}
                    </span>
                </td>
                <td>
                    {{ optional($movement->product)->name ?? '-' }}
                    @if(!empty($movement->product->code))
                    <br><small style="color:#666;">{{ $movement->product->code }}</small>
                    @endif
                </td>
                <td>{{ optional($movement->product)->product_type ? ucfirst(strtolower($movement->product->product_type)) : '-' }}</td>
                <td>{{ optional($movement->warehouse)->name ?? '-' }}</td>
                <td class="text-right">
                    {{ number_format($movement->quantity, 3) }}
                    @if(!empty($movement->product->uom->name))
                    <br><small>{{ $movement->product->uom->name }}</small>
                    @endif
                </td>
                <td class="text-right">{{ number_format($movement->unit_cost, 2) }}</td>
                <td class="text-right"><strong>{{ number_format($movement->total_cost, 2) }}</strong></td>
                <td>{{ $movement->batch_number ?? '-' }}</td>
                <td>
                    {{ $movement->reference_type ?? '-' }}
                    @if(!empty($movement->reference_id))
                    <br><small>#{{ $movement->reference_id }}</small>
                    @endif
                </td>
                <td>{{ optional($movement->creator)->name ?? '-' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="12" class="text-center">No stock movements found</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
        Generated on: {{ now()->format('d-m-Y H:i:s') }} |
        Total Records: {{ count($movements) }} |
        This is a computer-generated document
    </div>
</body>

</html>