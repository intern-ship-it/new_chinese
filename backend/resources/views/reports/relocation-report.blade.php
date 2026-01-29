<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Relocation Report</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #8b4513;
            padding-bottom: 15px;
        }
        .header h1 {
            color: #8b4513;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .filters {
            background: #f8f9fa;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
        .filters strong {
            color: #8b4513;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background: #8b4513;
            color: white;
            padding: 8px;
            text-align: left;
            font-size: 11px;
        }
        td {
            border: 1px solid #ddd;
            padding: 6px;
            font-size: 9px;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        .badge {
            padding: 3px 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 8px;
        }
        .badge-warning { background: #ffc107; color: #000; }
        .badge-info { background: #17a2b8; color: #fff; }
        .badge-success { background: #28a745; color: #fff; }
        .badge-primary { background: #007bff; color: #fff; }
        .badge-danger { background: #dc3545; color: #fff; }
        .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 8px;
            color: #666;
        }
        .summary {
            margin: 20px 0;
            padding: 15px;
            background: #f0f0f0;
            border-left: 4px solid #8b4513;
        }
        .summary h3 {
            margin-top: 0;
            color: #8b4513;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>Generated: {{ $generated_at }}</p>
    </div>

    <!-- Filters Applied -->
    @if(!empty($filters))
    <div class="filters">
        <strong>Filters Applied:</strong><br>
        @if(isset($filters['event_name']))
            Event: {{ $filters['event_name'] }}<br>
        @endif
        @if(isset($filters['start_date']))
            From: {{ \Carbon\Carbon::parse($filters['start_date'])->format('d/m/Y') }}
        @endif
        @if(isset($filters['end_date']))
            To: {{ \Carbon\Carbon::parse($filters['end_date'])->format('d/m/Y') }}
        @endif
        @if(isset($filters['action_type']))
            <br>Action: {{ $filters['action_type'] }}
        @endif
        @if(isset($filters['booking_number']))
            <br>Booking: {{ $filters['booking_number'] }}
        @endif
    </div>
    @endif

    <!-- Summary Statistics -->
    <div class="summary">
        <h3>Summary</h3>
        <strong>Total Relocations:</strong> {{ $summary['total_relocations'] }}<br>
        @if(!empty($summary['by_action_type']))
            <strong>By Action Type:</strong>
            @foreach($summary['by_action_type'] as $type => $count)
                {{ $type }}: {{ $count }} &nbsp;&nbsp;
            @endforeach
        @endif
    </div>

    <!-- Records Table -->
    <table>
        <thead>
            <tr>
                <th style="width: 12%;">Date & Time</th>
                <th style="width: 15%;">Event</th>
                <th style="width: 10%;">Booking #</th>
                <th style="width: 12%;">Old Location</th>
                <th style="width: 12%;">New Location</th>
                <th style="width: 10%;">Action</th>
                <th style="width: 19%;">Reason</th>
                <th style="width: 10%;">Changed By</th>
            </tr>
        </thead>
        <tbody>
            @forelse($records as $record)
            <tr>
                <td>{{ \Carbon\Carbon::parse($record->changed_at)->format('d/m/Y H:i') }}</td>
                <td>{{ $record->event_name ?? 'N/A' }}</td>
                <td>{{ $record->booking_number ?? 'N/A' }}</td>
                <td>
                    @if($record->old_table_name)
                        <strong>{{ $record->old_table_name }}</strong><br>
                        <small>{{ $record->old_assign_number ?? 'N/A' }}</small>
                    @else
                        -
                    @endif
                </td>
                <td>
                    @if($record->new_table_name)
                        <strong>{{ $record->new_table_name }}</strong><br>
                        <small>{{ $record->new_assign_number ?? 'N/A' }}</small>
                    @else
                        -
                    @endif
                </td>
                <td>
                    <span class="badge badge-{{ $record->action_type == 'RELOCATE' ? 'warning' : ($record->action_type == 'SWAP' ? 'info' : ($record->action_type == 'CREATE' ? 'success' : ($record->action_type == 'UPDATE' ? 'primary' : 'danger'))) }}">
                        {{ $record->action_type }}
                    </span>
                </td>
                <td>{{ $record->change_reason ?? 'N/A' }}</td>
                <td>{{ $record->changed_by_name ?? 'System' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="8" style="text-align: center;">No records found</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
        <p>This report is system generated | Temple Management System</p>
        <p>Page {PAGE_NUM} of {PAGE_COUNT}</p>
    </div>
</body>
</html>