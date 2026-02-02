import { useLocation, Link } from 'react-router-dom'

export default function ThankYou() {
    const location = useLocation()
    const { isPositive, googleReviewUrl } = location.state || {}

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card text-center max-w-md animate-fadeIn">
                {isPositive ? (
                    <>
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">
                            Thank you for your feedback!
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We're glad you had a great experience. Would you like to share it on Google?
                        </p>
                        {googleReviewUrl && (
                            <a
                                href={googleReviewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary inline-block"
                            >
                                ⭐ Leave a Google Review
                            </a>
                        )}
                    </>
                ) : (
                    <>
                        <div className="text-6xl mb-4">🙏</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">
                            Thank you for your feedback
                        </h1>
                        <p className="text-gray-600">
                            We're sorry about your experience. Your feedback has been recorded
                            and will help us improve our service.
                        </p>
                    </>
                )}

                <div className="mt-8">
                    <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    )
}
