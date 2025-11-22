'use client';

import { CheckIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function FeatureHighlights() {
  const features = [
    {
      icon: CheckIcon,
      title: 'Premium Quality',
      description: 'Authentic fragrances from world-renowned perfume houses',
    },
    {
      icon: ClockIcon,
      title: 'Fast Delivery',
      description: 'Express shipping available for your convenience',
    },
    {
      icon: CheckCircleIcon,
      title: 'Satisfaction Guaranteed',
      description: '30-day return policy for your peace of mind',
      customIcon: true, // Flag for custom styling
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg p-8 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                {feature.customIcon ? (
                  // Custom icon for Satisfaction Guaranteed - circle with outline and checkmark
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-5 relative ring-2 ring-white ring-offset-0">
                    <CheckCircleIcon className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                )}
                <h3 className="text-xl font-header font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
