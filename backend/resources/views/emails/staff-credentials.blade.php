{{-- resources/views/emails/staff-credentials.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f4f4f4; }
        .credentials { background: white; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ $isReset ? 'Password Reset' : 'Welcome ' . $staff->full_name }}</h1>
        </div>
        <div class="content">
            @if($isReset)
                <p>Your password has been reset. Please use the credentials below to login:</p>
            @else
                <p>Your account has been created in the Temple Management System. Below are your login credentials:</p>
            @endif
            
            <div class="credentials">
                <strong>Login URL:</strong> {{ config('app.url') }}/{{ request()->header('X-Temple-ID') }}/login<br>
                <strong>Username:</strong> {{ $user->username }}<br>
                <strong>Password:</strong> {{ $password }}<br>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
                <li>You will be required to change your password on first login</li>
                <li>This password is temporary and valid for 24 hours</li>
                <li>Keep your credentials confidential</li>
            </ul>
            
            @if(!$isReset)
                <p><strong>Your Details:</strong></p>
                <ul>
                    <li>Staff Code: {{ $staff->staff_code }}</li>
                    <li>Designation: {{ $staff->designation->designation_name }}</li>
                    <li>Department: {{ $staff->designation->department }}</li>
                    <li>Joining Date: {{ $staff->joining_date->format('d/m/Y') }}</li>
                </ul>
            @endif
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; {{ date('Y') }} Temple Management System</p>
        </div>
    </div>
</body>
</html>