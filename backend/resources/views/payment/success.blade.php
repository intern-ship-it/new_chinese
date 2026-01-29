<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-success text-white">
                        <h4 class="mb-0">Payment Successful</h4>
                    </div>
                    <div class="card-body text-center">
                        <div class="mb-4">
                            <div class="text-success" style="font-size: 4rem;">
								&#10004;
							</div>
                        </div>
                        
                        <h5>Thank you for your payment!</h5>
                        
                        <div class="alert alert-success mt-4">
                            <strong>Payment Details:</strong><br>
                            Order No: {{ $order_no }}<br>
                            Payment Date: {{ $payment_date }}<br>
                            Amount: {{ $currency . ' ' . $amount }}
                        </div>
                        
                        <div class="mt-4">
                            <a href="{{ route('payment.form') }}" class="btn btn-primary">
                                Make Another Payment
                            </a>
                            <a href="/" class="btn btn-secondary">
                                Return to Home
                            </a>
                        </div>
                        
                        <div class="mt-4 text-muted small">
                            <p>A confirmation email has been sent to your registered email address.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
	<script>
	setTimeout(function(){
		window.close();
	}, 3500);
	</script>
</body>
</html>