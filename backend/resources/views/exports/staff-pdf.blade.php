<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Staff List Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            color: #333;
            line-height: 1.4;
        }
        
        /* Header Section */
        .temple-header {
            margin-bottom: 20px;
        }
        
        .header-table {
            width: 100%;
        }
        
        .logo-cell {
            width: 120px;
            vertical-align: top;
            padding-right: 15px;
        }
        
        .logo-container {
            width: 100px;
            height: 80px;
            border: 1px solid #ddd;
            text-align: center;
            display: table-cell;
            vertical-align: middle;
            background: #f5f5f5;
        }
        
        .logo-image {
            max-width: 100px;
            max-height: 80px;
            width: auto;
            height: auto;
        }
        
        .temple-info {
            vertical-align: top;
            font-size: 11px;
        }
        
        .temple-name {
            font-size: 18px;
            font-weight: bold;
            color: #ff00ff;
            margin-bottom: 5px;
        }
        
        .divider {
            border-top: 2px solid #c2c2c2;
            margin: 15px 0;
        }
        
        .report-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 20px 0;
        }
        
        .sub-header {
            text-align: center;
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f8f9fa;
        }
        
        /* Main Table */
        table.staff-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        table.staff-table thead {
            background-color: #4a5568;
        }
        
        table.staff-table thead tr th {
            color: white;
            padding: 8px 4px;
            text-align: left;
            font-size: 9px;
            font-weight: bold;
            border: 1px solid #4a5568;
        }
        
        table.staff-table td {
            padding: 6px 4px;
            border: 1px solid #e2e8f0;
            font-size: 9px;
        }
        
        table.staff-table tbody tr:nth-child(even) {
            background-color: #f7fafc;
        }
        
        .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
        }
        
        .status-ACTIVE { 
            background-color: #48bb78; 
            color: white;
        }
        .status-INACTIVE { 
            background-color: #718096; 
            color: white;
        }
        .status-TERMINATED { 
            background-color: #f56565; 
            color: white;
        }
        .status-SUSPENDED { 
            background-color: #ed8936; 
            color: white;
        }
        .status-ON_LEAVE { 
            background-color: #4299e1; 
            color: white;
        }
        .status-RESIGNED { 
            background-color: #2d3748; 
            color: white;
        }
        
        /* Summary Section */
        .summary-section {
            margin-top: 30px;
            padding: 15px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
        }
        
        .summary-grid {
            width: 100%;
        }
        
        .summary-grid tr td {
            padding: 5px;
            font-size: 10px;
            border: none;
        }
        
        /* Footer */
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <!-- Temple Header -->
    <div class="temple-header">
        <table class="header-table">
            <tr>
                <td class="logo-cell">
                    @if(isset($settings['temple_logo_base64']) && $settings['temple_logo_base64'])
                        <img src="{{ $settings['temple_logo_base64'] }}" class="logo-image" alt="Temple Logo" />
                    @else
                        <div class="logo-container">
                            <span style="font-size: 10px; color: #666;">TEMPLE LOGO</span>
                        </div>
                    @endif
                </td>
                <td class="temple-info">
                    <div class="temple-name">{{ isset($settings['temple_name']) ? $settings['temple_name'] : 'Temple Name' }}</div>
                    @if(isset($settings['temple_address']) && $settings['temple_address'])
                        <div>{{ $settings['temple_address'] }}</div>
                    @endif
                    @if(isset($settings['temple_city']) || isset($settings['temple_state']))
                        <div>
                            {{ isset($settings['temple_city']) ? $settings['temple_city'] : '' }}{{ (isset($settings['temple_city']) && isset($settings['temple_state'])) ? ', ' : '' }}{{ isset($settings['temple_state']) ? $settings['temple_state'] : '' }} {{ isset($settings['temple_pincode']) ? $settings['temple_pincode'] : '' }}
                        </div>
                    @endif
                    @if(isset($settings['temple_country']) && $settings['temple_country'])
                        <div>{{ $settings['temple_country'] }}</div>
                    @endif
                    @if(isset($settings['temple_phone']) && $settings['temple_phone'])
                        <div>Tel: {{ $settings['temple_phone'] }}</div>
                    @endif
                    @if(isset($settings['temple_email']) && $settings['temple_email'])
                        <div>Email: {{ $settings['temple_email'] }}</div>
                    @endif
                </td>
            </tr>
        </table>
    </div>

    <div class="divider"></div>

    <!-- Report Title -->
    <div class="report-title">Staff List Report</div>

    <!-- Sub Header -->
    <div class="sub-header">
        <div>Generated on: {{ date('d F Y, h:i A') }}</div>
        <div>Total Records: {{ count($staff) }}</div>
    </div>

    <!-- Staff Table -->
    <table class="staff-table">
        <thead>
            <tr>
                <th width="8%">Code</th>
                <th width="18%">Name</th>
                <th width="14%">Designation</th>
                <th width="12%">Department</th>
                <th width="10%">Type</th>
                <th width="18%">Contact</th>
                <th width="10%">Joining Date</th>
                <th width="10%">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($staff as $member)
            <tr>
                <td>{{ $member->staff_code ? $member->staff_code : '-' }}</td>
                <td>
                    <strong>{{ $member->first_name }} {{ $member->last_name }}</strong>
                </td>
                <td>{{ $member->designation ? $member->designation->designation_name : '-' }}</td>
                <td>{{ $member->designation ? $member->designation->department : '-' }}</td>
                <td>{{ $member->employee_type ? str_replace('_', ' ', $member->employee_type) : '-' }}</td>
                <td>
                    {{ $member->phone }}
                    @if($member->email)
                        <br>{{ $member->email }}
                    @endif
                </td>
                <td>{{ $member->joining_date ? date('d-M-Y', strtotime($member->joining_date)) : '-' }}</td>
                <td>
                    <span class="status-badge status-{{ $member->status }}">
                        {{ $member->status }}
                    </span>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px;">No staff records found</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Summary Section -->
    @if(count($staff) > 0)
    @php
        $activeCount = 0;
        $inactiveCount = 0;
        $onLeaveCount = 0;
        $suspendedCount = 0;
        $terminatedCount = 0;
        $resignedCount = 0;
        
        foreach($staff as $s) {
            switch($s->status) {
                case 'ACTIVE': $activeCount++; break;
                case 'INACTIVE': $inactiveCount++; break;
                case 'ON_LEAVE': $onLeaveCount++; break;
                case 'SUSPENDED': $suspendedCount++; break;
                case 'TERMINATED': $terminatedCount++; break;
                case 'RESIGNED': $resignedCount++; break;
            }
        }
    @endphp
    <div class="summary-section">
        <h4 style="margin-bottom: 10px;">Summary Statistics</h4>
        <table class="summary-grid">
            <tr>
                <td><strong>Active:</strong> {{ $activeCount }}</td>
                <td><strong>Inactive:</strong> {{ $inactiveCount }}</td>
                <td><strong>On Leave:</strong> {{ $onLeaveCount }}</td>
            </tr>
            <tr>
                <td><strong>Suspended:</strong> {{ $suspendedCount }}</td>
                <td><strong>Terminated:</strong> {{ $terminatedCount }}</td>
                <td><strong>Resigned:</strong> {{ $resignedCount }}</td>
            </tr>
        </table>
    </div>
    @endif

    <!-- Footer -->
    <div class="footer">
        <p>This is a system generated report</p>
        <p>{{ isset($settings['temple_name']) ? $settings['temple_name'] : 'Temple Management System' }} - Staff Management Module</p>
    </div>
</body>
</html>