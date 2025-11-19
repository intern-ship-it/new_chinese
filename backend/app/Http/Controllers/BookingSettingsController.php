<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BookingSettingsController extends Controller
{
    /**
     * Get all booking settings or by type
     */
    public function index(Request $request)
    {
        try {
            $type = $request->get('type');
            
            $query = DB::table('booking_settings');
            
            if ($type) {
                $query->where('type', $type);
            }
            
            $settings = $query->orderBy('type')->orderBy('key')->get();
            
            // Group settings by type for easier frontend consumption
            $grouped = [];
            foreach ($settings as $setting) {
                if (!isset($grouped[$setting->type])) {
                    $grouped[$setting->type] = [];
                }
                $grouped[$setting->type][$setting->key] = [
                    'id' => $setting->id,
                    'value' => $setting->value,
                    'description' => $setting->description
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => $grouped
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch booking settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update booking settings by type
     */
    public function update(Request $request)
    {
        try {
            $type = $request->input('type');
            $settings = $request->input('settings');
            
            if (!$type || !$settings) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type and settings are required'
                ], 400);
            }
            
            DB::beginTransaction();
            
            foreach ($settings as $key => $value) {
                DB::table('booking_settings')->updateOrInsert(
                    ['key' => $key],
                    [
                        'value' => is_array($value) ? json_encode($value) : $value,
                        'type' => $type,
                        'updated_at' => now()
                    ]
                );
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Reset settings to defaults for a specific type
     */
    public function reset(Request $request)
    {
        try {
            $type = $request->input('type');
            
            if (!$type) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type is required'
                ], 400);
            }
            
            // Define default settings
            $defaults = $this->getDefaultSettings($type);
            
            DB::beginTransaction();
            
            // Delete existing settings for this type
            DB::table('booking_settings')->where('type', $type)->delete();
            
            // Insert defaults
            foreach ($defaults as $key => $config) {
                DB::table('booking_settings')->insert([
                    'key' => $key,
                    'value' => $config['value'],
                    'description' => $config['description'],
                    'type' => $type,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Settings reset to defaults successfully'
            ]);
            
        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'success' => false,
                'message' => 'Failed to reset settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get default settings by type
     */
    private function getDefaultSettings($type)
    {
        $defaults = [
            'GENERAL' => [
                'secondary_language' => [
                    'value' => '',
                    'description' => 'Secondary language for all masters'
                ],
                'print_option' => [
                    'value' => 'SINGLE_PRINT',
                    'description' => 'Print option for receipts'
                ],
                'is_tender_concept' => [
                    'value' => '0',
                    'description' => 'Enable tender concept'
                ],
                'is_discount' => [
                    'value' => '0',
                    'description' => 'Enable discount feature'
                ],
                'discount_ledger_id' => [
                    'value' => '',
                    'description' => 'Ledger for discount entries'
                ],
                'is_deposit' => [
                    'value' => '0',
                    'description' => 'Enable deposit feature'
                ],
                'deposit_ledger_id' => [
                    'value' => '',
                    'description' => 'Ledger for deposit entries'
                ]
            ],
            'ARCHANAI' => [
                'slogan' => [
                    'value' => '',
                    'description' => 'Slogan to print on receipts'
                ],
                    'minimum_deposit_amount' => [
                'value' => '0',
                'description' => 'Minimum deposit amount required for archanai bookings'
            ],
                'printer_mappings' => [
                    'value' => '[]',
                    'description' => 'Staff to printer mappings'
                ],
                'print_design_template' => [
                    'value' => 'template1',
                    'description' => 'Print template design'
                ],
                'header_font_size' => [
                    'value' => '16',
                    'description' => 'Header font size for printing'
                ],
                'content_font_size' => [
                    'value' => '12',
                    'description' => 'Content font size for printing'
                ],
                'enable_barcode' => [
                    'value' => '0',
                    'description' => 'Enable barcode on receipts'
                ],
                'enable_qr_code' => [
                    'value' => '0',
                    'description' => 'Enable QR code on receipts'
                ]
            ]
        ];
        
        return $defaults[$type] ?? [];
    }
	public function get_all_settings(Request $request)
    {
		try {
            $type = !empty($request->input('type')) ? $request->input('type') : '';
			if(!empty($type)){
				$booking_settings = DB::table('booking_settings')->where('type', $type)->get();
			}else $booking_settings = DB::table('booking_settings')->get();
			$sett = array();
			if(!empty($booking_settings)){
				foreach($booking_settings as $bs){
					if($bs->key == 'printer_mappings') $bs->value = json_decode($bs->value, true);
					$sett[$bs->type][] = $bs;
				}
			}
			return response()->json([
                'success' => true,
                'data' => $sett,
                'message' => 'Settings updated successfully'
            ]);
		} catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
}