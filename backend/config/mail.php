<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    */

    'default' => 'smtp', // ✅ CHANGED FROM env('MAIL_MAILER', 'log') TO 'smtp'

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'host' => 'smtp.gmail.com',          // ✅ Gmail SMTP host
            'port' => 587,                        // ✅ Port for TLS
            'username' => 'haripriyagrasp@gmail.com',  // ✅ Your Gmail
            'password' => 'hvtwkyagammfoedi',      // ✅ Your App Password
            'encryption' => 'tls',                // ✅ TLS encryption
            'timeout' => null,
            'local_domain' => parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST),
        ],

        'ses' => [
            'transport' => 'ses',
        ],

        'postmark' => [
            'transport' => 'postmark',
        ],

        'resend' => [
            'transport' => 'resend',
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => '/usr/sbin/sendmail -bs -i',
        ],

        'log' => [
            'transport' => 'log',
            'channel' => null,
        ],

        'array' => [
            'transport' => 'array',
        ],

        'failover' => [
            'transport' => 'failover',
            'mailers' => [
                'smtp',
                'log',
            ],
            'retry_after' => 60,
        ],

        'roundrobin' => [
            'transport' => 'roundrobin',
            'mailers' => [
                'ses',
                'postmark',
            ],
            'retry_after' => 60,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    */

    'from' => [
        'address' => 'haripriyagrasp@gmail.com',  // ✅ From email address
        'name' => 'Temple Management System',      // ✅ From name
    ],

];