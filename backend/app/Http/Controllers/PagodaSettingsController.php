<?php

namespace App\Http\Controllers;

use App\Models\PagodaBookingSetting;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PagodaSettingsController extends Controller
{
    use ApiResponse;

    /**
     * Get all settings
     */
    public function index()
    {
        try {
            $settings = PagodaBookingSetting::all()->map(function($setting) {
                return [
                    'key' => $setting->setting_key,
                    'value' => $setting->getValue(),
                    'type' => $setting->setting_type,
                    'description' => $setting->description,
                    'is_system' => $setting->is_system
                ];
            });

            return $this->successResponse($settings, 'Settings retrieved successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve settings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single setting by key
     */
    public function show($key)
    {
        try {
            $setting = PagodaBookingSetting::where('setting_key', $key)->first();

            if (!$setting) {
                return $this->notFoundResponse('Setting not found');
            }

            return $this->successResponse([
                'key' => $setting->setting_key,
                'value' => $setting->getValue(),
                'type' => $setting->setting_type,
                'description' => $setting->description
            ], 'Setting retrieved successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve setting: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update or create setting
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'setting_key' => 'required|string|max:100',
            'setting_value' => 'required',
            'setting_type' => 'required|in:string,number,boolean,json',
            'description' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            $value = $request->setting_value;
            
            // Convert value based on type
            if ($request->setting_type === 'json' && is_array($value)) {
                $value = json_encode($value);
            }

            $setting = PagodaBookingSetting::updateOrCreate(
                ['setting_key' => $request->setting_key],
                [
                    'setting_value' => $value,
                    'setting_type' => $request->setting_type,
                    'description' => $request->description,
                    'is_system' => false
                ]
            );

            return $this->successResponse(
                [
                    'key' => $setting->setting_key,
                    'value' => $setting->getValue(),
                    'type' => $setting->setting_type
                ],
                'Setting saved successfully'
            );

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to save setting: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update multiple settings at once
     */
    public function bulkUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'required',
            'settings.*.type' => 'required|in:string,number,boolean,json'
        ]);

        if ($validator->fails()) {
            return $this->validationErrorResponse($validator->errors());
        }

        try {
            foreach ($request->settings as $settingData) {
                $value = $settingData['value'];
                
                if ($settingData['type'] === 'json' && is_array($value)) {
                    $value = json_encode($value);
                }

                PagodaBookingSetting::updateOrCreate(
                    ['setting_key' => $settingData['key']],
                    [
                        'setting_value' => $value,
                        'setting_type' => $settingData['type']
                    ]
                );
            }

            return $this->successResponse(null, 'Settings updated successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update settings: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete setting (only non-system settings)
     */
    public function destroy($key)
    {
        try {
            $setting = PagodaBookingSetting::where('setting_key', $key)->first();

            if (!$setting) {
                return $this->notFoundResponse('Setting not found');
            }

            if ($setting->is_system) {
                return $this->errorResponse('Cannot delete system setting', 400);
            }

            $setting->delete();

            return $this->successResponse(null, 'Setting deleted successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to delete setting: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get booking configuration settings
     */
    public function getBookingConfig()
    {
        try {
            $config = [
                'assignment_mode' => PagodaBookingSetting::get('assignment_mode', 'both'),
                'expiry_duration_months' => PagodaBookingSetting::get('expiry_duration_months', 12),
                'reminders' => [
                    '60_days' => PagodaBookingSetting::get('reminder_60_days', true),
                    '30_days' => PagodaBookingSetting::get('reminder_30_days', true),
                    '7_days' => PagodaBookingSetting::get('reminder_7_days', true)
                ],
                'whatsapp_enabled' => PagodaBookingSetting::get('whatsapp_enabled', true),
                'email_fallback' => PagodaBookingSetting::get('email_fallback', true)
            ];

            return $this->successResponse($config, 'Booking configuration retrieved successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve configuration: ' . $e->getMessage(), 500);
        }
    }
}