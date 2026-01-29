<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Pending</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card shadow-lg">
                    <div class="card-header bg-warning text-dark">
                        <h4 class="mb-0"><i class="fas fa-clock me-2"></i>Payment Processing</h4>
                    </div>
                    <div class="card-body text-center py-4">
                        <div class="mb-4">
                            <div class="text-warning" style="font-size: 5rem;">
                                <i class="fas fa-hourglass-half"></i>
                            </div>
                        </div>
                        
                        <h3 class="mb-3">Payment is Being Processed</h3>
                        
                        <div class="alert alert-warning mt-4">
                            <h5><i class="fas fa-info-circle me-2"></i>Payment Status: Pending</h5>
                            <p class="mb-0">Your payment is currently being processed. This may take a few moments.</p>
                        </div>
                        
                        <div class="payment-details mt-4 p-3 bg-light rounded">
                            @if(isset($order_no))
                            <div class="row text-start">
                                <div class="col-md-6">
                                    <p><strong>Order Number:</strong></p>
                                </div>
                                <div class="col-md-6">
                                    <p class="text-muted">{{ $order_no }}</p>
                                </div>
                            </div>
                            @endif
                            
                            @if(isset($transaction_id))
                            <div class="row text-start">
                                <div class="col-md-6">
                                    <p><strong>Transaction ID:</strong></p>
                                </div>
                                <div class="col-md-6">
                                    <p class="text-muted">{{ $transaction_id }}</p>
                                </div>
                            </div>
                            @endif
                        </div>
                        
                        <div class="mt-5">
                            <div class="spinner-border text-warning" role="status" style="width: 3rem; height: 3rem;">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-3 text-muted">Please wait while we confirm your payment...</p>
                        </div>
                        
                        <div class="mt-5">
                            <h5>What happens next?</h5>
                            <div class="row mt-3">
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-primary mb-2">
                                            <i class="fas fa-envelope fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">We'll send you a confirmation email</p>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-success mb-2">
                                            <i class="fas fa-check-circle fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">Check your payment status in a few minutes</p>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-info mb-2">
                                            <i class="fas fa-history fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">Payment will auto-update within 24 hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-5">
                            <a href="{{ route('payment.form') }}" class="btn btn-primary">
                                <i class="fas fa-credit-card me-2"></i>Try Another Payment
                            </a>
                            <a href="/" class="btn btn-outline-secondary">
                                <i class="fas fa-home me-2"></i>Return to Home
                            </a>
                            
                            <div class="mt-4">
                                <button id="checkStatusBtn" class="btn btn-outline-warning">
                                    <i class="fas fa-sync-alt me-2"></i>Check Status Now
                                </button>
                            </div>
                        </div>
                        
                        <div class="mt-4 text-muted small">
                            <p><i class="fas fa-exclamation-circle me-1"></i>If your payment status doesn't update within 24 hours, please contact our support team.</p>
                        </div>
                    </div>
                    <div class="card-footer bg-light">
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-0 small"><i class="fas fa-phone-alt me-1"></i> Support: +91-XXXXXXXXXX</p>
                            </div>
                            <div class="col-md-6 text-end">
                                <p class="mb-0 small"><i class="fas fa-envelope me-1"></i> support@graspsoftwaresolutions.com</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fas fa-question-circle me-2"></i>Need Help?</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Common Payment Methods:</h6>
                                    <ul class="small">
                                        <li>Credit/Debit Cards</li>
                                        <li>Internet Banking</li>
                                        <li>UPI Payments</li>
                                        <li>Wallet Payments</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6>If Payment Fails:</h6>
                                    <ul class="small">
                                        <li>Check your bank balance</li>
                                        <li>Verify transaction limits</li>
                                        <li>Try a different payment method</li>
                                        <li>Contact your bank</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const checkStatusBtn = document.getElementById('checkStatusBtn');
            const orderNo = "{{ $order_no ?? '' }}";
            
            if (checkStatusBtn && orderNo) {
                checkStatusBtn.addEventListener('click', function() {
                    // Disable button and show loading
                    checkStatusBtn.disabled = true;
                    checkStatusBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Checking...';
                    
                    // Simulate status check (replace with actual API call)
                    setTimeout(() => {
                        alert('Payment status is still pending. We will notify you when it is confirmed.');
                        checkStatusBtn.disabled = false;
                        checkStatusBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Check Status Again';
                    }, 2000);
                });
            }
            
            // Auto-refresh page after 30 seconds if still pending
            setTimeout(() => {
                window.location.reload();
            }, 30000);
        });
    </script>
	<script>
	setTimeout(function(){
		window.close();
	}, 3500);
	</script>
</body>
</html>