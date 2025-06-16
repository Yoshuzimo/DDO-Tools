"use client";

import {
  useState,
  useEffect,
  useActionState,
  startTransition,
  useCallback,
} from "react";
import { BookOpenCheck, Save, AlertTriangle, Dices } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  getOwnedPacksAction,
  updateOwnedPacksAction,
} from "@/actions/account";
import { ALL_ADVENTURE_PACKS } from "@/config/ddoQuests";

export default function AccountPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();

  const [selectedPacks, setSelectedPacks] = useState<Set<string>>(new Set());
  const [isLoadingPacks, setIsLoadingPacks] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  const initialFormState = {
    message: null,
    errors: null,
    success: false,
    updatedPacks: undefined,
  };

  const [updateState, formAction, isUpdatePending] = useActionState(
    updateOwnedPacksAction,
    initialFormState
  );

  const [hasFetchedPacks, setHasFetchedPacks] = useState(false);

  useEffect(() => {
    if (!authLoading && !hasFetchedPacks) {
      setHasFetchedPacks(true);

      if (user) {
        setIsLoadingPacks(true);
        setInitialLoadError(null);

        getOwnedPacksAction(user.uid)
          .then((packs) => {
            setSelectedPacks(new Set(packs));
          })
          .catch((err) => {
            console.error("Error fetching owned packs:", err);
            setInitialLoadError(
              "Failed to load your currently owned packs. Please try again later."
            );
            toast({
              title: "Error",
              description: "Could not load owned packs.",
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsLoadingPacks(false);
          });
      } else {
        setIsLoadingPacks(false);
        setSelectedPacks(new Set());
      }
    }
  }, [user, authLoading, toast, hasFetchedPacks]);

  useEffect(() => {
    if (updateState?.success && updateState.message) {
      toast({ title: "Success!", description: updateState.message });
      if (updateState.updatedPacks) {
        setSelectedPacks(new Set(updateState.updatedPacks));
      }
    } else if (!updateState?.success && updateState?.message) {
      toast({
        title: "Update Failed",
        description: updateState.message,
        variant: "destructive",
      });
    } else if (updateState?.errors?.general) {
      toast({
        title: "Error",
        description: updateState.errors.general.join(", "),
        variant: "destructive",
      });
    } else if (updateState?.errors?.ownedPacks) {
      toast({
        title: "Validation Error",
        description: updateState.errors.ownedPacks.join(", "),
        variant: "destructive",
      });
    }
  }, [updateState, toast]);

  const handlePackChange = useCallback(
    (packName: string, checked: boolean) => {
      setSelectedPacks((prev) => {
        const newSelectedPacks = new Set(prev);
        checked
          ? newSelectedPacks.add(packName)
          : newSelectedPacks.delete(packName);
        return newSelectedPacks;
      });
    },
    []
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to save pack data.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("userId", user.uid);
    formData.append(
      "ownedPacksJson",
      JSON.stringify(Array.from(selectedPacks))
    );

    startTransition(() => {
      formAction(formData);
    });
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Dices className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          Loading account information...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl font-semibold text-destructive">
          Authentication Required
        </p>
        <p className="text-muted-foreground">
          Please log in to manage your account settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline text-accent">
          Account Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account-wide settings, such as owned Adventure Packs.
        </p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-xl">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold leading-none tracking-tight font-headline">
              Adventure Packs Owned
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Select the adventure packs you own. This is an account-wide setting.
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 pt-0 space-y-4">
            {isLoadingPacks && (
              <div className="flex items-center justify-center py-10">
                <Dices className="h-8 w-8 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Loading your packs...</p>
              </div>
            )}
            {initialLoadError && !isLoadingPacks && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="font-medium">{initialLoadError}</p>
              </div>
            )}
            {!isLoadingPacks && !initialLoadError && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 max-h-[500px] overflow-y-auto p-2 rounded-md border">
                {ALL_ADVENTURE_PACKS.map((packName) => {
                  const checkboxId = `pack-${packName.replace(/\s+/g, "-")}`;
                  return (
                    <div
                      key={packName}
                      className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted/50 transition-colors min-w-0"
                    >
                      <input
                        type="checkbox"
                        id={checkboxId}
                        checked={selectedPacks.has(packName)}
                        onChange={(e) =>
                          handlePackChange(packName, e.target.checked)
                        }
                        disabled={isUpdatePending}
                        className="form-checkbox h-4 w-4 text-primary focus:ring-accent border-input rounded"
                        aria-label={packName}
                      />
                      <label
                        htmlFor={checkboxId}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none truncate"
                      >
                        {packName}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="submit"
              className="mt-4 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-4 py-2"
              disabled={isUpdatePending || isLoadingPacks}
            >
              <Save className="mr-2 h-4 w-4" />
              {isUpdatePending ? "Saving..." : "Save Owned Packs"}
            </button>
            {updateState?.errors?.general && (
              <p className="text-xs text-destructive mt-1">
                {updateState.errors.general[0]}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
