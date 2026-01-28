import React from 'react';
import QRCode from 'react-qr-code';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  size = 128, 
  level = 'M',
  className = '' 
}) => {
  return (
    <div className={`inline-block ${className}`}>
      <QRCode
        value={value}
        size={size}
        level={level}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
      />
    </div>
  );
};

export default QRCodeGenerator;
