<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\BookingMeta;
use App\Models\BookingPayment;
use App\Models\PaymentMode;
use App\Models\SaleItem;
use App\Services\InventoryMigrationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class SalesController extends Controller
{
    /**
     * Inventory migration service
     *
     * @var InventoryMigrationService
     */
    protected $inventoryMigrationService;

    /**
     * Constructor
     *
     * @param InventoryMigrationService $inventoryMigrationService
     */
    public function __construct(InventoryMigrationService $inventoryMigrationService)
    {
        $this->inventoryMigrationService = $inventoryMigrationService;
    }
    
    /**
     * Booking type constant
     */
    const BOOKING_TYPE = 'SALES';
    
    /**
     * Booking number prefix (SLBD for Development, SLBL for Live)
     */
    const BOOKING_PREFIX_DEV = 'SLBD';
    const BOOKING_PREFIX_LIVE = 'SLBL';
    
    /**
     * Payment reference prefix (PYD for Development, PYL for Live)
     */
    const PAYMENT_PREFIX_DEV = 'PYD';
    const PAYMENT_PREFIX_LIVE = 'PYL';
	
	private $credentials = [
        'merchant_id' => 'SB_graspsoftware',
        'verify_key' => '3f97a57034112582ef5a1ffbe1d21a30',  // For vcode generation
        'secret_key' => '77e7bf7f53130877abdbef553725a785',   // For skey verification
    ];
	
	/* private $credentials = [
        'merchant_id' => 'graspsoftware_Dev',
        'verify_key' => '1a0a4aa7f78747645062f84e09dd53a7',  // For vcode generation
        'secret_key' => 'ea441e6c806e08f22d2e6ab5afacb33f',   // For skey verification
    ]; */

    // URLs from documentation
    private $sandboxPaymentUrl = 'https://sandbox-payment.fiuu.com/RMS/pay/';
    private $productionPaymentUrl = 'https://pay.fiuu.com/RMS/pay/';
    
    private $sandboxApiUrl = 'https://sandbox-api.fiuu.com';
    private $productionApiUrl = 'https://api.fiuu.com';
    
    private $isSandbox = true;

    /**
     * Store a new POS Sales order
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'booking_date' => 'required|date',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0|lte:total_amount',
            'deposit_amount' => 'nullable|numeric|min:0',
            'print_option' => 'required|in:NO_PRINT,SINGLE_PRINT,SEP_PRINT',
            'special_instructions' => 'nullable|string',
            
            // Items validation
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer',
            'items.*.deity_id' => 'nullable|integer',
            'items.*.name_primary' => 'required|string|max:255',
            'items.*.name_secondary' => 'nullable|string|max:255',
            'items.*.short_code' => 'nullable|string|max:50',
            'items.*.sale_type' => 'required|string|max:50',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.total' => 'required|numeric|min:0',
            'items.*.vehicles' => 'nullable|array',
            
            // Devotee details (optional)
            'devotee.name' => 'nullable|string|max:255',
            'devotee.email' => 'nullable|email|max:255',
            'devotee.nric' => 'nullable|string|max:50',
            'devotee.phone_code' => 'nullable|string|max:10',
            'devotee.phone' => 'nullable|string|max:50',
            'devotee.dob' => 'nullable|date',
            'devotee.address' => 'nullable|string',
            'devotee.remarks' => 'nullable|string',
            
            // Payment validation
            'payment.amount' => 'required|numeric|min:0',
            'payment.payment_mode_id' => 'required|exists:payment_modes,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();

        try {
            $user = $request->user();
            $isLive = config('app.env') === 'production';
            
            // Get payment mode details
            $paymentMode = PaymentMode::find($request->input('payment.payment_mode_id'));
            
            if (!$paymentMode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payment mode'
                ], 422);
            }
            
            // Check if this is a payment gateway transaction
            $isPaymentGateway = $paymentMode->is_payment_gateway == true;
            
            // Generate booking number
            $bookingNumber = $this->generateBookingNumber($isLive);
            
            // Determine payment status and booking status
            $paidAmount = $request->input('paid_amount');
            $totalAmount = $request->input('total_amount');
            $booking_through = !empty($request->input('booking_through')) ? $request->input('booking_through') : 'ADMIN';
            
            // For payment gateway, initial status is PENDING
            if ($isPaymentGateway) {
                $bookingStatus = 'PENDING';
                $paymentStatus = 'PENDING';
            } else {
                $bookingStatus = 'CONFIRMED';
                $paymentStatus = $this->determinePaymentStatus($paidAmount, $totalAmount);
            }
            
            // Create booking record
            $booking = Booking::create([
                'booking_number' => $bookingNumber,
                'booking_type' => self::BOOKING_TYPE,
                'devotee_id' => null,
                'booking_date' => Carbon::parse($request->input('booking_date')),
                'booking_status' => $bookingStatus,
                'payment_status' => $paymentStatus,
                'subtotal' => $request->input('subtotal'),
                'tax_amount' => 0,
                'discount_amount' => $request->input('discount_amount', 0),
                'deposit_amount' => $request->input('deposit_amount', 0),
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'payment_method' => $paymentMode->name,
                'print_option' => $request->input('print_option'),
                'special_instructions' => $request->input('special_instructions'),
                'booking_through' => $booking_through,
                'commission_migration' => 0,
                'inventory_migration' => 0,
                'account_migration' => 0,
                'created_by' => $user->id,
                'user_id' => $user->id,
            ]);

            // Create booking items
            $items = $request->input('items');
            foreach ($items as $item) {
                $itemStatus = $isPaymentGateway ? 'PENDING' : 'COMPLETED';
                
                $bookingItem = BookingItem::create([
                    'booking_id' => $booking->id,
                    'item_type' => $item['sale_type'],
                    'item_id' => $item['id'],
                    'deity_id' => $item['deity_id'] ?? null,
                    'item_name' => $item['name_primary'],
                    'item_name_secondary' => $item['name_secondary'] ?? null,
                    'short_code' => $item['short_code'] ?? null,
                    'service_date' => Carbon::parse($request->input('booking_date')),
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['price'],
                    'total_price' => $item['total'],
                    'status' => $itemStatus,
                    'notes' => null,
                ]);

                // Save vehicle details to booking_item_meta if present
                if (!empty($item['vehicles']) && is_array($item['vehicles'])) {
                    foreach ($item['vehicles'] as $index => $vehicle) {
                        if (!empty($vehicle['number'])) {
                            DB::table('booking_item_meta')->insert([
                                'id' => \Illuminate\Support\Str::uuid()->toString(),
                                'booking_item_id' => $bookingItem->id,
                                'meta_key' => 'vehicle_number_' . ($index + 1),
                                'meta_value' => $vehicle['number'],
                                'meta_type' => 'STRING',
                                'created_at' => now(),
                            ]);
                        }
                        
                        if (!empty($vehicle['type'])) {
                            DB::table('booking_item_meta')->insert([
                                'id' => \Illuminate\Support\Str::uuid()->toString(),
                                'booking_item_id' => $bookingItem->id,
                                'meta_key' => 'vehicle_type_' . ($index + 1),
                                'meta_value' => $vehicle['type'],
                                'meta_type' => 'STRING',
                                'created_at' => now(),
                            ]);
                        }
                        
                        if (!empty($vehicle['owner'])) {
                            DB::table('booking_item_meta')->insert([
                                'id' => \Illuminate\Support\Str::uuid()->toString(),
                                'booking_item_id' => $bookingItem->id,
                                'meta_key' => 'vehicle_owner_' . ($index + 1),
                                'meta_value' => $vehicle['owner'],
                                'meta_type' => 'STRING',
                                'created_at' => now(),
                            ]);
                        }
                    }
                }
            }

            // Store devotee information if provided
            $devotee = $request->input('devotee');
            if (!empty($devotee)) {
                $this->storeDevoteeInfo($booking->id, $devotee);
            }

            // Generate payment reference
            $paymentReference = $this->generatePaymentReference($isLive);
			
			if ($isPaymentGateway) {
                $paymentStatus = 'PENDING';
            } else {
                $paymentStatus = 'SUCCESS';
            }

            // Create payment record
            $payment = BookingPayment::create([
                'booking_id' => $booking->id,
                'payment_date' => now(),
                'amount' => $request->input('payment.amount'),
                'payment_mode_id' => $paymentMode->id,
                'payment_method' => $paymentMode->name,
                'payment_reference' => $paymentReference,
                'transaction_id' => null,
                'payment_type' => 'FULL',
                'payment_status' => $paymentStatus,
                'notes' => $isPaymentGateway ? 'Payment gateway transaction pending' : null,
                'created_by' => $user->id,
                'paid_through' => $booking_through,
            ]);

            // If payment gateway, generate payment URL and return
            if ($isPaymentGateway) {
                DB::commit();
                
                // Generate payment URL using FiuuPaymentController
                $paymentUrl = route('pos-sales.payment_process') . '?temple_id=' . $request->header('X-Temple-ID') . '&payment_id=' . $payment->id;
                
                Log::info('Payment gateway transaction initiated', [
                    'booking_id' => $booking->id,
                    'booking_number' => $bookingNumber,
                    'payment_url' => $paymentUrl
                ]);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Booking created successfully. Please complete payment.',
                    'data' => [
                        'booking_id' => $booking->id,
                        'booking_number' => $bookingNumber,
                        'payment_url' => $paymentUrl,
                        'total_amount' => $totalAmount,
                        'payment_status' => 'PENDING'
                    ]
                ], 201);
            }

            // For non-gateway payments, process immediately
            // Migrate inventory
            $this->migrateInventory($booking->id);

            // Migrate to accounting
            $this->migrateAccounting($booking->id);

            DB::commit();

            Log::info('Sales order created successfully', [
                'booking_id' => $booking->id,
                'booking_number' => $bookingNumber
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sales order created successfully',
                'data' => [
                    'booking_id' => $booking->id,
                    'booking_number' => $bookingNumber,
                    'total_amount' => $totalAmount,
                    'paid_amount' => $paidAmount,
					'payment_status' => 'SUCCESS'
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error creating sales order', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create sales order: ' . $e->getMessage()
            ], 500);
        }
    }

	public function payment_process(Request $request){
		$b_payment = BookingPayment::find($request->payment_id);
		if($b_payment->payment_status == 'PENDING'){
			$booking = Booking::find($b_payment->booking_id);
			$metas = BookingMeta::where('booking_id', $b_payment->booking_id)
				->whereIn('meta_key', array('devotee_name', 'devotee_email', 'devotee_phone'))
				->get(['meta_key', 'meta_value'])
				->pluck('meta_value', 'meta_key');

			// Ensure all keys exist with empty string as default
			$devotee_name = $metas->get('devotee_name', '');
			$devotee_email = $metas->get('devotee_email', '');
			$devotee_phone = $metas->get('devotee_phone', '');
			$payment_reference = $b_payment->payment_reference;
			
			// Prepare payment data according to Fiuu specification
			$paymentData = [
				'merchant_id' => $this->credentials['merchant_id'],
				'orderid' => $payment_reference,
				'amount' => number_format($b_payment->amount, 2, '.', ''),
				'currency' => 'MYR',
				'bill_name' => $devotee_name ?? 'Customer',
				'bill_email' => $devotee_email ?? 'noreply@temple.com',
				'bill_mobile' => $devotee_phone ?? '',
				'bill_desc' => 'POS Sales Order - ' . $booking->booking_number,
				'country' => 'MY', // India
				'returnurl' => route('fiuu.payment.callback') . '?temple_id=' . $request->temple_id,
				'callbackurl' => route('fiuu.payment.webhook') . '?temple_id=' . $request->temple_id,
				'cancelurl' => route('fiuu.payment.cancel') . '?temple_id=' . $request->temple_id,
				'langcode' => 'en'
			];

			// Generate vcode according to Fiuu specification (Page 18-19)
			// With extended vcode enabled: md5(amount + merchantID + orderid + verify_key + currency)
			$vcodeString = $paymentData['amount'] . 
						  $paymentData['merchant_id'] . 
						  $paymentData['orderid'] . 
						  $this->credentials['verify_key']; 
						  // $paymentData['currency'];
			
			$paymentData['vcode'] = md5($vcodeString);

			return view('payment.fiuu-redirect', [
				'paymentData' => $paymentData,
				'gatewayUrl' => $this->isSandbox ? 
					$this->sandboxPaymentUrl . $this->credentials['merchant_id'] . '/' :
					$this->productionPaymentUrl . $this->credentials['merchant_id'] . '/'
			]);
		}
	}
	
	public function getPaymentStatus($id)
	{
		try {
			// Try to find by ID first, then by booking_number
			$booking = Booking::where('id', $id)
				->orWhere('booking_number', $id)
				->with(['payment']) // Now this will work with the hasOne relationship
				->first();
			
			if (!$booking) {
				return response()->json([
					'success' => false,
					'message' => 'Booking not found'
				], 404);
			}
			
			// Prepare payment data - handle case where payment might not exist
			$paymentData = null;
			if ($booking->payment) {
				$paymentData = [
					'payment_id' => $booking->payment->id,
					'transaction_id' => $booking->payment->transaction_id,
					'payment_reference' => $booking->payment->payment_reference,
					'amount' => $booking->payment->amount,
					'payment_method' => $booking->payment->payment_method,
					'payment_status' => $booking->payment->payment_status,
					'payment_date' => $booking->payment->payment_date
				];
			}
			
			return response()->json([
				'success' => true,
				'message' => 'Payment status retrieved successfully',
				'data' => [
					'booking_id' => $booking->id,
					'booking_number' => $booking->booking_number,
					'booking_status' => $booking->booking_status,
					'payment_status' => $booking->payment_status,
					'total_amount' => $booking->total_amount,
					'paid_amount' => $booking->paid_amount,
					'payment' => $paymentData
				]
			], 200);
			
		} catch (\Exception $e) {
			Log::error('Error getting payment status', [
				'booking_id' => $id,
				'error' => $e->getMessage(),
				'trace' => $e->getTraceAsString()
			]);
			
			return response()->json([
				'success' => false,
				'message' => 'Error fetching payment status: ' . $e->getMessage()
			], 500);
		}
	}

    /**
     * Handle payment callback from Fiuu
     * This is called when customer returns to site after payment
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handlePaymentCallback(Request $request)
    {
        Log::info('Fiuu Payment Callback Received', $request->all());

        try {
			$response_data = $request->all();
            $orderid = $request->get('orderid');
            $status = $request->get('status');
            $tranID = $request->get('tranID');
            $amount = $request->get('amount');
			$payment = BookingPayment::where('payment_reference', $orderid)->first();
			if (!$payment) {
                Log::error('Payment record not found', ['booking_id' => $payment->booking_id]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Payment record not found'
                ], 404);
            }
			
            // Find booking by booking_number
            $booking = Booking::where('id', $payment->booking_id)->first();
            
            if (!$booking) {
                Log::error('Booking not found for payment callback', ['booking_id' => $payment->booking_id]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found'
                ], 404);
            }

            $paymentMode = PaymentMode::find($payment->payment_mode_id);
            
            // Verify signature
            /* if (!$this->verifyFiuuSignature($request, $paymentMode)) {
                Log::error('Fiuu signature verification failed', [
                    'booking_number' => $orderid
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Security verification failed'
                ], 403);
            } */

            // Process based on status
            if ($status == '00') { // Success
                $this->processSuccessfulPayment($booking, $payment, $tranID, $request->all());
                
                return view('payment.success', [
                    'order_no' => $response_data['orderid'],
                    'transaction_id' => $response_data['tranID'],
                    'amount' => $response_data['amount'],
                    'currency' => $response_data['currency'],
                    'payment_date' => $response_data['paydate'],
                    'channel' => $response_data['channel']
                ]);
            } elseif ($status == '11') { // Failed
                $this->processFailedPayment($booking, $payment, $request->all());
                
                return view('payment.failed', [
                    'message' => $response_data['error_desc'] ?? 'Payment failed',
                    'error_code' => $response_data['error_code'],
                    'order_no' => $response_data['orderid']
                ]);
            } elseif ($status == '22') { // Pending
                return view('payment.pending', [
					'order_no' => $response_data['orderid'],
					'transaction_id' => $response_data['tranID'] ?? null,
					'amount' => $response_data['amount'] ?? null,
					'message' => $response_data['error_desc'] ?? 'Payment is pending confirmation'
				]);
            }  else {
                $this->processFailedPayment($booking, $payment, $request->all());
                
                return view('payment.failed', [
                    'message' => 'Unknown payment status: ' . $response_data['status'],
                    'order_no' => $response_data['orderid']
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error processing payment callback', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing payment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle webhook notification from Fiuu
     * This is called asynchronously by Fiuu
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function handlePaymentWebhook(Request $request)
    {
        Log::info('Fiuu Payment Webhook Received', $request->all());

        $nbcb = $request->get('nbcb');
        
        // Handle callback token request
        if ($nbcb == '1') {
            echo "CBTOKEN:MPSTATOK";
            return;
        }

        try {
            $orderid = $request->get('orderid');
            $status = $request->get('status');
            $tranID = $request->get('tranID');
            
            // Find booking
            $booking = Booking::where('booking_number', $orderid)->first();
            
            if (!$booking) {
                Log::error('Booking not found for webhook', ['orderid' => $orderid]);
                return response('Booking not found', 404);
            }

            // Get payment record
            $payment = BookingPayment::where('booking_id', $booking->id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if (!$payment) {
                Log::error('Payment record not found for webhook', ['booking_id' => $booking->id]);
                return response('Payment not found', 404);
            }

            $paymentMode = PaymentMode::find($payment->payment_mode_id);
            
            // Verify signature
            if (!$this->verifyFiuuSignature($request, $paymentMode)) {
                Log::error('Webhook signature verification failed');
                return response('Invalid signature', 403);
            }

            // Process based on status
            if ($status == '00') { // Success
                $this->processSuccessfulPayment($booking, $payment, $tranID, $request->all());
            } elseif ($status == '11') { // Failed
                $this->processFailedPayment($booking, $payment, $request->all());
            }

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('Error processing webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response('Error', 500);
        }
    }

    /**
     * Verify Fiuu signature
     *
     * @param Request $request
     * @param PaymentMode $paymentMode
     * @return bool
     */
    private function verifyFiuuSignature($request, $paymentMode)
    {
        $tranID = $request->get('tranID');
        $orderid = $request->get('orderid');
        $status = $request->get('status');
        $domain = $request->get('domain');
        $amount = $request->get('amount');
        $currency = $request->get('currency');
        $paydate = $request->get('paydate');
        $appcode = $request->get('appcode');
        $skey = $request->get('skey');

        // Calculate expected skey
        // $pre_skey = md5($tranID . $orderid . $status . $domain . $amount . $currency);
        $pre_skey = md5($tranID . $orderid . $status . $domain . $amount);
        $calculated_skey = md5($paydate . $domain . $pre_skey . $appcode . $paymentMode->password);

        return $calculated_skey === $skey;
    }

    /**
     * Process successful payment
     *
     * @param Booking $booking
     * @param BookingPayment $payment
     * @param string $transactionId
     * @param array $paymentResponse
     * @return void
     */
    private function processSuccessfulPayment($booking, $payment, $transactionId, $paymentResponse)
    {
        DB::beginTransaction();

        try {
            // Update payment record
            $payment->update([
                'payment_status' => 'SUCCESS',
                'transaction_id' => $transactionId,
                'payment_response' => json_encode($paymentResponse),
                'notes' => 'Payment completed successfully via Fiuu',
                'updated_at' => now()
            ]);

            // Update booking status
            $booking->update([
                'booking_status' => 'CONFIRMED',
                'payment_status' => 'PAID',
                'updated_at' => now()
            ]);

            // Update booking items status
            BookingItem::where('booking_id', $booking->id)
                ->update(['status' => 'COMPLETED']);

            // Run inventory migration
            $this->migrateInventory($booking->id);

            // Run account migration
            $this->migrateAccounting($booking->id);

            DB::commit();

            Log::info('Payment processed successfully', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number,
                'transaction_id' => $transactionId
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error processing successful payment', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    /**
     * Process failed payment
     *
     * @param Booking $booking
     * @param BookingPayment $payment
     * @param array $paymentResponse
     * @return void
     */
    private function processFailedPayment($booking, $payment, $paymentResponse)
    {
        try {
            // Update payment record
            $payment->update([
                'payment_status' => 'FAILED',
                'payment_response' => json_encode($paymentResponse),
                'notes' => 'Payment failed: ' . ($paymentResponse['error_desc'] ?? 'Unknown error'),
                'updated_at' => now()
            ]);

            // Update booking status
            $booking->update([
                'booking_status' => 'CANCELLED',
                'payment_status' => 'FAILED',
                'updated_at' => now()
            ]);

            Log::info('Payment marked as failed', [
                'booking_id' => $booking->id,
                'booking_number' => $booking->booking_number
            ]);

        } catch (\Exception $e) {
            Log::error('Error processing failed payment', [
                'booking_id' => $booking->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Generate unique booking number
     *
     * @param bool $isLive
     * @return string
     */
    private function generateBookingNumber($isLive)
    {
        $prefix = $isLive ? self::BOOKING_PREFIX_LIVE : self::BOOKING_PREFIX_DEV;
        $year = date('y');
        $month = date('m');
        
        // Get last booking number for the month
        $lastBooking = Booking::where('booking_type', self::BOOKING_TYPE)
            ->where('booking_number', 'like', $prefix . $year . $month . '%')
            ->orderBy('booking_number', 'desc')
            ->first();
        
        $lastNumber = 0;
        if ($lastBooking) {
            $lastNumber = (int)substr($lastBooking->booking_number, -5);
        }
        
        $newNumber = str_pad($lastNumber + 1, 5, '0', STR_PAD_LEFT);
        
        return $prefix . $year . $month . $newNumber;
    }

    /**
     * Generate unique payment reference
     *
     * @param bool $isLive
     * @return string
     */
    private function generatePaymentReference($isLive)
    {
        $prefix = $isLive ? self::PAYMENT_PREFIX_LIVE : self::PAYMENT_PREFIX_DEV;
        $year = date('y');
        $month = date('m');
        
        // Get last payment reference for the month
        $lastPayment = BookingPayment::where('payment_reference', 'like', $prefix . $year . $month . '%')
            ->orderBy('payment_reference', 'desc')
            ->first();
        
        $lastNumber = 0;
        if ($lastPayment) {
            $lastNumber = (int)substr($lastPayment->payment_reference, -5);
        }
        
        $newNumber = str_pad($lastNumber + 1, 5, '0', STR_PAD_LEFT);
        
        return $prefix . $year . $month . $newNumber;
    }

    /**
     * Determine payment status based on amounts
     *
     * @param float $paidAmount
     * @param float $totalAmount
     * @return string
     */
    private function determinePaymentStatus($paidAmount, $totalAmount)
    {
        if ($paidAmount >= $totalAmount) {
            return 'PAID';
        } elseif ($paidAmount > 0) {
            return 'PARTIAL';
        } else {
            return 'PENDING';
        }
    }

    /**
     * Store devotee information in booking meta
     *
     * @param string $bookingId
     * @param array $devotee
     * @return void
     */
    private function storeDevoteeInfo($bookingId, $devotee)
    {
        $metaData = [
            'devotee_name' => $devotee['name'] ?? null,
            'devotee_email' => $devotee['email'] ?? null,
            'devotee_nric' => $devotee['nric'] ?? null,
            'devotee_phone_code' => $devotee['phone_code'] ?? null,
            'devotee_phone' => $devotee['phone'] ?? null,
            'devotee_dob' => $devotee['dob'] ?? null,
            'devotee_address' => $devotee['address'] ?? null,
            'devotee_remarks' => $devotee['remarks'] ?? null,
        ];

        foreach ($metaData as $key => $value) {
            if (!empty($value)) {
                BookingMeta::create([
                    'booking_id' => $bookingId,
                    'meta_key' => $key,
                    'meta_value' => $value,
                    'meta_type' => 'STRING',
                ]);
            }
        }
    }

    /**
     * Migrate inventory for the booking
     *
     * @param string $bookingId
     * @return void
     */
    private function migrateInventory($bookingId)
    {
        try {
            $booking = Booking::with('bookingItems')->findOrFail($bookingId);

            if ($booking->inventory_migration == 1) {
                Log::info('Inventory already migrated for booking', ['booking_id' => $bookingId]);
                return;
            }

            $bookingItems = $booking->bookingItems->where('item_type', 'SALE');

            if ($bookingItems->isEmpty()) {
                Log::info('No SALE items to migrate inventory', ['booking_id' => $bookingId]);
                $booking->update(['inventory_migration' => 1]);
                return;
            }

            foreach ($bookingItems as $item) {
                $this->inventoryMigrationService->deductInventory(
                    $item->item_id,
                    $item->quantity,
                    'SALE',
                    $bookingId,
                    $item->id
                );
            }

            $booking->update(['inventory_migration' => 1]);

            Log::info('Inventory migration completed successfully', ['booking_id' => $bookingId]);

        } catch (\Exception $e) {
            Log::error('Error in inventory migration', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Migrate to accounting system
     *
     * @param string $bookingId
     * @return bool
     */
    private function migrateAccounting($bookingId)
    {
        try {
            $booking = Booking::with(['bookingItems', 'bookingMeta'])->findOrFail($bookingId);

            if ($booking->account_migration == 1) {
                Log::info('Accounting already migrated', ['booking_id' => $bookingId]);
                return true;
            }

            $bookingItems = $booking->bookingItems;
            $payment = BookingPayment::where('booking_id', $bookingId)
                ->where('payment_status', 'SUCCESS')
                ->first();

            if (!$payment) {
                Log::warning('No successful payment found', ['booking_id' => $bookingId]);
                return false;
            }

            $paymentMode = PaymentMode::find($payment->payment_mode_id);
            $debitLedgerId = $paymentMode->ledger_id;

            if (!$debitLedgerId) {
                throw new \Exception('Payment mode ledger not configured');
            }

            // Prepare credit entries
            $creditEntries = [];
            $totalCreditAmount = 0;

            foreach ($bookingItems as $item) {
                $saleItem = SaleItem::find($item->item_id);
                
                if (!$saleItem || !$saleItem->income_ledger_id) {
                    $incomeLedgerId = $this->getOrCreateSalesIncomeLedger();
                } else {
                    $incomeLedgerId = $saleItem->income_ledger_id;
                }

                $creditEntries[] = [
                    'ledger_id' => $incomeLedgerId,
                    'amount' => $item->total_price,
                    'details' => "POS Sales - {$item->item_name} (Qty: {$item->quantity})"
                ];

                $totalCreditAmount += $item->total_price;
            }

            // Verify balance
            if (abs($totalCreditAmount - $booking->subtotal) > 0.01) {
                throw new \Exception("Accounting entries don't balance");
            }

            // Get ledger settings
            $settings = DB::table('booking_settings')
                ->whereIn('key', ['deposit_ledger_id', 'discount_ledger_id'])
                ->pluck('value', 'key');
                
            $depositLedgerId = $settings['deposit_ledger_id'] ?? null;
            $discountLedgerId = $settings['discount_ledger_id'] ?? null;

            // Generate entry code
            $date = $booking->booking_date;
            $year = $date->format('y');
            $month = $date->format('m');

            $lastEntry = DB::table('entries')
                ->whereYear('date', $date->format('Y'))
                ->whereMonth('date', $month)
                ->where('entrytype_id', 1)
                ->orderBy('id', 'desc')
                ->first();

            $lastNumber = 0;
            if ($lastEntry && !empty($lastEntry->entry_code)) {
                $lastNumber = (int)substr($lastEntry->entry_code, -5);
            }

            $entryCode = 'REC' . $year . $month . str_pad($lastNumber + 1, 5, '0', STR_PAD_LEFT);

            // Prepare narration
            $itemCount = $bookingItems->count();
            $devoteeInfo = $this->getDevoteeInfoFromMeta($booking);
            
            $narration = "POS Sales ({$booking->booking_number})\n";
            $narration .= "Items: {$itemCount}\n";
            if (!empty($devoteeInfo['name'])) {
                $narration .= "Customer: {$devoteeInfo['name']}\n";
            }
            if (!empty($devoteeInfo['nric'])) {
                $narration .= "NRIC: {$devoteeInfo['nric']}\n";
            }

            // Create entry
            $entryId = DB::table('entries')->insertGetId([
                'entrytype_id' => 1,
                'number' => $entryCode,
                'date' => $date,
                'dr_total' => $booking->subtotal + $booking->discount_amount,
                'cr_total' => $booking->subtotal,
                'narration' => $narration,
                'inv_id' => $bookingId,
                'inv_type' => 3,
                'entry_code' => $entryCode,
                'created_by' => auth()->id(),
                'user_id' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create discount entry if applicable
            if ($booking->discount_amount > 0 && $discountLedgerId) {
                DB::table('entryitems')->insert([
                    'entry_id' => $entryId,
                    'ledger_id' => $discountLedgerId,
                    'amount' => $booking->discount_amount,
                    'details' => "POS Sales Discount ({$booking->booking_number})",
                    'is_discount' => 1,
                    'dc' => 'D',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Create debit entry (Payment mode ledger)
            DB::table('entryitems')->insert([
                'entry_id' => $entryId,
                'ledger_id' => $debitLedgerId,
                'amount' => $booking->paid_amount,
                'details' => "POS Sales ({$booking->booking_number})",
                'dc' => 'D',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create credit entries (Income ledgers)
            foreach ($creditEntries as $creditEntry) {
                DB::table('entryitems')->insert([
                    'entry_id' => $entryId,
                    'ledger_id' => $creditEntry['ledger_id'],
                    'amount' => $creditEntry['amount'],
                    'details' => $creditEntry['details'],
                    'dc' => 'C',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Update booking
            $booking->update(['account_migration' => 1]);

            Log::info('Account migration completed successfully', [
                'booking_id' => $bookingId,
                'entry_id' => $entryId
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Error in account migration', [
                'booking_id' => $bookingId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get or create sales income ledger
     *
     * @return int
     */
    private function getOrCreateSalesIncomeLedger()
    {
        $incomesGroup = DB::table('groups')->where('code', '8000')->first();

        if (!$incomesGroup) {
            $incomesGroupId = DB::table('groups')->insertGetId([
                'parent_id' => 0,
                'name' => 'Incomes',
                'code' => '8000',
                'added_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } else {
            $incomesGroupId = $incomesGroup->id;
        }

        $salesIncomeLedger = DB::table('ledgers')
            ->where('name', 'Sales Income')
            ->where('group_id', $incomesGroupId)
            ->first();

        if (!$salesIncomeLedger) {
            $lastRightCode = DB::table('ledgers')
                ->where('group_id', $incomesGroupId)
                ->where('left_code', '8000')
                ->orderBy('right_code', 'desc')
                ->value('right_code');

            $newRightCode = $lastRightCode ? str_pad(((int)$lastRightCode + 1), 4, '0', STR_PAD_LEFT) : '0001';

            $salesIncomeLedgerId = DB::table('ledgers')->insertGetId([
                'group_id' => $incomesGroupId,
                'name' => 'Sales Income',
                'left_code' => '8000',
                'right_code' => $newRightCode,
                'type' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } else {
            $salesIncomeLedgerId = $salesIncomeLedger->id;
        }

        return $salesIncomeLedgerId;
    }

    /**
     * Get devotee information from booking meta
     *
     * @param Booking $booking
     * @return array
     */
    private function getDevoteeInfoFromMeta($booking)
    {
        $meta = $booking->bookingMeta->pluck('meta_value', 'meta_key');
        
        return [
            'name' => $meta['devotee_name'] ?? '',
            'nric' => $meta['devotee_nric'] ?? '',
            'email' => $meta['devotee_email'] ?? '',
            'phone' => $meta['devotee_phone'] ?? ''
        ];
    }
}