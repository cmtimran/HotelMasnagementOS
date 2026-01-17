import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Lock } from 'lucide-react';
import stripeService from '../services/stripeService';

// Initialize Stripe
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY'); // Replace with actual key

interface StripePaymentFormProps {
    amount: number;
    currency?: string;
    onSuccess?: (paymentIntent: any) => void;
    onError?: (error: string) => void;
}

const PaymentForm = ({ amount, currency = 'usd', onSuccess, onError }: StripePaymentFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [billingDetails, setBillingDetails] = useState({
        name: '',
        email: '',
        address: {
            line1: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'US'
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);

        try {
            // Create payment intent
            const { clientSecret } = await stripeService.createPaymentIntent(
                stripeService.formatAmount(amount),
                currency
            );

            // Get card element
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) {
                throw new Error('Card element not found');
            }

            // Confirm payment
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: billingDetails
                }
            });

            if (error) {
                onError?.(error.message || 'Payment failed');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                onSuccess?.(paymentIntent);
            }
        } catch (error: any) {
            onError?.(error.message || 'Payment processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
            invalid: {
                color: '#9e2146',
            },
        },
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Billing Details */}
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cardholder Name
                    </label>
                    <input
                        type="text"
                        value={billingDetails.name}
                        onChange={(e) => setBillingDetails({ ...billingDetails, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
                        type="email"
                        value={billingDetails.email}
                        onChange={(e) => setBillingDetails({ ...billingDetails, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Card Details
                    </label>
                    <div className="px-3 py-2 border border-gray-300 rounded-lg">
                        <CardElement options={cardElementOptions} />
                    </div>
                </div>
            </div>

            {/* Amount Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount to pay:</span>
                    <span className="text-xl font-bold text-gray-900">
                        ${amount.toFixed(2)} {currency.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={!stripe || processing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
                {processing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        <Lock size={18} />
                        Pay ${amount.toFixed(2)}
                    </>
                )}
            </button>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock size={12} />
                <span>Secured by Stripe</span>
            </div>
        </form>
    );
};

const StripePaymentForm = (props: StripePaymentFormProps) => {
    return (
        <Elements stripe={stripePromise}>
            <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <CreditCard className="text-blue-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                    </div>
                    <PaymentForm {...props} />
                </div>
            </div>
        </Elements>
    );
};

export default StripePaymentForm;
