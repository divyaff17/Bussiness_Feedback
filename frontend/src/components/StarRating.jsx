import { useState } from 'react'

export default function StarRating({ rating, setRating, disabled = false }) {
    const [hover, setHover] = useState(0)

    const handleClick = (star) => {
        if (!disabled) {
            setRating(star)
        }
    }

    return (
        <div className="flex justify-center gap-1 sm:gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    className={`
                        w-14 h-14 sm:w-16 sm:h-16 
                        flex items-center justify-center
                        rounded-full
                        transition-all duration-200 
                        ${disabled
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer active:scale-90 hover:scale-110'
                        }
                        ${star <= (hover || rating)
                            ? 'bg-yellow-100'
                            : 'bg-gray-100'
                        }
                    `}
                    onClick={() => handleClick(star)}
                    onMouseEnter={() => !disabled && setHover(star)}
                    onMouseLeave={() => !disabled && setHover(0)}
                    onTouchStart={() => !disabled && setHover(star)}
                    onTouchEnd={() => !disabled && setHover(0)}
                >
                    <span
                        className={`
                            text-4xl sm:text-5xl
                            ${star <= (hover || rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            } 
                            transition-colors duration-200
                        `}
                    >
                        ★
                    </span>
                </button>
            ))}
        </div>
    )
}

