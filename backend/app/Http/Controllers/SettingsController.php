<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Models\AcYear;
use App\Models\OrganizationPosition;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

use App\Services\TempleLogoService;

class SettingsController extends Controller
{

    use ApiResponse;

    protected $templeLogoService;


    /**
     * Constructor
     */
    public function __construct(TempleLogoService $templeLogoService)
    {
        $this->templeLogoService = $templeLogoService;
    }
    /**
     * Define setting fields and their validation rules
     */
    private $settingDefinitions = [
        'SYSTEM' => [
            'temple_name' => [
                'label' => 'Temple Name',
                'type' => 'text',
                'validation' => 'required|string|max:255',
                'placeholder' => 'Enter temple name',
                'description' => 'Name of the temple'
            ],
            'temple_code' => [
                'label' => 'Temple Code',
                'type' => 'text',
                'validation' => 'required|string|max:50',
                'placeholder' => 'Enter temple code',
                'description' => 'Unique temple identifier'
            ],
            'temple_description' => [
                'label' => 'Temple Description',
                'type' => 'textarea',
                'validation' => 'nullable|string|max:1000',
                'placeholder' => 'Enter temple description',
                'description' => 'Brief description about the temple'
            ],
            'temple_logo' => [
                'label' => 'Temple Logo',
                'type' => 'image',
                'validation' => 'nullable|string|max:500',
                'placeholder' => 'Upload temple logo',
                'description' => 'Temple logo image (Max 500MB)',
                'accept' => 'image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp',
                'max_size' => 524288000, // 500MB in bytes
                'preview' => true,
                'section' => 'Branding'
            ],
            'temple_address' => [
                'label' => 'Temple Address',
                'type' => 'textarea',
                'validation' => 'nullable|string|max:500',
                'placeholder' => 'Enter complete address',
                'description' => 'Physical address of the temple'
            ],
            'temple_city' => [
                'label' => 'City',
                'type' => 'text',
                'validation' => 'nullable|string|max:100',
                'placeholder' => 'Enter city',
                'description' => 'City where temple is located'
            ],
            'temple_state' => [
                'label' => 'State',
                'type' => 'text',
                'validation' => 'nullable|string|max:100',
                'placeholder' => 'Enter state',
                'description' => 'State where temple is located'
            ],
            'temple_country' => [
                'label' => 'Country',
                'type' => 'text',
                'validation' => 'nullable|string|max:100',
                'placeholder' => 'Enter country',
                'description' => 'Country where temple is located'
            ],
            'temple_pincode' => [
                'label' => 'Pincode',
                'type' => 'text',
                'validation' => 'nullable|string|max:10',
                'placeholder' => 'Enter pincode',
                'description' => 'Postal code'
            ],
            'temple_phone_code' => [
                'label' => 'Phone Code',
                'type' => 'text',
                'validation' => 'nullable|string|max:20',
                'placeholder' => 'Enter phone code',
                'description' => 'Phone Code like +60'
            ],
            'temple_phone' => [
                'label' => 'Contact Phone',
                'type' => 'text',
                'validation' => 'nullable|string|max:20',
                'placeholder' => 'Enter phone number',
                'description' => 'Temple contact phone number'
            ],
            'temple_email' => [
                'label' => 'Contact Email',
                'type' => 'email',
                'validation' => 'nullable|email|max:255',
                'placeholder' => 'Enter email address',
                'description' => 'Temple contact email'
            ],
            'temple_website' => [
                'label' => 'Website URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://example.com',
                'description' => 'Temple website URL'
            ],
            'temple_domain' => [
                'label' => 'Temple Domain',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'temple1.example.com',
                'description' => 'Temple domain URL'
            ],
            'temple_twitter_url' => [
                'label' => 'Twitter/X URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://twitter.com/temple',
                'description' => 'Temple Twitter/X URL'
            ],
            'temple_youtube_url' => [
                'label' => 'YouTube URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://youtube.com/temple',
                'description' => 'Temple YouTube channel URL'
            ],
            'temple_facebook_url' => [
                'label' => 'Facebook URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://facebook.com/temple',
                'description' => 'Temple Facebook page URL'
            ],
            'temple_instagram_url' => [
                'label' => 'Instagram URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://instagram.com/temple',
                'description' => 'Temple Instagram URL'
            ],
            'temple_date_format' => [
                'label' => 'Date Format',
                'type' => 'select',
                'validation' => 'nullable|string|in:d/m/Y,m/d/Y,Y-m-d,d-m-Y',
                'options' => [
                    'd/m/Y' => 'DD/MM/YYYY',
                    'm/d/Y' => 'MM/DD/YYYY',
                    'Y-m-d' => 'YYYY-MM-DD',
                    'd-m-Y' => 'DD-MM-YYYY'
                ],
                'default' => 'd/m/Y',
                'description' => 'Date format for display'
            ],
            'temple_time_format' => [
                'label' => 'Time Format',
                'type' => 'select',
                'validation' => 'nullable|string|in:12,24',
                'options' => [
                    '12' => '12 Hour (AM/PM)',
                    '24' => '24 Hour'
                ],
                'default' => '12',
                'description' => 'Time format for display'
            ],
            'temple_timezone' => [
                'label' => 'Timezone',
                'type' => 'select',
                'validation' => 'nullable|string|timezone',
                'options' => 'timezone_list',
                'default' => 'Asia/Kolkata',
                'description' => 'Temple timezone'
            ],

            'temple_currency' => [
                'label' => 'Currency',
                'type' => 'select',
                'validation' => 'nullable|string|in:MYR,INR,USD,EUR,GBP,SGD,JPY,CNY,CAD,AUD,CHF,HKD,NZD,SEK,NOK,DKK,AED,SAR,ZAR,THB,PHP,IDR,VND,KRW,TWD,BRL,MXN,RUB,TRY,ILS',
                'options' => [
                    'MYR' => 'Malaysian Ringgit (RM)',
                    'INR' => 'Indian Rupee (₹)',
                    'USD' => 'US Dollar ($)',
                    'EUR' => 'Euro (€)',
                    'GBP' => 'British Pound (£)',
                    'SGD' => 'Singapore Dollar (S$)',
                    'JPY' => 'Japanese Yen (¥)',
                    'CNY' => 'Chinese Yuan (¥)',
                    'CAD' => 'Canadian Dollar (C$)',
                    'AUD' => 'Australian Dollar (A$)',
                    'CHF' => 'Swiss Franc (CHF)',
                    'HKD' => 'Hong Kong Dollar (HK$)',
                    'NZD' => 'New Zealand Dollar (NZ$)',
                    'SEK' => 'Swedish Krona (kr)',
                    'NOK' => 'Norwegian Krone (kr)',
                    'DKK' => 'Danish Krone (kr)',
                    'AED' => 'UAE Dirham (د.إ)',
                    'SAR' => 'Saudi Riyal (ر.س)',
                    'ZAR' => 'South African Rand (R)',
                    'THB' => 'Thai Baht (฿)',
                    'PHP' => 'Philippine Peso (₱)',
                    'IDR' => 'Indonesian Rupiah (Rp)',
                    'VND' => 'Vietnamese Dong (₫)',
                    'KRW' => 'South Korean Won (₩)',
                    'TWD' => 'Taiwan Dollar (NT$)',
                    'BRL' => 'Brazilian Real (R$)',
                    'MXN' => 'Mexican Peso ($)',
                    'RUB' => 'Russian Ruble (₽)',
                    'TRY' => 'Turkish Lira (₺)',
                    'ILS' => 'Israeli Shekel (₪)'
                ],
                'default' => 'MYR',
                'description' => 'Default currency'
            ],
            'temple_booking_advance_days' => [
                'label' => 'Advance Booking Days',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:365',
                'default' => '90',
                'placeholder' => 'Enter number of days',
                'description' => 'How many days in advance bookings can be made'
            ],
            'temple_booking_cancellation_hours' => [
                'label' => 'Cancellation Hours',
                'type' => 'number',
                'validation' => 'nullable|integer|min:0|max:168',
                'default' => '24',
                'placeholder' => 'Enter hours',
                'description' => 'Hours before booking when cancellation is allowed'
            ],
            'temple_maintenance_mode' => [
                'label' => 'Maintenance Mode',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Enable maintenance mode for the temple'
            ],
            'temple_auto_member_code' => [
                'label' => 'Auto Generate Member Code',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => true,
                'description' => 'Automatically generate member codes'
            ],
            'temple_member_code_prefix' => [
                'label' => 'Member Code Prefix',
                'type' => 'text',
                'validation' => 'nullable|string|max:10',
                'default' => 'MEM',
                'placeholder' => 'MEM',
                'description' => 'Prefix for member codes'
            ],
            'temple_financial_year_start' => [
                'label' => 'Financial Year Start Month',
                'type' => 'select',
                'validation' => 'nullable|integer|min:1|max:12',
                'options' => [
                    '1' => 'January',
                    '2' => 'February',
                    '3' => 'March',
                    '4' => 'April',
                    '5' => 'May',
                    '6' => 'June',
                    '7' => 'July',
                    '8' => 'August',
                    '9' => 'September',
                    '10' => 'October',
                    '11' => 'November',
                    '12' => 'December'
                ],
                'default' => '4',
                'description' => 'Month when financial year starts'
            ],
            'background_color' => [
                'label' => 'Background Color',
                'type' => 'color',
                'validation' => 'nullable|string|max:7',
                'default' => '#1A1A2E',
                'description' => 'Background color for the theme'
            ]
        ],
        'AWS' => [
            'aws_access_key_id' => [
                'label' => 'AWS Access Key ID',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter AWS Access Key ID',
                'description' => 'AWS Access Key ID for S3 services',
                'encrypted' => true
            ],
            'aws_secret_access_key' => [
                'label' => 'AWS Secret Access Key',
                'type' => 'password',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter AWS Secret Access Key',
                'description' => 'AWS Secret Access Key for S3 services',
                'encrypted' => true
            ],
            'aws_default_region' => [
                'label' => 'AWS Region',
                'type' => 'select',
                'validation' => 'nullable|string|max:50',
                'options' => [
                    'us-east-1' => 'US East (N. Virginia)',
                    'us-west-2' => 'US West (Oregon)',
                    'eu-west-1' => 'EU (Ireland)',
                    'ap-south-1' => 'Asia Pacific (Mumbai)',
                    'ap-southeast-1' => 'Asia Pacific (Singapore)',
                    'ap-northeast-1' => 'Asia Pacific (Tokyo)'
                ],
                'default' => 'ap-south-1',
                'description' => 'AWS Region for S3 bucket'
            ],
            'aws_bucket_name' => [
                'label' => 'S3 Bucket Name',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter S3 bucket name',
                'description' => 'S3 bucket name for this temple'
            ],
            'aws_bucket_url' => [
                'label' => 'S3 Bucket URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://bucket-name.s3.region.amazonaws.com',
                'description' => 'S3 bucket URL',
                'readonly' => true
            ],
            'aws_cdn_url' => [
                'label' => 'CDN URL',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://cdn.example.com',
                'description' => 'CDN URL if enabled'
            ],
            'aws_signature_path' => [
                'label' => 'Signature Storage Path',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'default' => 'signatures/',
                'placeholder' => 'signatures/',
                'description' => 'Path for signatures in bucket'
            ],
            'aws_signature_quality' => [
                'label' => 'Signature Image Quality',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:100',
                'default' => '90',
                'placeholder' => '90',
                'description' => 'Image quality for signature compression (1-100)'
            ],
            'aws_max_file_size' => [
                'label' => 'Max File Size (MB)',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:100',
                'default' => '10',
                'placeholder' => '10',
                'description' => 'Maximum file size in MB'
            ],
            'aws_endpoint' => [
                'label' => 'Custom S3 Endpoint',
                'type' => 'url',
                'validation' => 'nullable|url|max:255',
                'placeholder' => 'https://s3-compatible-endpoint.com',
                'description' => 'Custom S3 endpoint (optional)'
            ],
            'aws_use_path_style_endpoint' => [
                'label' => 'Use Path Style Endpoint',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Use path style endpoint for S3'
            ]
        ],
        'EMAIL' => [
            'mail_mailer' => [
                'label' => 'Mail Driver',
                'type' => 'select',
                'validation' => 'nullable|string|in:smtp,sendmail,mailgun,ses,postmark',
                'options' => [
                    'smtp' => 'SMTP',
                    'sendmail' => 'Sendmail',
                    'mailgun' => 'Mailgun',
                    'ses' => 'Amazon SES',
                    'postmark' => 'Postmark'
                ],
                'default' => 'smtp',
                'description' => 'Email sending method'
            ],
            'mail_host' => [
                'label' => 'Mail Host',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'smtp.gmail.com',
                'description' => 'SMTP host address'
            ],
            'mail_port' => [
                'label' => 'Mail Port',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:65535',
                'default' => '587',
                'placeholder' => '587',
                'description' => 'SMTP port number'
            ],
            'mail_username' => [
                'label' => 'Mail Username',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'your-email@gmail.com',
                'description' => 'SMTP username',
                'encrypted' => true
            ],
            'mail_password' => [
                'label' => 'Mail Password',
                'type' => 'password',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter mail password',
                'description' => 'SMTP password',
                'encrypted' => true
            ],
            'mail_encryption' => [
                'label' => 'Mail Encryption',
                'type' => 'select',
                'validation' => 'nullable|string|in:tls,ssl,null',
                'options' => [
                    'tls' => 'TLS',
                    'ssl' => 'SSL',
                    'null' => 'None'
                ],
                'default' => 'tls',
                'description' => 'Email encryption method'
            ],
            'mail_from_address' => [
                'label' => 'From Email Address',
                'type' => 'email',
                'validation' => 'nullable|email|max:255',
                'placeholder' => 'noreply@temple.com',
                'description' => 'Default from email address'
            ],
            'mail_from_name' => [
                'label' => 'From Name',
                'type' => 'text',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Temple Name',
                'description' => 'Default from name'
            ],
            'mail_reply_to_address' => [
                'label' => 'Reply To Address',
                'type' => 'email',
                'validation' => 'nullable|email|max:255',
                'placeholder' => 'info@temple.com',
                'description' => 'Reply to email address'
            ],
            'mail_cc_addresses' => [
                'label' => 'CC Addresses',
                'type' => 'textarea',
                'validation' => 'nullable|string|max:500',
                'placeholder' => 'email1@example.com, email2@example.com',
                'description' => 'CC email addresses (comma separated)'
            ],
            'mail_bcc_addresses' => [
                'label' => 'BCC Addresses',
                'type' => 'textarea',
                'validation' => 'nullable|string|max:500',
                'placeholder' => 'email1@example.com, email2@example.com',
                'description' => 'BCC email addresses (comma separated)'
            ],
            'mail_queue_enabled' => [
                'label' => 'Enable Email Queue',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Queue emails for better performance'
            ]
        ],
        'SMS' => [
            'sms_provider' => [
                'label' => 'SMS Provider',
                'type' => 'select',
                'validation' => 'nullable|string|in:twilio,textlocal,msg91,aws_sns',
                'options' => [
                    'twilio' => 'Twilio',
                    'textlocal' => 'TextLocal',
                    'msg91' => 'MSG91',
                    'aws_sns' => 'AWS SNS'
                ],
                'description' => 'SMS service provider'
            ],
            'sms_api_key' => [
                'label' => 'SMS API Key',
                'type' => 'password',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter SMS API key',
                'description' => 'SMS provider API key',
                'encrypted' => true
            ],
            'sms_api_secret' => [
                'label' => 'SMS API Secret',
                'type' => 'password',
                'validation' => 'nullable|string|max:255',
                'placeholder' => 'Enter SMS API secret',
                'description' => 'SMS provider API secret',
                'encrypted' => true
            ],
            'sms_sender_id' => [
                'label' => 'SMS Sender ID',
                'type' => 'text',
                'validation' => 'nullable|string|max:20',
                'placeholder' => 'TEMPLE',
                'description' => 'SMS sender ID/name'
            ],
            'sms_default_country_code' => [
                'label' => 'Default Country Code',
                'type' => 'text',
                'validation' => 'nullable|string|max:5',
                'default' => '+91',
                'placeholder' => '+91',
                'description' => 'Default country code for SMS'
            ],
            'sms_enabled' => [
                'label' => 'Enable SMS',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Enable SMS notifications'
            ],
            'sms_otp_enabled' => [
                'label' => 'Enable SMS OTP',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Enable SMS OTP for authentication'
            ],
            'sms_booking_confirmation' => [
                'label' => 'Send Booking Confirmation',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => true,
                'description' => 'Send SMS for booking confirmations'
            ],
            'sms_payment_confirmation' => [
                'label' => 'Send Payment Confirmation',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => true,
                'description' => 'Send SMS for payment confirmations'
            ]
        ],
        'ACCOUNTS' => [
            'financial_year_id' => [
                'label' => 'Financial Year',
                'type' => 'select_dynamic',
                'validation' => 'nullable|exists:ac_year,id',
                'placeholder' => 'Select Financial Year',
                'description' => 'Active financial year for accounting operations',
                'data_source' => 'ac_years',
                'default' => null
            ],
            'sign_authority' => [
                'label' => 'Signing Authority',
                'type' => 'multiselect_dynamic',
                'validation' => 'nullable|json',
                'placeholder' => 'Select Sign Authorities',
                'description' => 'Organization positions authorized to sign documents',
                'data_source' => 'organization_positions',
                'default' => '[]'
            ],
            'is_approval_payment' => [
                'label' => 'Payment Approval',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Enable payment approval workflow for transactions'
            ],
            'payment_approval' => [
                'label' => 'Payment Approval Authorities',
                'type' => 'multiselect_dynamic',
                'validation' => 'nullable|json',
                'placeholder' => 'Select Payment Approvers',
                'description' => 'Organization positions authorized to approve payments',
                'data_source' => 'organization_positions',
                'default' => '[]',
                'conditional' => 'is_approval_payment',
                'conditional_value' => true
            ],
            'payment_approval_member_count' => [
                'label' => 'Approval Member Nos.',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:10',
                'placeholder' => 'Enter number (e.g., 2)',
                'description' => 'How many members need to approve',
                'default' => '1',
                'conditional' => 'is_approval_payment',
                'conditional_value' => true
            ],
            'minimum_payment_approval_amount' => [
                'label' => 'Minimum Payment Approval Amount',
                'type' => 'number',
                'validation' => 'nullable|numeric|min:0|max:999999999.99',
                'placeholder' => 'Enter amount (e.g., 1000.00)',
                'description' => 'Payments above this amount will require approval',
                'default' => '0.00',
                'step' => '0.01',
                'conditional' => 'is_approval_payment',
                'conditional_value' => true
            ],
        ],
        // In SettingsController.php, add after 'ACCOUNTS' => [...] section:

        'PURCHASE' => [
            'is_purchase_order_approval' => [
                'label' => 'Enable Purchase Order Approval',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Enable purchase order approval workflow'
            ],
            'purchase_approval_authorities' => [
                'label' => 'Purchase Approval Authorities',
                'type' => 'multiselect_dynamic',
                'validation' => 'nullable|json',
                'placeholder' => 'Select Purchase Approvers',
                'description' => 'Organization positions authorized to approve purchase orders',
                'data_source' => 'organization_positions',
                'default' => '[]',
                'conditional' => 'is_purchase_order_approval',
                'conditional_value' => true
            ],
            'purchase_approval_member_nos' => [
                'label' => 'Approval Member Nos.',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:10',
                'placeholder' => 'Enter number (e.g., 2)',
                'description' => 'How many members need to approve purchase orders',
                'default' => '1',
                'conditional' => 'is_purchase_order_approval',
                'conditional_value' => true
            ],
            'purchase_minimum_approval_amount' => [
                'label' => 'Minimum Purchase Approval Amount',
                'type' => 'number',
                'validation' => 'nullable|numeric|min:0|max:999999999.99',
                'placeholder' => 'Enter amount (e.g., 1000.00)',
                'description' => 'Purchase orders above this amount will require approval',
                'default' => '0.00',
                'step' => '0.01',
                'conditional' => 'is_purchase_order_approval',
                'conditional_value' => true
            ]
        ],
        'NOTIFICATION' => [
            'notification_email_enabled' => [
                'label' => 'Enable Email Notifications',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => true,
                'description' => 'Send email notifications'
            ],
            'notification_sms_enabled' => [
                'label' => 'Enable SMS Notifications',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Send SMS notifications'
            ],
            'notification_push_enabled' => [
                'label' => 'Enable Push Notifications',
                'type' => 'boolean',
                'validation' => 'nullable|boolean',
                'default' => false,
                'description' => 'Send push notifications'
            ],
            'notification_booking_reminder_hours' => [
                'label' => 'Booking Reminder (Hours)',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:72',
                'default' => '24',
                'placeholder' => '24',
                'description' => 'Send reminder X hours before booking'
            ],
            'notification_subscription_expiry_days' => [
                'label' => 'Subscription Expiry Reminder (Days)',
                'type' => 'number',
                'validation' => 'nullable|integer|min:1|max:90',
                'default' => '30',
                'placeholder' => '30',
                'description' => 'Send reminder X days before subscription expiry'
            ],
            'notification_admin_email' => [
                'label' => 'Admin Notification Email',
                'type' => 'email',
                'validation' => 'nullable|email|max:255',
                'placeholder' => 'admin@temple.com',
                'description' => 'Email for admin notifications'
            ],
            'notification_admin_mobile' => [
                'label' => 'Admin Notification Mobile',
                'type' => 'text',
                'validation' => 'nullable|string|max:20',
                'placeholder' => '+91 9876543210',
                'description' => 'Mobile for admin notifications'
            ]
        ],
        'OTHER' => []
    ];

    // ... (rest of the methods remain the same until getAccountingYears)

    /**
     * Get settings by type or all settings
     */
    public function getSettings(Request $request)
    {
        try {
            $type = $request->get('type');
            $type = $type ? strtoupper($type) : null;

            // Get available types
            $availableTypes = array_keys($this->settingDefinitions);

            // Validate type if provided
            if ($type && !in_array($type, $availableTypes)) {
                return $this->errorResponse("Invalid setting type. Available types: " . implode(', ', $availableTypes));
            }

            // If type is specified, return only that type's settings
            if ($type) {
                $settings = $this->getSettingsByType($type);
                return $this->successResponse([
                    'type' => $type,
                    'fields' => $this->getFieldDefinitions($type),
                    'values' => $settings
                ], "Settings retrieved successfully");
            }

            // Return all settings grouped by type
            $allSettings = [];
            foreach ($availableTypes as $settingType) {
                $allSettings[$settingType] = $this->getSettingsByType($settingType);
            }
            return $this->successResponse([
                'types_list' => $availableTypes,
                'field_definitions' => $this->getAllFieldDefinitions(),
                'data_list' => $allSettings
            ], "All settings retrieved successfully");
        } catch (\Exception $e) {
            Log::error('Failed to get settings: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve settings: ' . $e->getMessage());
        }
    }
    /**
     * Ensure all values in array are UTF-8 encoded
     */
    private function ensureUtf8Encoding($data)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value)) {
                    $data[$key] = $this->ensureUtf8Encoding($value);
                } elseif (is_string($value)) {
                    // Ensure UTF-8 encoding
                    if (!mb_check_encoding($value, 'UTF-8')) {
                        $data[$key] = mb_convert_encoding($value, 'UTF-8', mb_detect_encoding($value));
                    }
                    // Remove any invalid UTF-8 sequences
                    $data[$key] = iconv('UTF-8', 'UTF-8//IGNORE', $value);
                }
            }
        }
        return $data;
    }

    /**
     * Update settings for a specific type
     */
    public function updateSettings(Request $request)
    {
        try {
            $type = $request->get('type');
            if (!$type) {
                return $this->errorResponse('Setting type is required');
            }

            $type = strtoupper($type);

            // Validate type
            if (!isset($this->settingDefinitions[$type])) {
                return $this->errorResponse("Invalid setting type: {$type}");
            }

            // Get validation rules for this type
            $rules = [];
            $fieldDefinitions = $this->settingDefinitions[$type];

            foreach ($fieldDefinitions as $key => $definition) {
                if (isset($definition['validation'])) {
                    $rules["settings.{$key}"] = $definition['validation'];
                }
            }

            // Validate the settings
            $validator = Validator::make($request->all(), [
                'type' => 'required|string',
                'settings' => 'required|array',
                ...$rules
            ]);

            if ($validator->fails()) {
                return $this->validationErrorResponse($validator->errors());
            }

            $settings = $request->get('settings', []);
            $updatedSettings = [];

            DB::beginTransaction();
            try {
                foreach ($settings as $key => $value) {
                    // Skip temple_logo as it's handled separately
                    if ($key === 'temple_logo') {
                        continue;
                    }

                    // Only update if the key is defined for this type
                    if (isset($fieldDefinitions[$key])) {
                        // Handle encryption for sensitive fields
                        if (isset($fieldDefinitions[$key]['encrypted']) && $fieldDefinitions[$key]['encrypted']) {
                            // Don't update if the value is masked
                            if ($value === '********' || $value === '') {
                                continue;
                            }
                            $value = encrypt($value);
                        }

                        // Handle boolean values
                        if ($fieldDefinitions[$key]['type'] === 'boolean') {
                            $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
                        }

                        // Update or create the setting
                        SystemSetting::updateOrCreate(
                            [
                                'key' => $key,
                                'type' => $type
                            ],
                            [
                                'value' => $value,
                                'description' => $fieldDefinitions[$key]['description'] ?? null
                            ]
                        );

                        $updatedSettings[$key] = $value;
                    }
                }

                // Clear cache for all settings
                Cache::forget('system_settings_all');
                Cache::forget("system_settings_type_{$type}");

                // Clear individual setting caches
                foreach ($updatedSettings as $key => $value) {
                    Cache::forget("system_setting_{$key}");
                }

                DB::commit();

                // Get updated settings (with decrypted values for display)
                $currentSettings = $this->getSettingsByType($type);

                return $this->successResponse([
                    'type' => $type,
                    'updated_count' => count($updatedSettings),
                    'settings' => $currentSettings
                ], "Settings updated successfully");
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Failed to update settings: ' . $e->getMessage());
            return $this->errorResponse('Failed to update settings: ' . $e->getMessage());
        }
    }

    /**
     * Reset settings to default values for a specific type
     */
    public function resetSettings(Request $request)
    {
        try {
            $type = $request->get('type');
            if (!$type) {
                return $this->errorResponse('Setting type is required');
            }

            $type = strtoupper($type);

            // Validate type
            if (!isset($this->settingDefinitions[$type])) {
                return $this->errorResponse("Invalid setting type: {$type}");
            }

            DB::beginTransaction();
            try {
                $fieldDefinitions = $this->settingDefinitions[$type];
                $resetCount = 0;

                foreach ($fieldDefinitions as $key => $definition) {
                    if (isset($definition['default'])) {
                        SystemSetting::updateOrCreate(
                            [
                                'key' => $key,
                                'type' => $type
                            ],
                            [
                                'value' => $definition['default'],
                                'description' => $definition['description'] ?? null
                            ]
                        );
                        $resetCount++;
                    }
                }

                // Clear cache
                Cache::forget('system_settings_all');
                Cache::forget("system_settings_type_{$type}");

                foreach ($fieldDefinitions as $key => $definition) {
                    Cache::forget("system_setting_{$key}");
                }

                DB::commit();

                return $this->successResponse([
                    'type' => $type,
                    'reset_count' => $resetCount,
                    'settings' => $this->getSettingsByType($type)
                ], "Settings reset to defaults successfully");
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Failed to reset settings: ' . $e->getMessage());
            return $this->errorResponse('Failed to reset settings: ' . $e->getMessage());
        }
    }

    /**
     * Get settings by type from database
     */
    private function getSettingsByType($type)
    {
        $settings = SystemSetting::where('type', $type)->pluck('value', 'key')->toArray();
        $fieldDefinitions = $this->settingDefinitions[$type] ?? [];
        $result = [];
        foreach ($fieldDefinitions as $key => $definition) {
            if (isset($settings[$key])) {
                $value = $settings[$key];

                // Decrypt encrypted fields
                if (isset($definition['encrypted']) && $definition['encrypted']) {
                    try {
                        $value = decrypt($value);
                        // Mask sensitive data for display
                        if ($definition['type'] === 'password') {
                            $value = '********';
                        }
                    } catch (\Exception $e) {
                        // If decryption fails, try to use the raw value
                        Log::warning("Failed to decrypt setting {$key}: " . $e->getMessage());
                        $value = $settings[$key] ?? '';
                    }
                }
                if ($key == 'temple_logo') {
                    try {
                        $rr = $this->templeLogoService->getCurrentLogo();
                        if ($rr['success']) {
                            if ($rr['exists']) {
                                $value = $rr['url'];
                            } else {
                                Log::error($rr['message'] ?? 'No logo found');
                            }
                        } else {
                            Log::error($rr['message']);
                        }
                    } catch (\Exception $e) {
                        Log::error('Failed to get logo: ' . $e->getMessage());
                    }
                }

                // Convert boolean strings to actual booleans
                if ($definition['type'] === 'boolean') {
                    $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                }

                // Handle null values
                if ($value === null || $value === 'null') {
                    $value = $definition['default'] ?? null;
                }

                $result[$key] = $value;
            } else {
                // Use default value if setting doesn't exist
                $result[$key] = $definition['default'] ?? null;
            }
        }
        return $result;
    }

    /**
     * Get field definitions for a type
     */
    private function getFieldDefinitions($type)
    {
        $definitions = $this->settingDefinitions[$type] ?? [];
        $fields = [];

        foreach ($definitions as $key => $definition) {
            $field = [
                'key' => $key,
                'label' => $definition['label'],
                'type' => $definition['type'],
                'description' => $definition['description'] ?? null,
                'placeholder' => $definition['placeholder'] ?? null,
                'required' => strpos($definition['validation'] ?? '', 'required') !== false,
                'readonly' => $definition['readonly'] ?? false
            ];

            // Add additional field properties
            if (isset($definition['conditional'])) {
                $field['conditional'] = $definition['conditional'];
            }
            if (isset($definition['step'])) {
                $field['step'] = $definition['step'];
            }
            if ($definition['type'] === 'select' && isset($definition['options'])) {
                $field['options'] = $definition['options'];
            }
            if (isset($definition['data_source'])) {
                $field['data_source'] = $definition['data_source'];
            }
            if (isset($definition['validation'])) {
                $field['validation'] = $definition['validation'];
            }
            if (isset($definition['default'])) {
                $field['default'] = $definition['default'];
            }

            $fields[] = $field;
        }
        return $fields;
    }

    /**
     * Get all field definitions
     */
    private function getAllFieldDefinitions()
    {
        $allDefinitions = [];
        foreach ($this->settingDefinitions as $type => $definitions) {
            $allDefinitions[$type] = $this->getFieldDefinitions($type);
        }
        return $allDefinitions;
    }

    /**
     * Get timezone list
     */
    private function getTimezoneList()
    {
        $timezones = [];
        $tzlist = timezone_identifiers_list();

        foreach ($tzlist as $tz) {
            $timezones[$tz] = $tz;
        }

        return $timezones;
    }

    /**
     * Export settings
     */
    public function exportSettings(Request $request)
    {
        try {
            $type = $request->get('type');

            if ($type) {
                $type = strtoupper($type);
                if (!isset($this->settingDefinitions[$type])) {
                    return $this->errorResponse("Invalid setting type: {$type}");
                }

                $settings = [
                    $type => $this->getSettingsByType($type)
                ];
            } else {
                $settings = [];
                foreach (array_keys($this->settingDefinitions) as $settingType) {
                    $settings[$settingType] = $this->getSettingsByType($settingType);
                }
            }

            // Remove sensitive data
            foreach ($settings as $type => &$typeSettings) {
                foreach ($typeSettings as $key => &$value) {
                    if (
                        isset($this->settingDefinitions[$type][$key]['encrypted']) &&
                        $this->settingDefinitions[$type][$key]['encrypted']
                    ) {
                        $value = '********';
                    }
                }
            }

            return $this->successResponse([
                'exported_at' => now()->toIso8601String(),
                'settings' => $settings
            ], "Settings exported successfully");
        } catch (\Exception $e) {
            Log::error('Failed to export settings: ' . $e->getMessage());
            return $this->errorResponse('Failed to export settings: ' . $e->getMessage());
        }
    }

    /**
     * Import settings
     */
    public function importSettings(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'override_existing' => 'nullable|boolean'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $settings = $request->get('settings');
            $overrideExisting = $request->get('override_existing', false);
            $importedCount = 0;

            DB::beginTransaction();
            try {
                foreach ($settings as $type => $typeSettings) {
                    $type = strtoupper($type);

                    if (!isset($this->settingDefinitions[$type])) {
                        continue;
                    }

                    foreach ($typeSettings as $key => $value) {
                        if (!isset($this->settingDefinitions[$type][$key])) {
                            continue;
                        }

                        // Skip encrypted fields if masked
                        if ($value === '********') {
                            continue;
                        }

                        $existing = SystemSetting::where('key', $key)->where('type', $type)->first();

                        if (!$existing || $overrideExisting) {
                            SystemSetting::updateOrCreate(
                                [
                                    'key' => $key,
                                    'type' => $type
                                ],
                                [
                                    'value' => $value,
                                    'description' => $this->settingDefinitions[$type][$key]['description'] ?? null
                                ]
                            );
                            $importedCount++;
                        }
                    }
                }

                // Clear all caches
                Cache::flush();

                DB::commit();

                return $this->successResponse([
                    'imported_count' => $importedCount
                ], "Settings imported successfully");
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('Failed to import settings: ' . $e->getMessage());
            return $this->errorResponse('Failed to import settings: ' . $e->getMessage());
        }
    }

    /**
     * Get accounting years for dropdown
     */
    public function getAccountingYears(Request $request)
    {
        try {
            $years = AcYear::where('status', 1)
                ->orderBy('from_year_month', 'desc')
                ->get(['id', 'from_year_month', 'to_year_month'])
                ->map(function ($year) {
                    return [
                        'id' => $year->id,
                        'label' => Carbon::parse($year->from_year_month)->format('Y-m-d') . ' to ' .
                            Carbon::parse($year->to_year_month)->format('Y-m-d'),
                        'from_date' => $year->from_year_month,
                        'to_date' => $year->to_year_month
                    ];
                });

            return $this->successResponse($years, 'Accounting years retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Failed to get accounting years: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve accounting years');
        }
    }

    /**
     * Get organization positions for dropdown
     */
    public function getOrganizationPositions(Request $request)
    {
        try {
            $positions = OrganizationPosition::where('is_active', true)
                ->orderBy('hierarchy_level')
                ->orderBy('display_name')
                ->get(['id', 'display_name', 'hierarchy_level'])
                ->map(function ($position) {
                    return [
                        'id' => $position->id,
                        'label' => $position->display_name,
                        'level' => $position->hierarchy_level
                    ];
                });

            return $this->successResponse($positions, 'Organization positions retrieved successfully');
        } catch (\Exception $e) {
            Log::error('Failed to get organization positions: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve organization positions');
        }
    }

    /**
     * Upload temple logo
     */
    public function uploadLogo(Request $request)
    {

        try {
            // print_r($request->all()); die;
            Log::info('Logo upload request received');

            // Validate the request
            $validator = Validator::make($request->all(), [
                'logo' => 'required|image|mimes:jpeg,jpg,png,gif,svg,webp|max:512000' // 500MB in KB
            ]);

            if ($validator->fails()) {
                Log::error('Validation failed: ' . json_encode($validator->errors()));
                return $this->validationErrorResponse($validator->errors());
            }
            // Get temple ID from session or auth
            $templeId = session('temple_id') ?? $request->header('X-Temple-Id') ?? 1;

            // Use the service to upload
            $result = $this->templeLogoService->uploadLogo(
                $request->file('logo'),
                $templeId
            );

            if ($result['success']) {
                return $this->successResponse([
                    'path' => $result['path'],
                    'url' => $result['url'],
                    'filename' => $result['filename'],
                    'archived_previous' => $result['archived_previous'] ?? false
                ], 'Logo uploaded successfully to S3');
            } else {
                return $this->errorResponse($result['message']);
            }
        } catch (\Exception $e) {
            Log::error('Logo upload failed: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return $this->errorResponse('Failed to upload logo: ' . $e->getMessage());
        }
    }
    public function getCurrentLogo(Request $request)
    {
        try {
            $result = $this->templeLogoService->getCurrentLogo();

            if ($result['success']) {
                if ($result['exists']) {
                    return $this->successResponse([
                        'path' => $result['path'],
                        'url' => $result['url'],
                        'exists' => true,
                        'metadata' => $result['metadata'] ?? null
                    ], 'Logo retrieved successfully');
                } else {
                    return $this->successResponse([
                        'exists' => false,
                        'message' => $result['message'] ?? 'No logo found'
                    ], 'No logo found');
                }
            } else {
                return $this->errorResponse($result['message']);
            }
        } catch (\Exception $e) {
            Log::error('Failed to get logo: ' . $e->getMessage());
            return $this->errorResponse('Failed to retrieve logo');
        }
    }


    /**
     * Delete/Archive temple logo using TempleLogoService
     */
    public function deleteLogo(Request $request)
    {
        try {
            $result = $this->templeLogoService->deleteLogo();

            if ($result['success']) {
                return $this->successResponse(null, $result['message']);
            } else {
                return $this->errorResponse($result['message']);
            }
        } catch (\Exception $e) {
            Log::error('Logo deletion failed: ' . $e->getMessage());
            return $this->errorResponse('Failed to delete logo: ' . $e->getMessage());
        }
    }
}
