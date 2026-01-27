interface PlaceholderImageProps {
  label: string;
  variant: 'character' | 'scene';
  className?: string;
}

export default function PlaceholderImage({ label, variant, className = '' }: PlaceholderImageProps) {
  const bgColor = variant === 'character' ? 'bg-amber-200' : 'bg-violet-200';
  const defaultClasses = variant === 'scene' ? 'aspect-video w-full' : '';

  return (
    <div
      className={`${bgColor} flex items-center justify-center rounded-lg ${defaultClasses} ${className}`}
    >
      <p className="text-gray-900 font-medium text-center px-2">{label}</p>
    </div>
  );
}
