<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Cancelled</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-6">
                <div class="card shadow-lg">
                    <div class="card-header bg-secondary text-white">
                        <h4 class="mb-0"><i class="fas fa-times-circle me-2"></i>Payment Cancelled</h4>
                    </div>
                    <div class="card-body text-center py-4">
                        <div class="mb-4">
                            <div class="text-secondary" style="font-size: 5rem;">
                                <i class="fas fa-ban"></i>
                            </div>
                        </div>
                        
                        <h3 class="mb-3">Payment Was Cancelled</h3>
                        
                        <div class="alert alert-secondary mt-4">
                            <h5><i class="fas fa-exclamation-triangle me-2"></i>Transaction Cancelled</h5>
                            <p class="mb-0">{{ $message ?? 'You have cancelled the payment process.' }}</p>
                        </div>
                        
                        @if(isset($order_no))
                        <div class="payment-details mt-4 p-3 bg-light rounded">
                            <div class="row text-start">
                                <div class="col-md-6">
                                    <p><strong>Order Number:</strong></p>
                                </div>
                                <div class="col-md-6">
                                    <p class="text-muted">{{ $order_no }}</p>
                                </div>
                            </div>
                            <div class="row text-start mt-2">
                                <div class="col-md-6">
                                    <p><strong>Status:</strong></p>
                                </div>
                                <div class="col-md-6">
                                    <p class="text-muted">Cancelled by User</p>
                                </div>
                            </div>
                        </div>
                        @endif
                        
                        <div class="mt-5">
                            <h5>Why was the payment cancelled?</h5>
                            <div class="row mt-3">
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-secondary mb-2">
                                            <i class="fas fa-user-times fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">You chose to cancel</p>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-secondary mb-2">
                                            <i class="fas fa-clock fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">Session timeout</p>
                                    </div>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <div class="p-3 border rounded bg-white">
                                        <div class="text-secondary mb-2">
                                            <i class="fas fa-window-close fa-2x"></i>
                                        </div>
                                        <p class="mb-0 small">Payment window closed</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mt-5">
                            <h6>Want to complete your purchase?</h6>
                            <div class="mt-4">
                                <a href="{{ route('payment.form') }}" class="btn btn-primary btn-lg">
                                    <i class="fas fa-redo me-2"></i>Try Payment Again
                                </a>
                                <a href="/" class="btn btn-outline-secondary btn-lg">
                                    <i class="fas fa-home me-2"></i>Return to Home
                                </a>
                            </div>
                            
                            <div class="mt-4">
                                <a href="#" class="btn btn-outline-info">
                                    <i class="fas fa-shopping-cart me-2"></i>View Your Cart
                                </a>
                                <a href="#" class="btn btn-outline-success">
                                    <i class="fas fa-question-circle me-2"></i>Need Help?
                                </a>
                            </div>
                        </div>
                        
                        <div class="mt-5 alert alert-light">
                            <h6><i class="fas fa-lightbulb me-2"></i>Tips for successful payment:</h6>
                            <ul class="text-start mt-2">
                                <li>Ensure you have sufficient balance</li>
                                <li>Check your internet connection</li>
                                <li>Use a supported payment method</li>
                                <li>Complete payment within the time limit</li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-footer bg-light">
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-0 small"><i class="fas fa-history me-1"></i> Your order will be held for 24 hours</p>
                            </div>
                            <div class="col-md-6 text-end">
                                <p class="mb-0 small"><i class="fas fa-shield-alt me-1"></i> Secure Payment Gateway</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <div class="card">
                        <div class="card-header bg-light">
                            <h6 class="mb-0"><i class="fas fa-credit-card me-2"></i>Other Payment Options</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 text-center mb-3">
                                    <div class="p-2 border rounded">
                                        <i class="fab fa-cc-visa fa-2x text-primary"></i>
                                        <p class="mb-0 small mt-2">Visa</p>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <div class="p-2 border rounded">
                                        <i class="fab fa-cc-mastercard fa-2x text-danger"></i>
                                        <p class="mb-0 small mt-2">MasterCard</p>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <div class="p-2 border rounded">
                                        <i class="fas fa-university fa-2x text-success"></i>
                                        <p class="mb-0 small mt-2">Net Banking</p>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <div class="p-2 border rounded">
                                        <i class="fas fa-mobile-alt fa-2x text-info"></i>
                                        <p class="mb-0 small mt-2">UPI</p>
                                    </div>
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
            // Auto-redirect to payment form after 30 seconds
            setTimeout(() => {
                window.location.href = "{{ route('payment.form') }}";
            }, 30000);
        });
    </script>
</body>
</html>