import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepChange: (step: number) => void;
  isLoading?: boolean;
}

export default function Stepper({
  steps,
  currentStep,
  onStepChange,
  isLoading = false,
}: StepperProps) {
  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 flex items-center gap-2">
            {/* Step Circle */}
            <button
              onClick={() => onStepChange(index)}
              disabled={isLoading}
              className={`flex-shrink-0 w-10 h-10 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center ${
                index < currentStep
                  ? 'bg-green-600 text-white'
                  : index === currentStep
                    ? 'bg-red-600 text-white ring-2 ring-red-300'
                    : 'bg-gray-200 text-gray-600'
              } ${!isLoading && index <= currentStep ? 'cursor-pointer hover:shadow-lg' : ''}`}
            >
              {index < currentStep ? (
                <Check size={20} />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>

            {/* Step Label */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  index === currentStep
                    ? 'text-red-600'
                    : index < currentStep
                      ? 'text-green-600'
                      : 'text-gray-600'
                }`}
              >
                {step}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 rounded-full transition-all duration-200 ${
                  index < currentStep ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrevious}
          disabled={currentStep === 0 || isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronRight size={18} />
          السابق
        </Button>

        <div className="text-sm text-gray-600 font-medium">
          الخطوة {currentStep + 1} من {steps.length}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentStep === steps.length - 1 || isLoading}
          className="flex items-center gap-2"
        >
          التالي
          <ChevronLeft size={18} />
        </Button>
      </div>
    </div>
  );
}
