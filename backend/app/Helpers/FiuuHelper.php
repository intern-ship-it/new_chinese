<?php
// app/Helpers/FiuuHelper.php

namespace App\Helpers;

class FiuuHelper
{
    /**
     * Generate vcode for payment request
     * Formula: md5(amount + merchantID + orderid + verify_key + currency)
     */
    public static function generateVcode($amount, $merchantId, $orderId, $verifyKey, $currency = 'INR')
    {
        $string = $amount . $merchantId . $orderId . $verifyKey . $currency;
        return md5($string);
    }

    /**
     * Generate skey for payment response verification
     * pre_skey = md5(txnID + orderid + status + merchantID + amount + currency)
     * skey = md5(paydate + merchantID + pre_skey + appcode + secret_key)
     */
    public static function verifySkey($params, $secretKey)
    {
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
            $secretKey
        );
        
        return $calculated_skey === $params['skey'];
    }

    /**
     * Generate skey for status query API
     */
    public static function generateQuerySkey($queryId, $merchantId, $verifyKey, $amount = null)
    {
        if ($amount) {
            return md5($queryId . $merchantId . $verifyKey . $amount);
        }
        return md5($queryId . $merchantId . $verifyKey);
    }
}