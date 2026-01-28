import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'primary' | 'white' | 'ghost';
}

export default function BackButton({ 
  href, 
  label = 'Back',
  onClick,
  className = '',
  variant = 'default'
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else if (!href) {
      e.preventDefault();
      router.back();
    }
  };

  const baseStyles = 'group inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    default: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 focus:ring-indigo-500 border border-indigo-200 hover:border-indigo-300',
    primary: 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500 shadow-md hover:shadow-xl',
    white: 'text-blue-700 bg-white border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 shadow-sm focus:ring-blue-500',
    ghost: 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 focus:ring-blue-500 hover:shadow-md'
  };

  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${className}`;

  const arrowClasses = "text-lg transition-transform duration-300 ease-in-out group-hover:-translate-x-1";

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className={buttonClasses}>
        <FiArrowLeft className={arrowClasses} />
        <span className="transition-all duration-300">{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={buttonClasses}>
      <FiArrowLeft className={arrowClasses} />
      <span className="transition-all duration-300">{label}</span>
    </button>
  );
}
