/**
 * useStepNavigation Composable
 * Step navigation logic for multi-step forms
 */

import { ref, computed, watch } from 'vue'

export interface Step {
  title: string
  description: string
}

export function useStepNavigation(
  steps: Step[],
  initialStep: number = 1,
  validationFn?: (step: number) => boolean
) {
  const currentStep = ref(initialStep)
  const completedSteps = ref<Set<number>>(new Set())
  const canNavigateForward = ref(false)

  const totalSteps = computed(() => steps.length)

  const isFirstStep = computed(() => currentStep.value === 1)
  const isLastStep = computed(() => currentStep.value === totalSteps.value)

  const progress = computed(() => {
    return ((completedSteps.value.size + (isLastStep.value ? 1 : 0)) / totalSteps.value) * 100
  })

  const stepStatus = computed(() => {
    return steps.map((_, index) => {
      const stepNum = index + 1
      if (completedSteps.value.has(stepNum)) {
        return 'completed' as const
      }
      if (currentStep.value === stepNum) {
        return 'active' as const
      }
      return 'pending' as const
    })
  })

  const goToStep = (step: number) => {
    if (step < 1 || step > totalSteps.value) return

    // Can't skip ahead without validating intermediate steps
    if (step > currentStep.value && !completedSteps.value.has(currentStep.value)) {
      return
    }

    currentStep.value = step
  }

  const nextStep = () => {
    // Validate current step before moving forward
    if (validationFn && !validationFn(currentStep.value)) {
      return
    }

    // Mark current step as completed
    completedSteps.value.add(currentStep.value)

    if (currentStep.value < totalSteps.value) {
      currentStep.value++
    }
  }

  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  const reset = () => {
    currentStep.value = 1
    completedSteps.value.clear()
  }

  const isStepCompleted = (step: number) => completedSteps.value.has(step)

  const canProceed = computed(() => {
    return validationFn ? validationFn(currentStep.value) : canNavigateForward.value
  })

  // Watch for validation function changes
  watch(() => validationFn, (fn) => {
    if (fn) {
      canNavigateForward.value = fn(currentStep.value)
    }
  })

  return {
    currentStep,
    totalSteps,
    completedSteps,
    isFirstStep,
    isLastStep,
    progress,
    stepStatus,
    canProceed,
    goToStep,
    nextStep,
    prevStep,
    reset,
    isStepCompleted
  }
}
