import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useState, useEffect } from 'react'

export default function Pricing() {
    const { user, getToken } = useAuth()
    const [currentPlan, setCurrentPlan] = useState('free')
    const [selectedPlan, setSelectedPlan] = useState(null)  // Track selected plan for blue border
    const [usage, setUsage] = useState({ used: 0, limit: 50 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPlanInfo()
    }, [])

    const fetchPlanInfo = async () => {
        try {
            const token = getToken()
            const response = await fetch(`/api/business/${user.businessId}/plan`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setCurrentPlan(data.plan)
                setUsage({ used: data.usedThisMonth, limit: data.limit })
            }
        } catch (error) {
            console.error('Failed to fetch plan info:', error)
        } finally {
            setLoading(false)
        }
    }

    const plans = [
        {
            name: 'Free',
            price: '₹0',
            period: '/month',
            features: [
                '50 feedbacks per month',
                'QR code generation',
                'Google review redirect',
                'Basic dashboard',
            ],
            limitations: [
                'Limited feedback history',
                'No email support'
            ],
            buttonText: currentPlan === 'free' ? 'Current Plan' : 'Downgrade',
            isCurrent: currentPlan === 'free',
            planId: 'free'
        },
        {
            name: 'Pro Monthly',
            price: '₹299',
            period: '/month',
            features: [
                'Unlimited feedbacks',
                'Full complaint history',
                'Priority email support',
                'Advanced analytics',
                'Custom branding'
            ],
            limitations: [],
            buttonText: currentPlan === 'paid' ? 'Current Plan' : 'Upgrade Now',
            isCurrent: currentPlan === 'paid',
            isPopular: true,
            planId: 'paid-monthly'
        },
        {
            name: 'Pro Yearly',
            price: '₹2,999',
            period: '/year',
            savings: 'Save ₹589',
            features: [
                'Everything in Pro Monthly',
                '2 months free',
                'Priority support',
                'Early access to new features'
            ],
            limitations: [],
            buttonText: 'Best Value',
            isPopular: false,
            planId: 'paid-yearly'
        }
    ]

    const handleUpgrade = (planId) => {
        // In production, this would integrate with Razorpay
        alert(`Payment integration coming soon!\n\nFor now, contact us at support@feedback.com to upgrade to ${planId}.`)
    }

    return (
        <Layout>
            <div className="animate-fadeIn">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Plan</h1>
                    <p className="text-gray-500">Simple, transparent pricing for your business</p>
                </div>

                {/* Current Usage */}
                {!loading && currentPlan === 'free' && (
                    <div className="card mb-8 bg-gradient-to-r from-blue-50 to-purple-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-gray-800">Your Usage This Month</h3>
                                <p className="text-sm text-gray-600">
                                    {usage.used} / {usage.limit} feedbacks used
                                </p>
                            </div>
                            <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${usage.used >= usage.limit ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            onClick={() => setSelectedPlan(plan.planId)}
                            className={`card relative cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedPlan === plan.planId
                                    ? 'ring-2 ring-blue-500 shadow-lg transform scale-[1.02]'
                                    : plan.isPopular
                                        ? 'ring-2 ring-purple-400'
                                        : 'hover:ring-2 hover:ring-blue-300'
                                }`}
                        >
                            {plan.isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        MOST POPULAR
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800">{plan.name}</h3>
                                <div className="mt-2">
                                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500">{plan.period}</span>
                                </div>
                                {plan.savings && (
                                    <span className="inline-block mt-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                                        {plan.savings}
                                    </span>
                                )}
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-center text-sm text-gray-600">
                                        <span className="text-green-500 mr-2">✓</span>
                                        {feature}
                                    </li>
                                ))}
                                {plan.limitations.map((limitation, idx) => (
                                    <li key={idx} className="flex items-center text-sm text-gray-400">
                                        <span className="text-gray-300 mr-2">✗</span>
                                        {limitation}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => !plan.isCurrent && handleUpgrade(plan.planId)}
                                disabled={plan.isCurrent}
                                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${plan.isCurrent
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : plan.isPopular
                                        ? 'btn-primary'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {plan.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Trust badges */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-500 mb-4">Trusted by 500+ businesses in India</p>
                    <div className="flex justify-center items-center gap-6 text-gray-400">
                        <span>🔒 Secure Payments</span>
                        <span>💳 Razorpay Protected</span>
                        <span>📞 24/7 Support</span>
                    </div>
                </div>
            </div>
        </Layout>
    )
}
