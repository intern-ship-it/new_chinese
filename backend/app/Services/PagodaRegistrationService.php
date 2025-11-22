<?php

namespace App\Services;

use App\Models\PagodaDevotee;
use App\Models\PagodaLightRegistration;
use App\Models\PagodaLightSlot;
use App\Models\PagodaRenewalReminder;
use App\Models\PagodaBookingSetting;  // ← ADD THIS IMPORT
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PagodaRegistrationService
{
    protected $lightService;

    public function __construct(PagodaLightService $lightService)
    {
        $this->lightService = $lightService;  // ← FIXED: Removed extra $
    }

    /**
     * Create new light registration
     */
    public function createRegistration(array $data)
    {
        DB::beginTransaction();

        try {
            // 1. Find or create devotee
            $devotee = $this->findOrCreateDevotee($data['devotee']);

            // 2. Get light slot (auto or manual)
            $lightSlot = $this->assignLightSlot($data);

            if (!$lightSlot) {
                throw new \Exception('No available light found');
            }

            if (!$lightSlot->isAvailable()) {
                throw new \Exception('Selected light is not available');
            }

            // 3. Generate receipt number
            $receiptNumber = $data['receipt_number'] ?? $this->lightService->generateReceiptNumber();

            // 4. Calculate expiry date (use provided or calculate)
            $expiryDate = $data['expiry_date'] ?? $this->lightService->calculateExpiryDate($data['offer_date']);

            // 5. Create registration
            $registration = PagodaLightRegistration::create([
                'devotee_id' => $devotee->id,
                'light_slot_id' => $lightSlot->id,
                'light_number' => $lightSlot->light_number,
                'light_code' => $lightSlot->light_code,
                'tower_code' => $lightSlot->block->tower->tower_code,
                'block_code' => $lightSlot->block->block_code,
                'floor_number' => $lightSlot->floor_number,
                'rag_position' => $lightSlot->rag_position,
                'light_option' => $data['light_option'],
                'merit_amount' => $data['merit_amount'],
                'offer_date' => $data['offer_date'],
                'expiry_date' => $expiryDate,
                'payment_method' => $data['payment_method'] ?? null,
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_mode_id' => $data['payment_mode_id'] ?? null,
                'receipt_number' => $receiptNumber,
                'staff_id' => auth()->id(),
                'status' => 'active',
                'remarks' => $data['remarks'] ?? null
            ]);

            // 6. Update light slot status
            $lightSlot->markAsRegistered($registration->id);

            // 7. Create renewal reminders
            $this->createRenewalReminders($registration);

            DB::commit();

            return [
                'success' => true,
                'registration' => $registration->load(['devotee', 'lightSlot.block.tower']),
                'message' => 'Light registration created successfully'
            ];
        } catch (\Exception $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Find or create devotee
     */
    protected function findOrCreateDevotee(array $devoteeData)
    {
        // If devotee ID is provided, return existing devotee
        if (!empty($devoteeData['id'])) {
            return PagodaDevotee::findOrFail($devoteeData['id']);
        }

        // Check if devotee exists by NRIC
        $devotee = PagodaDevotee::where('nric', $devoteeData['nric'])->first();

        if ($devotee) {
            // Update existing devotee info
            $devotee->update([
                'name_chinese' => $devoteeData['name_chinese'] ?? $devotee->name_chinese,
                'name_english' => $devoteeData['name_english'] ?? $devotee->name_english,
                'contact_no' => $devoteeData['contact_no'] ?? $devotee->contact_no,
                'email' => $devoteeData['email'] ?? $devotee->email,
                'address' => $devoteeData['address'] ?? $devotee->address,
            ]);
            return $devotee;
        }

        // Create new devotee
        return PagodaDevotee::create($devoteeData);
    }

    /**
     * Assign light slot (auto or manual)
     */
    protected function assignLightSlot(array $data)
    {
        // Manual selection by light_slot_id
        if (!empty($data['light_slot_id'])) {
            return PagodaLightSlot::with(['block.tower'])->find($data['light_slot_id']);
        }

        // Manual selection by light_number
        if (!empty($data['light_number'])) {
            return PagodaLightSlot::with(['block.tower'])
                ->where('light_number', $data['light_number'])
                ->first();
        }

        // Auto assignment
        $blockId = $data['block_id'] ?? null;
        return $this->lightService->getNextAvailableLight($blockId);
    }


    /**
     * Create renewal reminders
     */
    protected function createRenewalReminders(PagodaLightRegistration $registration)
    {
        $expiryDate = Carbon::parse($registration->expiry_date);
        $reminders = [];

        // 60 days reminder
        if (PagodaBookingSetting::get('reminder_60_days', true)) {
            $reminderDate = $expiryDate->copy()->subDays(60);
            if ($reminderDate->isFuture()) {
                $reminders[] = [
                    'registration_id' => $registration->id,
                    'reminder_type' => '60_days',
                    'scheduled_date' => $reminderDate->toDateString(),
                    'delivery_status' => 'pending',
                    'created_at' => now()
                    // ← REMOVED updated_at
                ];
            }
        }

        // 30 days reminder
        if (PagodaBookingSetting::get('reminder_30_days', true)) {
            $reminderDate = $expiryDate->copy()->subDays(30);
            if ($reminderDate->isFuture()) {
                $reminders[] = [
                    'registration_id' => $registration->id,
                    'reminder_type' => '30_days',
                    'scheduled_date' => $reminderDate->toDateString(),
                    'delivery_status' => 'pending',
                    'created_at' => now()
                    // ← REMOVED updated_at
                ];
            }
        }

        // 7 days reminder
        if (PagodaBookingSetting::get('reminder_7_days', true)) {
            $reminderDate = $expiryDate->copy()->subDays(7);
            if ($reminderDate->isFuture()) {
                $reminders[] = [
                    'registration_id' => $registration->id,
                    'reminder_type' => '7_days',
                    'scheduled_date' => $reminderDate->toDateString(),
                    'delivery_status' => 'pending',
                    'created_at' => now()
                    // ← REMOVED updated_at
                ];
            }
        }

        if (!empty($reminders)) {
            DB::table('pagoda_renewal_reminders')->insert($reminders);
        }
    }

    /**
     * Renew registration
     */
    public function renewRegistration($registrationId, array $data)
    {
        DB::beginTransaction();

        try {
            $oldRegistration = PagodaLightRegistration::findOrFail($registrationId);

            // Create new registration (same light, new dates)
            $newData = array_merge($data, [
                'devotee' => [
                    'id' => $oldRegistration->devotee_id,
                    'name_english' => $oldRegistration->devotee->name_english,
                    'name_chinese' => $oldRegistration->devotee->name_chinese,
                    'nric' => $oldRegistration->devotee->nric,
                    'contact_no' => $oldRegistration->devotee->contact_no,
                    'email' => $oldRegistration->devotee->email,
                ],
                'light_number' => $oldRegistration->light_number
            ]);

            $result = $this->createRegistration($newData);

            if ($result['success']) {
                // Mark old registration as renewed
                $oldRegistration->update(['status' => 'renewed']);

                // Create renewal record
                \App\Models\PagodaLightRenewal::create([
                    'original_registration_id' => $oldRegistration->id,
                    'new_registration_id' => $result['registration']->id,
                    'renewed_by_staff_id' => auth()->id(),
                    'renewal_date' => now()->toDateString(),
                    'auto_renewed' => $data['auto_renewed'] ?? false
                ]);
            }

            DB::commit();

            return $result;
        } catch (\Exception $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Terminate registration
     */
    public function terminateRegistration($registrationId, $reason = null)
    {
        DB::beginTransaction();

        try {
            $registration = PagodaLightRegistration::findOrFail($registrationId);

            // Update registration status
            $registration->update([
                'status' => 'terminated',
                'termination_reason' => $reason,
                'termination_date' => now()
            ]);

            // Release light slot
            $registration->lightSlot->markAsAvailable();

            DB::commit();

            return [
                'success' => true,
                'message' => 'Registration terminated successfully'
            ];
        } catch (\Exception $e) {
            DB::rollBack();

            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}
