export type OnboardingFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialOnboardingFormState: OnboardingFormState = {
  status: "idle",
  message: "",
};


