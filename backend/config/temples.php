<?php
return [
    'temples' => [
        'temple1' => [
            'id' => 'temple1',
            'database' => 'temple1',  // Links to config/database.php
            'status' => 'active'          // Basic status for initial check
        ],
        'temple2' => [
            'id' => 'temple2',
            'database' => 'temple2',
            'status' => 'active'
        ],
        'temple3' => [
            'id' => 'temple3',
            'database' => 'temple3',
            'status' => 'active'
        ],
        'temple_dev' => [
			'id' => 'temple_dev',
			'database' => 'temple_dev',
			'status' => 'active' 
		],
        'citiansi' => [
			'id' => 'citiansi',
			'database' => 'citiansi',
			'status' => 'active' 
		]
    ],
    
    // Encryption key for temple identifier
    'encryption_key' => env('TEMPLE_ENCRYPTION_KEY', 'your-32-character-encryption-key'),
    
    // Cache settings
    'cache' => [
        'temple_details_ttl' => 3600,      // 1 hour
        'temple_settings_ttl' => 3600,      // 1 hour
        'current_temple_ttl' => 86400,      // 24 hours
    ],
    
    // Default values (used if database fetch fails)
    'defaults' => [
        'timezone' => 'Asia/Kolkata',
        'currency' => 'INR',
        'date_format' => 'd/m/Y',
        'time_format' => 'h:i A',
        'status' => 'active'
    ]
];