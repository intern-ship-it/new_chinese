<?php
// app/Http/Controllers/FiuuPaymentController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FiuuPaymentController extends Controller
{
    // Sandbox credentials from your account
    /* private $credentials = [
        'merchant_id' => 'SB_graspsoftware',
        'verify_key' => '3f97a57034112582ef5a1ffbe1d21a30',  // For vcode generation
        'secret_key' => '77e7bf7f53130877abdbef553725a785',   // For skey verification
    ]; */
	
	private $credentials = [
        'merchant_id' => 'graspsoftware_Dev',
        'verify_key' => '1a0a4aa7f78747645062f84e09dd53a7',  // For vcode generation
        'secret_key' => 'ea441e6c806e08f22d2e6ab5afacb33f',   // For skey verification
    ];

    // URLs from documentation
    private $sandboxPaymentUrl = 'https://sandbox-payment.fiuu.com/RMS/pay/';
    private $productionPaymentUrl = 'https://pay.fiuu.com/RMS/pay/';
    
    private $sandboxApiUrl = 'https://sandbox-api.fiuu.com';
    private $productionApiUrl = 'https://api.fiuu.com';
    
    private $isSandbox = false;

    public function showPaymentForm()
    {
        return view('payment.fiuu-payment');
    }

    public function createPayment(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'customer_name' => 'required|string|max:128',
            'customer_email' => 'required|email|max:128',
            'customer_phone' => 'required|string|max:32'
        ]);
        // Generate unique order ID
        $orderId = 'ORD' . time() . rand(1000, 9999);
        
        // Prepare payment data according to Fiuu specification
        $paymentData = [
            'merchant_id' => $this->credentials['merchant_id'],
            'orderid' => $orderId,
            'amount' => number_format($request->amount, 2, '.', ''),
            'currency' => 'MYR',
            'bill_name' => $request->customer_name,
            'bill_email' => $request->customer_email,
            'bill_mobile' => $request->customer_phone,
            'bill_desc' => $request->description,
            'country' => 'MY', // India
            'returnurl' => route('payment.response'),
            'callbackurl' => route('payment.webhook'),
            'cancelurl' => route('payment.cancel'),
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

        // Store in session for verification later
        session(['fiuu_order_id' => $orderId]);
        session(['fiuu_amount' => $paymentData['amount']]);
        return view('payment.fiuu-redirect', [
            'paymentData' => $paymentData,
            'gatewayUrl' => $this->isSandbox ? 
                $this->sandboxPaymentUrl . $this->credentials['merchant_id'] . '/' :
                $this->productionPaymentUrl . $this->credentials['merchant_id'] . '/'
        ]);
    }

    public function handleResponse(Request $request)
    {
        Log::info('FIUU Payment Response Received:', $request->all());
		print_r($request->all());
		die;

        // Extract parameters
        $params = [
            'tranID' => $request->get('tranID'),
            'orderid' => $request->get('orderid'),
            'status' => $request->get('status'),
            'domain' => $request->get('domain'),
            'amount' => $request->get('amount'),
            'currency' => $request->get('currency'),
            'appcode' => $request->get('appcode'),
            'paydate' => $request->get('paydate'),
            'skey' => $request->get('skey'),
            'error_code' => $request->get('error_code'),
            'error_desc' => $request->get('error_desc'),
            'channel' => $request->get('channel')
        ];

        // Verify skey according to Fiuu specification (Page 20)
        $pre_skey = md5(
            $params['tranID'] . 
            $params['orderid'] . 
            $params['status'] . 
            $params['domain'] . 
            $params['amount'] . 
            $params['currency']
        );
        
        $calculated_skey = md5(
            $params['paydate'] . 
            $params['domain'] . 
            $pre_skey . 
            $params['appcode'] . 
            $this->credentials['secret_key']
        );

        // Verify hash
        if ($calculated_skey !== $params['skey']) {
            Log::error('FIUU skey verification failed', [
                'received' => $params['skey'],
                'calculated' => $calculated_skey
            ]);
            
            return view('payment.failed', [
                'message' => 'Security verification failed. Please contact support.',
                'order_no' => $params['orderid']
            ]);
        }

        // Process based on status
        switch ($params['status']) {
            case '00': // Success
                return view('payment.success', [
                    'order_no' => $params['orderid'],
                    'transaction_id' => $params['tranID'],
                    'amount' => $params['amount'],
                    'currency' => $params['currency'],
                    'payment_date' => $params['paydate'],
                    'channel' => $params['channel']
                ]);
                
            case '11': // Failed
                return view('payment.failed', [
                    'message' => $params['error_desc'] ?? 'Payment failed',
                    'error_code' => $params['error_code'],
                    'order_no' => $params['orderid']
                ]);
                
            case '22': // Pending
                return view('payment.pending', [
					'order_no' => $params['orderid'],
					'transaction_id' => $params['tranID'] ?? null,
					'amount' => $params['amount'] ?? null,
					'message' => $params['error_desc'] ?? 'Payment is pending confirmation'
				]);
                
            default:
                return view('payment.failed', [
                    'message' => 'Unknown payment status: ' . $params['status'],
                    'order_no' => $params['orderid']
                ]);
        }
    }

    public function handleWebhook(Request $request)
    {
        Log::info('FIUU Webhook Received:', $request->all());

        $nbcb = $request->get('nbcb'); // Notification type
        
        // Handle different notification types
        if ($nbcb == '1') {
            // Callback URL - According to Page 57, just echo token
            echo "CBTOKEN:MPSTATOK";
            return;
        }
        
        if ($nbcb == '2') {
            // Notification URL - Process payment status
            return $this->processNotification($request);
        }
        
        // Default notification (no nbcb parameter)
        return $this->processNotification($request);
    }

    private function processNotification(Request $request)
    {
        // Extract parameters
        $params = [
            'tranID' => $request->get('tranID'),
            'orderid' => $request->get('orderid'),
            'status' => $request->get('status'),
            'domain' => $request->get('domain'),
            'amount' => $request->get('amount'),
            'currency' => $request->get('currency'),
            'appcode' => $request->get('appcode'),
            'paydate' => $request->get('paydate'),
            'skey' => $request->get('skey'),
            'error_code' => $request->get('error_code'),
            'error_desc' => $request->get('error_desc')
        ];

        // Verify skey
        $pre_skey = md5(
            $params['tranID'] . 
            $params['orderid'] . 
            $params['status'] . 
            $params['domain'] . 
            $params['amount'] . 
            $params['currency']
        );
        
        $calculated_skey = md5(
            $params['paydate'] . 
            $params['domain'] . 
            $pre_skey . 
            $params['appcode'] . 
            $this->credentials['secret_key']
        );

        if ($calculated_skey !== $params['skey']) {
            Log::error('FIUU Webhook skey verification failed');
            return response()->json(['error' => 'Invalid skey'], 400);
        }

        // Update your database here based on status
        $this->updatePaymentStatus(
            $params['orderid'],
            $params['status'],
            $params['tranID'],
            $params['amount'],
            $params['currency'],
            $params['paydate']
        );

        // Send IPN acknowledgment if required
        $this->sendIPNAcknowledgment($request);

        return response()->json(['status' => 'success']);
    }

    private function sendIPNAcknowledgment(Request $request)
    {
        // Send acknowledgment to Fiuu IPN endpoint
        $ipnUrl = $this->isSandbox ? 
            'https://sandbox-payment.fiuu.com/RMS/API/chkstat/returnipn.php' :
            'https://pay.fiuu.com/RMS/API/chkstat/returnipn.php';

        $postData = $request->all();
        $postData['req'] = 1; // Required for IPN

        try {
            $response = Http::asForm()->post($ipnUrl, $postData);
            Log::info('FIUU IPN Acknowledgment sent', ['response' => $response->body()]);
        } catch (\Exception $e) {
            Log::error('FIUU IPN Acknowledgment failed: ' . $e->getMessage());
        }
    }

    private function updatePaymentStatus($orderId, $status, $transactionId, $amount, $currency, $date)
    {
        // Implement your database update logic here
        // Example:
        // Payment::where('order_id', $orderId)
        //     ->update([
        //         'status' => $status,
        //         'transaction_id' => $transactionId,
        //         'paid_at' => $date,
        //         'updated_at' => now()
        //     ]);
        
        Log::info('Payment status updated', [
            'order_id' => $orderId,
            'status' => $status,
            'transaction_id' => $transactionId
        ]);
    }

    public function handleCancel()
    {
        return view('payment.cancelled', [
            'message' => 'Payment was cancelled by user.'
        ]);
    }

    // Status Query API Methods
    public function queryByTransactionId($transactionId, $amount)
    {
        // Generate skey for status query
        $skey = md5(
            $transactionId . 
            $this->credentials['merchant_id'] . 
            $this->credentials['verify_key'] . 
            $amount
        );

        $url = ($this->isSandbox ? $this->sandboxApiUrl : $this->productionApiUrl) . 
               '/RMS/q_by_tid.php';

        $response = Http::get($url, [
            'txID' => $transactionId,
            'domain' => $this->credentials['merchant_id'],
            'amount' => $amount,
            'skey' => $skey,
            'type' => 2 // JSON response
        ]);

        return $response->json();
    }

    public function queryByOrderId($orderId)
    {
        // Generate skey for order query
        $skey = md5(
            $orderId . 
            $this->credentials['merchant_id'] . 
            $this->credentials['verify_key']
        );

        $url = ($this->isSandbox ? $this->sandboxApiUrl : $this->productionApiUrl) . 
               '/RMS/query/q_by_oid.php';

        $response = Http::get($url, [
            'oID' => $orderId,
            'domain' => $this->credentials['merchant_id'],
            'skey' => $skey,
            'type' => 2 // JSON response
        ]);

        return $response->json();
    }
}