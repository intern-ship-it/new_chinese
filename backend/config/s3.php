<?php
// config/s3.php
// S3 Configuration for Temple Management System

return [
    /*
    |--------------------------------------------------------------------------
    | AWS S3 Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your AWS S3 bucket settings here. These values are used
    | when uploading signatures and other files to S3.
    |
    */

    'credentials' => [
        'key'    => env('AWS_ACCESS_KEY_ID', ''),
        'secret' => env('AWS_SECRET_ACCESS_KEY', ''),
        'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-1'), // Singapore region, change as needed
    ],

    'bucket' => env('AWS_BUCKET', ''),
    
    'url' => env('AWS_URL', ''),
    
    'endpoint' => env('AWS_ENDPOINT', ''),
    
    'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),

    /*
    |--------------------------------------------------------------------------
    | File Storage Settings
    |--------------------------------------------------------------------------
    */
    
    'signatures' => [
        'path' => 'signatures', // Base path in S3 bucket
        'max_size' => 2048, // Maximum file size in KB (2MB)
        'allowed_types' => ['image/jpeg', 'image/png', 'image/jpg'],
        'allowed_extensions' => ['jpg', 'jpeg', 'png'],
        'quality' => 90, // Image quality for compression (1-100)
        'max_width' => 800,
        'max_height' => 400,
    ],

    /*
    |--------------------------------------------------------------------------
    | S3 Storage Options
    |--------------------------------------------------------------------------
    */
    
    'options' => [
        'visibility' => 'public', // Changed to public since your bucket has public read
        'CacheControl' => 'max-age=31536000',
        'ACL' => 'public-read', // Add ACL for public read
    ],

    /*
    |--------------------------------------------------------------------------
    | CDN/CloudFront Settings (Optional)
    |--------------------------------------------------------------------------
    */
    
    'cdn_url' => env('AWS_CDN_URL', ''),
    
    /*
    |--------------------------------------------------------------------------
    | Temporary URL Settings
    |--------------------------------------------------------------------------
    */
    
    'temp_url_expiration' => 60, // Minutes
];

// .env additions needed:
/*
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=your-bucket-name
AWS_URL=https://your-bucket.s3.amazonaws.com
AWS_ENDPOINT=
AWS_USE_PATH_STYLE_ENDPOINT=false
AWS_CDN_URL=
*/