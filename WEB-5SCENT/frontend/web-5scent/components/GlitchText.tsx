import { FC, CSSProperties } from 'react';

interface GlitchTextProps {
  children: string;
  speed?: number;
  enableShadows?: boolean;
  enableOnHover?: boolean;
  className?: string;
  style?: CSSProperties;
}

const GlitchText: FC<GlitchTextProps> = ({
  children,
  speed = 0.5,
  enableShadows = true,
  enableOnHover = false,
  className = '',
  style = {}
}) => {
  const duration = speed;
  
  const inlineStyles: CSSProperties = {
    ...style,
    position: 'relative',
    display: 'inline-block',
  };

  const baseClasses = 'select-none cursor-pointer';

  // After pseudo-element (red shadow)
  const afterClasses = enableOnHover
    ? `after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-200`
    : 'after:opacity-100';

  // Before pseudo-element (cyan shadow)
  const beforeClasses = enableOnHover
    ? `before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200`
    : 'before:opacity-100';

  const combinedClasses = `${baseClasses} ${afterClasses} ${beforeClasses} ${className}`;

  return (
    <div className={`relative inline-block`}>
      <style>{`
        @keyframes glitch-move {
          0%, 100% {
            text-shadow: -2px 0 #FF1744, 2px 0 #00BCD4;
            transform: translate(0);
          }
          20% {
            text-shadow: -3px 0 #FF1744, 3px 0 #00BCD4;
            transform: translate(-2px, 2px);
          }
          40% {
            text-shadow: 2px 0 #FF1744, -2px 0 #00BCD4;
            transform: translate(2px, -2px);
          }
          60% {
            text-shadow: -2px 0 #FF1744, 2px 0 #00BCD4;
            transform: translate(-1px, 1px);
          }
          80% {
            text-shadow: 3px 0 #FF1744, -3px 0 #00BCD4;
            transform: translate(1px, -1px);
          }
        }

        .glitch-text {
          animation: glitch-move ${duration}s linear infinite;
        }

        .glitch-text:hover {
          animation: glitch-move ${duration * 0.7}s linear infinite;
        }
      `}</style>
      <div style={inlineStyles} className={`glitch-text ${combinedClasses}`}>
        {children}
      </div>
    </div>
  );
};

export default GlitchText;
