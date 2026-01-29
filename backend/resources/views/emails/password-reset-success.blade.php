<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success-icon {
            text-align: center;
            font-size: 60px;
            color: #28a745;
            margin-bottom: 20px;
        }
        h1 {
            color: #28a745;
            text-align: center;
            margin-bottom: 20px;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #777;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">?</div>
        <h1>Password Reset Successful</h1>

        <p>Dear {{ $user->name }},</p>

        <p>Your password has been successfully reset. You can now log in to your account using your new password.</p>

        <div class="warning">
            <p><strong>?? Security Tips:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Keep your password secure and don't share it with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Enable two-factor authentication if available</li>
                <li>Change your password regularly</li>
            </ul>
        </div>

        <p><strong>?? Didn't make this change?</strong><br>
        If you didn't reset your password, please contact our support team immediately as your account may be compromised.</p>

        <p>Best regards,<br>
        <strong>Temple Management System</strong></p>

        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; {{ date('Y') }} Temple Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>