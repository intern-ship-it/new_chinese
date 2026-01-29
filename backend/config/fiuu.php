<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fiuu Payment Gateway Credentials
    |--------------------------------------------------------------------------
    |
    | Shared credentials for Fiuu payment gateway used by multiple modules
    | (POS Sales, Donations, Buddha Lamp, etc.)
    |
    */

    // Sandbox Credentials
    'sandbox' => [
        'merchant_id' => 'SB_graspsoftware',
        'verify_key' => '3f97a57034112582ef5a1ffbe1d21a30',  // For vcode generation
        'secret_key' => '77e7bf7f53130877abdbef553725a785',   // For skey verification
    ],

    // Production Credentials (commented out)
    /* 'production' => [
        'merchant_id' => 'graspsoftware_Dev',
        'verify_key' => '1a0a4aa7f78747645062f84e09dd53a7',  // For vcode generation
        'secret_key' => 'ea441e6c806e08f22d2e6ab5afacb33f',   // For skey verification
    ], */

    /*
    |--------------------------------------------------------------------------
    | Fiuu Gateway URLs
    |--------------------------------------------------------------------------
    */

    'urls' => [
        'sandbox' => [
            'payment' => 'https://sandbox-payment.fiuu.com/RMS/pay/',
            'api' => 'https://sandbox-api.fiuu.com',
        ],
        'production' => [
            'payment' => 'https://pay.fiuu.com/RMS/pay/',
            'api' => 'https://api.fiuu.com',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Environment Mode
    |--------------------------------------------------------------------------
    |
    | Set to true for sandbox mode, false for production
    |
    */

    'is_sandbox' => env('FIUU_SANDBOX', true),

    /*
    |--------------------------------------------------------------------------
    | Payment Settings
    |--------------------------------------------------------------------------
    */

    'settings' => [
        'currency' => 'MYR',
        'country' => 'MY',
        'langcode' => 'en',
    ],
];