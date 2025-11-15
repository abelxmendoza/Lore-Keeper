import { cn } from '../lib/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-12',
  lg: 'h-16',
  xl: 'h-24'
};

export const Logo = ({ className, size = 'md', showText = true }: LogoProps) => {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img 
        src="/images/LoreKeeperlogo.png" 
        alt="Lore Keeper Logo" 
        className={cn('flex-shrink-0 object-contain', sizeClasses[size])}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-primary tracking-wider">LORE</span>
          <span className="text-lg font-bold text-gray-400 tracking-wider">KEEPER</span>
        </div>
      )}
    </div>
  );
};

