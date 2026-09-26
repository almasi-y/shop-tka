import { Sparkles, Package, Search } from "lucide-react";

interface WelcomeScreenProps {
  onSuggestionClick: (message: { text: string }) => void;
  isSignedIn: boolean;
}

const productSuggestions = [
  "Show me development boards",
  "Sensors under KSh 5,000",
  "What robotics kits do you have?",
];

const orderSuggestions = [
  "Where's my order?",
  "Show me my recent orders",
  "Has my order shipped?",
];

export function WelcomeScreen({
  onSuggestionClick,
  isSignedIn,
}: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-brand/10 p-4 dark:bg-brand/20">
        <Sparkles className="h-8 w-8 text-brand" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
        How can I help you today?
      </h3>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
        {isSignedIn
          ? "I can help you find robotics products, check your orders, and track deliveries."
          : "I can help you find robotics products by category, brand, capability, or price."}
      </p>

      {/* Product suggestions */}
      <div className="mt-6 w-full max-w-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
          <Search className="h-3 w-3" />
          Find products
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {productSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionClick({ text: suggestion })}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 hover:border-brand/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:border-brand/60"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Order suggestions - only for signed in users */}
      {isSignedIn && (
        <div className="mt-4 w-full max-w-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            <Package className="h-3 w-3" />
            Your orders
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {orderSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick({ text: suggestion })}
                className="rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-sm text-brand transition-colors hover:bg-brand/10 dark:border-brand/60 dark:bg-brand/20 dark:text-brand-light dark:hover:bg-brand/30"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
