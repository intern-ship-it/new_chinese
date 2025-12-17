<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Members Report</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
        }
        .header p {
            margin: 5px 0;
            font-size: 11px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        table th {
            background-color: #0d6efd;
            color: white;
            padding: 8px;
            text-align: left;
            font-size: 9px;
            border: 1px solid #ddd;
        }
        table td {
            padding: 6px;
            border: 1px solid #ddd;
            font-size: 9px;
        }
        table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 9px;
            color: #666;
        }
        .badge-active {
            background-color: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .badge-inactive {
            background-color: #dc3545;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Members Report</h1>
        <p>Generated on: {{ $generated_at }}</p>
        <p>Total Members: {{ $total_count }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Member Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Gender</th>
                <th>Member Type</th>
                <th>City</th>
                <th>State</th>
                <th>Membership Date</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($members as $index => $member)
            @php
                $memberDetails = $member['member_details'] ?? [];
            @endphp
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $memberDetails['member_code'] ?? '-' }}</td>
                <td>{{ $member['name'] ?? '-' }}</td>
                <td>{{ $member['email'] ?? '-' }}</td>
                <td>{{ ($member['mobile_code'] ?? '') . ' ' . ($member['mobile_no'] ?? '-') }}</td>
                <td>{{ $member['gender'] ?? '-' }}</td>
                <td>{{ $memberDetails['member_type']['name'] ?? '-' }}</td>
                <td>{{ $member['city'] ?? '-' }}</td>
                <td>{{ $member['state'] ?? '-' }}</td>
                <td>{{ $memberDetails['membership_date'] ? date('d M Y', strtotime($memberDetails['membership_date'])) : '-' }}</td>
                <td>
                    @if($member['is_active'])
                        <span class="badge-active">Active</span>
                    @else
                        <span class="badge-inactive">Inactive</span>
                    @endif
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        <p>This is a system-generated report | © {{ date('Y') }} Temple Management System</p>
    </div>
</body>
</html>