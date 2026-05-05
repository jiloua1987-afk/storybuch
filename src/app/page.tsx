"use client";
import { useState } from "react";
import { useBookStore } from "@/store/bookStore";
import Navbar from "@/components/Navbar";
import StepIndicator from "@/components/ui/StepIndicator";
import LandingHero from "@/components/LandingHero";
import Step1Basics from "@/components/steps/Step1Basics";
import Step2Content from "@/components/steps/Step2Content";
import Step3Style from "@/components/steps/Step3Style";
import Step4Generate from "@/components/steps/Step4Generate";
import Step5Preview from "@/components/steps/Step5Preview";
import Step6Checkout from "@/components/steps/Step6Checkout";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [Step1Basics, Step2Content, Step3Style, Step4Generate, Step5Preview, Step6Checkout];

export default function Home() {
  const { currentStep, setStep } = useBookStore();
  const [appStarted, setAppStarted] = useState(false);

  const handleStart = () => {
    setAppStarted(true);
    setStep(0);
  };

  if (!appStarted) {
    return (
      <>
        <Navbar />
        <LandingHero onStart={handleStart} />
      </>
    );
  }

  const StepComponent = STEPS[currentStep] ?? Step1Basics;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          <StepIndicator currentStep={currentStep} />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
