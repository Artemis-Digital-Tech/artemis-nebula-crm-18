import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationPrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (placeId: string, description: string) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Digite uma localização...",
  className,
}: LocationAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const skipNextFetchRef = useRef(false);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    setInputValue(value);
    if (value !== inputValue) {
      skipNextFetchRef.current = true;
    }
  }, [value]);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      if (inputValue.trim().length >= 3) {
        return;
      }
    }

    if (inputValue.trim().length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      await fetchPredictions(inputValue);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [inputValue]);

  const fetchPredictions = async (input: string) => {
    if (input.trim().length < 3) return;

    setLoading(true);
    setOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("places-autocomplete", {
        body: { input: input.trim() },
      });

      if (error) throw error;

      const newPredictions = data?.predictions || [];
      setPredictions(newPredictions);
      
      if (newPredictions.length > 0) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPredictions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (prediction: LocationPrediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    if (onLocationSelect) {
      onLocationSelect(prediction.placeId, prediction.description);
    }
    setOpen(false);
    setPredictions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setOpen(true);
    }
  };

  const shouldShowPopover = open && (predictions.length > 0 || loading);

  return (
    <Popover open={shouldShowPopover} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className={cn("pl-10 w-full", className)}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin z-10" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        collisionPadding={8}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            ) : predictions.length === 0 ? (
              <CommandEmpty>Nenhuma localização encontrada</CommandEmpty>
            ) : (
              <CommandGroup>
                {predictions.map((prediction) => (
                  <CommandItem
                    key={prediction.placeId}
                    value={prediction.description}
                    onSelect={() => handleSelect(prediction)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{prediction.mainText}</div>
                      {prediction.secondaryText && (
                        <div className="text-xs text-muted-foreground">
                          {prediction.secondaryText}
                        </div>
                      )}
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4 shrink-0",
                        value === prediction.description ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

