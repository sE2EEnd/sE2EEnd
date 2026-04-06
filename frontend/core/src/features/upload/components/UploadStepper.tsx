interface UploadStepperProps {
  steps: string[];
  activeStep: number;
}

export default function UploadStepper({ steps, activeStep }: UploadStepperProps) {
  return (
    <div className="flex items-start justify-between">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-shrink-0 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium transition-colors flex-shrink-0 ${
                index < activeStep
                  ? 'bg-green-500 text-white'
                  : index === activeStep
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {index < activeStep ? '✓' : index + 1}
            </div>
            <span
              className={`mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[64px] sm:max-w-[80px] ${
                index <= activeStep ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {step}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-2 sm:mx-4 rounded transition-colors mb-6 ${
                index < activeStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
