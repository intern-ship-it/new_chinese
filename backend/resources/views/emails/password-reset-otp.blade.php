<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
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
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            max-width: 150px;
            margin-bottom: 20px;
        }
        h1 {
            color: #ff00ff;
            margin: 0;
            font-size: 24px;
        }
        .otp-container {
            background-color: white;
            border: 2px dashed #ff00ff;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #ff00ff;
            letter-spacing: 8px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }
        .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .warning p {
            margin: 5px 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #777;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #ff00ff, #808000);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            {{-- Add your temple logo if available --}}
            {{-- <img src="{{ $temple_logo ?? '' }}" alt="Temple Logo" class="logo"> --}}
            <h1>Password Reset Request</h1>
        </div>

        <p>Dear {{ $user->name }},</p>

        <p>We received a request to reset the password for your account. Please use the following One-Time Password (OTP) to complete the password reset process:</p>

        <div class="otp-container">
            <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
            <div class="otp-code">{{ $otp }}</div>
            <p style="margin: 0; color: #999; font-size: 12px;">Valid for {{ $expiresInMinutes }} minutes</p>
        </div>

        <div class="warning">
            <p><strong>⚠️ Security Notice:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This OTP will expire in <strong>{{ $expiresInMinutes }} minutes</strong></li>
                <li>You have <strong>5 attempts</strong> to enter the correct OTP</li>
                <li>Never share this OTP with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
            </ul>
        </div>

        <p>If you have any questions or concerns, please contact our support team immediately.</p>

        <p>Best regards,<br>
        <strong>Temple Management System</strong></p>

        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; {{ date('Y') }} Temple Management System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>