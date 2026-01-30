import React, { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ 
  src, 
  alt, 
  fallback, 
  className, 
  ...props 
}) => {
  const [error, setError] = useState(false);

  if (error) {
    return <div className={`bg-gray-800 flex items-center justify-center text-gray-500 ${className}`}>{fallback || 'Image not found'}</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setError(true)}
      className={className}
      {...props}
    />
  );
};
